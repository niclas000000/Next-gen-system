import { prisma } from '@/lib/db/client'
import type { WorkflowNode, WorkflowEdge, NodeType, AutomationNodeData, AutomationConfig } from '@/types/workflow'
import type { Assignment, SLAConfig } from '@/types/workflow'
import { ExpressionParser } from '@/lib/expression-parser/parser'

const exprParser = new ExpressionParser()

const SYSTEM_USER_ID = 'system-placeholder-user'

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId)
}

function findNode(nodeId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find((n) => n.id === nodeId)
}

const INTERACTIVE_NODE_TYPES: NodeType[] = ['task', 'decision', 'end']

async function audit(
  instanceId: string,
  actor: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  await prisma.auditLog.create({
    data: { instanceId, actor, action, details: details as never },
  })
}

export class WorkflowEngine {
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

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
      await this._evaluateWorkflowRules('on_instance_complete', instance.id, workflowId, {})
      return instance
    }

    const vars: Record<string, unknown> = {}
    const firstInteractive = await this._advanceAndExecute(outgoing[0].target, nodes, edges, instance.id, workflowId, vars)

    if (!firstInteractive || firstInteractive.type === 'end') {
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { status: 'completed', completedAt: new Date(), currentStep: firstInteractive?.id ?? null },
      })
      await audit(instance.id, SYSTEM_USER_ID, 'instance_completed', { reason: 'reached_end' })
      await this._evaluateWorkflowRules('on_instance_complete', instance.id, workflowId, vars)
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

    await this._evaluateWorkflowRules('on_start', instance.id, workflowId, vars)

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
        formData: (payload.formData ?? undefined) as never,
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

    // Merge form data into instance variables
    let currentVars = instance.variables as Record<string, unknown>
    if (payload.formData) {
      currentVars = { ...currentVars, ...payload.formData }
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { variables: currentVars as never },
      })
    }

    // Extract user_role field submissions and write to instance.roles
    if (payload.formData) {
      const nodeForm = await prisma.workflowForm.findUnique({
        where: { workflowId_nodeId: { workflowId: instance.workflowId, nodeId: step.nodeId } },
      })
      const formFields = (nodeForm?.fields as { type: string; name: string; properties?: { roleName?: string } }[] | null) ?? []
      const roleFields = formFields.filter((f) => f.type === 'user_role')
      if (roleFields.length > 0) {
        const currentRoles = instance.roles as Record<string, string>
        const newRoles = { ...currentRoles }
        for (const f of roleFields) {
          const roleName = f.properties?.roleName
          const userId2 = payload.formData[f.name] as string | undefined
          if (roleName && userId2) newRoles[roleName] = userId2
        }
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { roles: newRoles },
        })
      }
    }

    // Fire step-complete rules
    await this._evaluateWorkflowRules('on_step_complete', instanceId, instance.workflowId, currentVars, step.nodeId)

    const currentNode = findNode(step.nodeId, nodes)
    if (!currentNode) throw new Error('Current node not found in workflow definition')

    let nextNodeId: string | null = null

    if (currentNode.type === 'decision') {
      const outgoing = getOutgoingEdges(currentNode.id, edges)
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
      await this._evaluateWorkflowRules('on_instance_complete', instanceId, instance.workflowId, currentVars)
      return
    }

    // Re-read variables (may have been updated by rules)
    const freshVars = ((await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      select: { variables: true },
    }))?.variables ?? {}) as Record<string, unknown>

    const nextInteractive = await this._advanceAndExecute(nextNodeId, nodes, edges, instanceId, instance.workflowId, freshVars)

    if (!nextInteractive || nextInteractive.type === 'end') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'completed', completedAt: new Date(), currentStep: nextInteractive?.id ?? null },
      })
      await audit(instanceId, SYSTEM_USER_ID, 'instance_completed', { reason: 'reached_end' })
      await this._evaluateWorkflowRules('on_instance_complete', instanceId, instance.workflowId, freshVars)
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

  // ---------------------------------------------------------------------------
  // Advance through the graph, executing automation nodes along the way
  // ---------------------------------------------------------------------------

  private async _advanceAndExecute(
    nodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    instanceId: string,
    workflowId: string,
    variables: Record<string, unknown>,
    visited = new Set<string>()
  ): Promise<WorkflowNode | null> {
    if (visited.has(nodeId)) return null
    visited.add(nodeId)

    const node = findNode(nodeId, nodes)
    if (!node) return null

    // Interactive nodes — stop here
    if (INTERACTIVE_NODE_TYPES.includes(node.type as NodeType)) return node

    // Automation nodes — execute then advance
    if (node.type === 'automation' || node.type === 'notification') {
      try {
        // Re-read variables in case previous automation updated them
        const fresh = ((await prisma.workflowInstance.findUnique({
          where: { id: instanceId },
          select: { variables: true },
        }))?.variables ?? variables) as Record<string, unknown>

        await this._executeAutomationNode(node, instanceId, fresh)
        await audit(instanceId, SYSTEM_USER_ID, 'automation_executed', {
          nodeName: (node.data as { name?: string }).name ?? node.type,
          nodeType: node.type,
        })
      } catch (err) {
        const config = (node.data as AutomationNodeData).config
        const errorHandling = (node.data as AutomationNodeData).errorHandling ?? 'skip'
        await audit(instanceId, SYSTEM_USER_ID, 'automation_error', {
          nodeName: (node.data as { name?: string }).name ?? node.type,
          error: String(err),
        })
        if (errorHandling === 'fail') throw err
        // 'skip' — continue traversal
      }
    }
    // delay / parallel-split / parallel-join — skip without execution for now

    const outgoing = getOutgoingEdges(nodeId, edges)
    if (outgoing.length === 0) return null

    // Re-read fresh variables for next recursive call
    const updatedVars = ((await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      select: { variables: true },
    }))?.variables ?? variables) as Record<string, unknown>

    return this._advanceAndExecute(outgoing[0].target, nodes, edges, instanceId, workflowId, updatedVars, visited)
  }

  // ---------------------------------------------------------------------------
  // Execute a single automation node
  // ---------------------------------------------------------------------------

  private async _executeAutomationNode(
    node: WorkflowNode,
    instanceId: string,
    variables: Record<string, unknown>
  ): Promise<void> {
    const nodeData = node.data as AutomationNodeData
    const config = nodeData.config as AutomationConfig

    if (!config?.type) return

    switch (config.type) {
      case 'set_variable': {
        if (!config.variableName || !config.expression) return
        const result = exprParser.evaluate(config.expression, { variables })
        const currentVars = ((await prisma.workflowInstance.findUnique({
          where: { id: instanceId },
          select: { variables: true },
        }))?.variables ?? {}) as Record<string, unknown>
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { variables: { ...currentVars, [config.variableName]: result } as never },
        })
        break
      }

      case 'send_notification': {
        const instance = await prisma.workflowInstance.findUnique({
          where: { id: instanceId },
          select: { createdBy: true, title: true },
        })
        if (!instance) return

        const recipientIds: string[] = []

        if (config.recipientType === 'initiator') {
          recipientIds.push(instance.createdBy)
        } else if (config.recipientType === 'user' && config.recipientValue) {
          recipientIds.push(config.recipientValue)
        } else if (config.recipientType === 'role' && config.recipientValue) {
          const users = await prisma.user.findMany({
            where: { role: config.recipientValue, active: true },
            select: { id: true },
          })
          recipientIds.push(...users.map((u) => u.id))
        }

        for (const userId of recipientIds) {
          if (userId && userId !== SYSTEM_USER_ID) {
            await prisma.notification.create({
              data: {
                userId,
                type: 'automation',
                title: config.title || 'Workflow notification',
                body: config.body || instance.title,
                link: `/workflows/instances/${instanceId}`,
              },
            })
          }
        }
        break
      }

      case 'send_email': {
        // Stub — real SMTP in a subsequent plan
        console.log(`[workflow] send_email to=${config.to} subject="${config.subject}"`)
        break
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluate WorkflowRule records for a lifecycle event
  // ---------------------------------------------------------------------------

  private async _evaluateWorkflowRules(
    trigger: 'on_start' | 'on_step_complete' | 'on_instance_complete',
    instanceId: string,
    workflowId: string,
    variables: Record<string, unknown>,
    nodeId?: string
  ): Promise<void> {
    const rules = await prisma.workflowRule.findMany({
      where: {
        workflowId,
        trigger,
        active: true,
        ...(nodeId ? { OR: [{ nodeId }, { nodeId: null }] } : { nodeId: null }),
      },
      orderBy: { priority: 'desc' },
    })

    for (const rule of rules) {
      try {
        // Blank expression = always fires
        if (rule.expression) {
          const fires = exprParser.evaluateBoolean(rule.expression, { variables })
          if (!fires) continue
        }

        const actions = rule.actions as AutomationConfig[]
        for (const action of actions) {
          const fakeNode: WorkflowNode = {
            id: `rule-${rule.id}`,
            type: 'automation',
            position: { x: 0, y: 0 },
            data: { name: rule.type, config: action, errorHandling: 'skip' },
          }
          await this._executeAutomationNode(fakeNode, instanceId, variables)
        }

        await audit(instanceId, SYSTEM_USER_ID, 'rule_fired', {
          ruleId: rule.id,
          trigger,
          expression: rule.expression,
        })
      } catch {
        // Rules never block workflow progression
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Step creation helpers
  // ---------------------------------------------------------------------------

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

      case 'workflow_role': {
        const instance = await prisma.workflowInstance.findUnique({
          where: { id: instanceId },
          select: { roles: true, createdBy: true },
        })
        const roles = instance?.roles as Record<string, string> | null
        const userId = roles?.[assignment.value]
        if (!userId) {
          console.warn(`workflow_role "${assignment.value}" not yet assigned — falling back to initiator`)
          return { assignedTo: initiatorId }
        }
        return { assignedTo: userId }
      }

      case 'expression':
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
