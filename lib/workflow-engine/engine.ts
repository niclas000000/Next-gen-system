import { prisma } from '@/lib/db/client'
import type { WorkflowNode, WorkflowEdge, NodeType } from '@/types/workflow'
import type { Assignment, SLAConfig } from '@/types/workflow'
import { ExpressionParser } from '@/lib/expression-parser/parser'

const exprParser = new ExpressionParser()

const SYSTEM_USER_ID = 'system-placeholder-user'

const AUTO_NODE_TYPES: NodeType[] = ['start', 'automation', 'notification', 'delay', 'parallel-split', 'parallel-join']

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId)
}

function findNode(nodeId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find((n) => n.id === nodeId)
}

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

  if (node.type === 'task' || node.type === 'decision' || node.type === 'end') return node

  const outgoing = getOutgoingEdges(fromNodeId, edges)
  if (outgoing.length === 0) return null

  return resolveNextInteractiveNode(outgoing[0].target, nodes, edges, visited)
}

async function audit(
  instanceId: string,
  actor: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  await prisma.auditLog.create({
    data: { instanceId, actor, action, details },
  })
}

export class WorkflowEngine {
  async startInstance(workflowId: string, title: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
    if (!workflow) throw new Error('Workflow not found')
    if (workflow.status !== 'published') throw new Error('Workflow is not published')

    const nodes = workflow.nodes as unknown as WorkflowNode[]
    const edges = workflow.edges as unknown as WorkflowEdge[]

    const startNode = nodes.find((n) => n.type === 'start')
    if (!startNode) throw new Error('Workflow has no start node')

    const instance = await prisma.workflowInstance.create({
      data: { workflowId, title, status: 'running', variables: {}, createdBy: userId },
    })

    await audit(instance.id, userId, 'instance_started', { workflowName: workflow.name, title })

    const outgoing = getOutgoingEdges(startNode.id, edges)
    if (outgoing.length === 0) {
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completedAt: new Date() },
      })
      await audit(instance.id, SYSTEM_USER_ID, 'instance_completed', { reason: 'no_steps' })
      return instance
    }

    const firstInteractive = resolveNextInteractiveNode(outgoing[0].target, nodes, edges)

    if (!firstInteractive || firstInteractive.type === 'end') {
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completedAt: new Date(), currentStep: firstInteractive?.id ?? null },
      })
      await audit(instance.id, SYSTEM_USER_ID, 'instance_completed', { reason: 'reached_end' })
      return instance
    }

    await this._createStep(instance.id, firstInteractive, userId)
    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { currentStep: firstInteractive.id },
    })
    await audit(instance.id, SYSTEM_USER_ID, 'step_started', {
      stepName: (firstInteractive.data as { name?: string }).name ?? firstInteractive.type,
      stepType: firstInteractive.type,
    })

    return instance
  }

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

    await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        formData: payload.formData ?? undefined,
        decision: payload.decision ?? undefined,
        assignedTo: userId,
      },
    })

    await audit(instanceId, userId, 'step_completed', {
      stepName: step.stepName,
      stepType: step.stepType,
      ...(payload.decision ? { decision: payload.decision } : {}),
      ...(payload.formData ? { fields: Object.keys(payload.formData) } : {}),
    })

    if (payload.formData) {
      const currentVars = instance.variables as Record<string, unknown>
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { variables: { ...currentVars, ...payload.formData } },
      })
    }

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
        const matched = outgoing.find(
          (e) => e.id === payload.decision || e.label === payload.decision || e.sourceHandle === payload.decision
        )
        nextNodeId = matched?.target ?? outgoing[0]?.target ?? null
        await audit(instanceId, userId, 'decision_made', {
          stepName: step.stepName,
          decision: payload.decision,
          branch: matched?.label ?? payload.decision,
        })
      } else {
        let matched: WorkflowEdge | null = null
        for (let i = 0; i < outgoing.length - 1; i++) {
          const edge = outgoing[i]
          const condition = (edge.data?.condition as string) ?? edge.condition
          if (condition) {
            try {
              if (exprParser.evaluateBoolean(condition, evalContext)) {
                matched = edge
                break
              }
            } catch {
              // skip on error
            }
          }
        }
        nextNodeId = matched?.target ?? outgoing[outgoing.length - 1]?.target ?? null
        await audit(instanceId, SYSTEM_USER_ID, 'decision_auto_evaluated', {
          stepName: step.stepName,
          matchedBranch: matched?.label ?? 'default',
        })
      }
    } else {
      const outgoing = getOutgoingEdges(currentNode.id, edges)
      nextNodeId = outgoing[0]?.target ?? null
    }

    if (!nextNodeId) {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'completed', completedAt: new Date() },
      })
      await audit(instanceId, SYSTEM_USER_ID, 'instance_completed', { reason: 'no_next_node' })
      return
    }

    const nextInteractive = resolveNextInteractiveNode(nextNodeId, nodes, edges)

    if (!nextInteractive || nextInteractive.type === 'end') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'completed', completedAt: new Date(), currentStep: nextInteractive?.id ?? null },
      })
      await audit(instanceId, SYSTEM_USER_ID, 'instance_completed', { reason: 'reached_end' })
      return
    }

    await this._createStep(instanceId, nextInteractive, instance.createdBy)
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { currentStep: nextInteractive.id },
    })
    await audit(instanceId, SYSTEM_USER_ID, 'step_started', {
      stepName: (nextInteractive.data as { name?: string }).name ?? nextInteractive.type,
      stepType: nextInteractive.type,
    })
  }

  async cancelInstance(instanceId: string, userId = SYSTEM_USER_ID) {
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled', completedAt: new Date() },
    })
    await prisma.workflowStep.updateMany({
      where: { instanceId, status: 'in_progress' },
      data: { status: 'skipped', completedAt: new Date() },
    })
    await audit(instanceId, userId, 'instance_cancelled', {})
  }

  private async _resolveAssignee(
    assignment: Assignment | undefined,
    instanceId: string,
    initiatorId: string
  ): Promise<{ assignedTo?: string; assignedRole?: string }> {
    if (!assignment) return {}

    switch (assignment.type) {
      case 'user':
        return { assignedTo: assignment.value || undefined }

      case 'initiator':
        return { assignedTo: initiatorId }

      case 'role':
        return { assignedRole: assignment.value || undefined }

      case 'previous_step_user': {
        const lastStep = await prisma.workflowStep.findFirst({
          where: { instanceId, status: 'completed', assignedTo: { not: null } },
          orderBy: { completedAt: 'desc' },
        })
        return { assignedTo: lastStep?.assignedTo ?? initiatorId }
      }

      case 'expression':
        // Expression-based assignment is evaluated at runtime; fall back to initiator
        return { assignedTo: initiatorId }

      default:
        return {}
    }
  }

  private _computeDueAt(sla: SLAConfig | undefined): Date | undefined {
    if (!sla?.duration) return undefined
    const ms = sla.unit === 'days' ? sla.duration * 86_400_000 : sla.duration * 3_600_000
    return new Date(Date.now() + ms)
  }

  private async _createStep(instanceId: string, node: WorkflowNode, initiatorId: string) {
    const nodeData = node.data as { name?: string; assignment?: Assignment; sla?: SLAConfig }
    const assignee = await this._resolveAssignee(nodeData.assignment, instanceId, initiatorId)
    const dueAt = this._computeDueAt(nodeData.sla)

    const step = await prisma.workflowStep.create({
      data: {
        instanceId,
        nodeId: node.id,
        stepName: nodeData.name ?? node.type,
        stepType: node.type,
        status: 'in_progress',
        startedAt: new Date(),
        dueAt: dueAt ?? null,
        ...assignee,
      },
      include: { instance: { select: { title: true } } },
    })

    // Fire in-app notification for directly-assigned user
    if (assignee.assignedTo && assignee.assignedTo !== SYSTEM_USER_ID) {
      await prisma.notification.create({
        data: {
          userId: assignee.assignedTo,
          type: 'step_assigned',
          title: `Task assigned: ${step.stepName}`,
          body: step.instance.title,
          link: `/workflows/instances/${instanceId}`,
        },
      })
    }
  }
}
