import { prisma } from '@/lib/db/client'
import type { WorkflowNode, WorkflowEdge, NodeType } from '@/types/workflow'
import { ExpressionParser } from '@/lib/expression-parser/parser'

const exprParser = new ExpressionParser()

const SYSTEM_USER_ID = 'system-placeholder-user'

// Node types that auto-advance (no user interaction required)
const AUTO_NODE_TYPES: NodeType[] = ['start', 'automation', 'notification', 'delay', 'parallel-split', 'parallel-join']

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId)
}

function findNode(nodeId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find((n) => n.id === nodeId)
}

/**
 * Recursively advance through auto-nodes until we reach an interactive node (task, decision, end).
 * Returns the node where we stopped, or null if we reached a dead end.
 */
function resolveNextInteractiveNode(
  fromNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  visited = new Set<string>()
): WorkflowNode | null {
  if (visited.has(fromNodeId)) return null
  visited.add(fromNodeId)

  const node = findNode(fromNodeId, nodes)
  if (!node) return null

  // Stop at interactive nodes
  if (node.type === 'task' || node.type === 'decision' || node.type === 'end') {
    return node
  }

  // Auto-node: follow first outgoing edge
  const outgoing = getOutgoingEdges(fromNodeId, edges)
  if (outgoing.length === 0) return null

  return resolveNextInteractiveNode(outgoing[0].target, nodes, edges, visited)
}

export class WorkflowEngine {
  /**
   * Start a new workflow instance. Advances past the start node to the first interactive step.
   */
  async startInstance(workflowId: string, title: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
    if (!workflow) throw new Error('Workflow not found')
    if (workflow.status !== 'published') throw new Error('Workflow is not published')

    const nodes = workflow.nodes as unknown as WorkflowNode[]
    const edges = workflow.edges as unknown as WorkflowEdge[]

    const startNode = nodes.find((n) => n.type === 'start')
    if (!startNode) throw new Error('Workflow has no start node')

    // Create the instance
    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId,
        title,
        status: 'running',
        variables: {},
        createdBy: userId,
      },
    })

    // Advance from start node to first interactive node
    const outgoing = getOutgoingEdges(startNode.id, edges)
    if (outgoing.length === 0) {
      // No steps — mark complete immediately
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completedAt: new Date() },
      })
      return instance
    }

    const firstInteractive = resolveNextInteractiveNode(outgoing[0].target, nodes, edges)

    if (!firstInteractive) {
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completedAt: new Date() },
      })
      return instance
    }

    if (firstInteractive.type === 'end') {
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completedAt: new Date(), currentStep: firstInteractive.id },
      })
      return instance
    }

    // Create first step
    await this._createStep(instance.id, firstInteractive, userId)
    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { currentStep: firstInteractive.id },
    })

    return instance
  }

  /**
   * Complete a step. For task nodes: provide formData. For decision nodes: provide decision (edge label/id).
   */
  async completeStep(
    instanceId: string,
    stepId: string,
    payload: { formData?: Record<string, unknown>; decision?: string },
    userId: string
  ) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { steps: true },
    })
    if (!instance) throw new Error('Instance not found')
    if (instance.status !== 'running') throw new Error('Instance is not running')

    const step = instance.steps.find((s) => s.id === stepId)
    if (!step) throw new Error('Step not found')
    if (step.status !== 'in_progress') throw new Error('Step is not in progress')

    const workflow = await prisma.workflow.findUnique({ where: { id: instance.workflowId } })
    if (!workflow) throw new Error('Workflow not found')

    const nodes = workflow.nodes as unknown as WorkflowNode[]
    const edges = workflow.edges as unknown as WorkflowEdge[]

    // Mark step complete
    await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        formData: payload.formData ?? undefined,
        decision: payload.decision ?? undefined,
      },
    })

    // Merge form data into instance variables
    if (payload.formData) {
      const currentVars = instance.variables as Record<string, unknown>
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { variables: { ...currentVars, ...payload.formData } },
      })
    }

    // Find the next node
    const currentNode = findNode(step.nodeId, nodes)
    if (!currentNode) throw new Error('Current node not found in workflow definition')

    let nextNodeId: string | null = null

    if (currentNode.type === 'decision') {
      const outgoing = getOutgoingEdges(currentNode.id, edges)
      const currentVars = (await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        select: { variables: true },
      }))?.variables as Record<string, unknown> ?? {}
      const evalContext = { variables: currentVars }

      if (payload.decision) {
        // Explicit user decision: match by edge id, label, or sourceHandle
        const matched = outgoing.find(
          (e) => e.id === payload.decision || e.label === payload.decision || e.sourceHandle === payload.decision
        )
        nextNodeId = matched?.target ?? outgoing[0]?.target ?? null
      } else {
        // Auto-evaluate conditions: first branch whose condition evaluates to true wins
        // Last branch is treated as default (no condition check)
        let matched: WorkflowEdge | null = null
        for (let i = 0; i < outgoing.length - 1; i++) {
          const edge = outgoing[i]
          const condition = edge.condition
          if (condition) {
            try {
              if (exprParser.evaluateBoolean(condition, evalContext)) {
                matched = edge
                break
              }
            } catch {
              // condition evaluation error — skip branch
            }
          }
        }
        // Fall back to last edge (default) if no condition matched
        nextNodeId = matched?.target ?? outgoing[outgoing.length - 1]?.target ?? null
      }
    } else {
      // Task or other — follow first outgoing edge
      const outgoing = getOutgoingEdges(currentNode.id, edges)
      nextNodeId = outgoing[0]?.target ?? null
    }

    if (!nextNodeId) {
      // Dead end — complete instance
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'completed', completedAt: new Date() },
      })
      return
    }

    // Resolve to next interactive node
    const nextInteractive = resolveNextInteractiveNode(nextNodeId, nodes, edges)

    if (!nextInteractive || nextInteractive.type === 'end') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'completed', completedAt: new Date(), currentStep: nextInteractive?.id ?? null },
      })
      return
    }

    // Create next step
    await this._createStep(instanceId, nextInteractive, userId)
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { currentStep: nextInteractive.id },
    })
  }

  async cancelInstance(instanceId: string) {
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled', completedAt: new Date() },
    })
    // Mark any in_progress steps as skipped
    await prisma.workflowStep.updateMany({
      where: { instanceId, status: 'in_progress' },
      data: { status: 'skipped', completedAt: new Date() },
    })
  }

  private async _createStep(instanceId: string, node: WorkflowNode, _userId: string) {
    await prisma.workflowStep.create({
      data: {
        instanceId,
        nodeId: node.id,
        stepName: (node.data as { name?: string }).name ?? node.type,
        stepType: node.type,
        status: 'in_progress',
        startedAt: new Date(),
      },
    })
  }
}
