import { prisma } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow'
import type { FormDefinition } from '@/types/field'
import { InstanceDetailClient } from './InstanceDetailClient'

export default async function WorkflowInstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [instance, comments, auditEntries] = await Promise.all([
    prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true, nodes: true, edges: true, forms: true } },
        steps: { orderBy: { startedAt: 'asc' } },
      },
    }),
    prisma.comment.findMany({
      where: { instanceId: id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.findMany({
      where: { instanceId: id },
      orderBy: { timestamp: 'desc' },
      include: { actorUser: { select: { id: true, name: true } } },
    }),
  ])

  if (!instance) notFound()

  const nodes = instance.workflow.nodes as unknown as WorkflowNode[]
  const edges = instance.workflow.edges as unknown as WorkflowEdge[]

  // Find the current in-progress step
  const activeStep = instance.steps.find((s) => s.status === 'in_progress') ?? null

  // Find the node definition for the active step
  const activeNode = activeStep ? nodes.find((n) => n.id === activeStep.nodeId) ?? null : null

  // Find the form for the active task node (if any)
  let activeForm: FormDefinition | null = null
  if (activeStep && activeNode?.type === 'task') {
    const formRecord = instance.workflow.forms.find((f) => f.nodeId === activeStep.nodeId)
    if (formRecord) {
      activeForm = {
        id: formRecord.id,
        workflowId: formRecord.workflowId,
        nodeId: formRecord.nodeId,
        name: formRecord.name,
        fields: formRecord.fields as FormDefinition['fields'],
        settings: formRecord.settings as FormDefinition['settings'],
      }
    }
  }

  // Build decision options if active step is a decision node
  let decisionOptions: Array<{ id: string; label: string }> = []
  if (activeStep && activeNode?.type === 'decision') {
    const outgoing = edges.filter((e) => e.source === activeNode.id)
    decisionOptions = outgoing.map((e) => ({
      id: e.id,
      label: e.label ?? e.sourceHandle ?? e.id,
    }))
  }

  return (
    <InstanceDetailClient
      instance={{
        id: instance.id,
        title: instance.title,
        status: instance.status,
        workflowName: instance.workflow.name,
        variables: instance.variables as Record<string, unknown>,
        createdAt: instance.createdAt.toISOString(),
        completedAt: instance.completedAt?.toISOString() ?? null,
      }}
      steps={instance.steps.map((s) => ({
        id: s.id,
        nodeId: s.nodeId,
        stepName: s.stepName,
        stepType: s.stepType,
        status: s.status,
        startedAt: s.startedAt?.toISOString() ?? null,
        completedAt: s.completedAt?.toISOString() ?? null,
        formData: s.formData as Record<string, unknown> | null,
        decision: s.decision,
      }))}
      activeStep={activeStep ? { id: activeStep.id, stepName: activeStep.stepName, stepType: activeStep.stepType } : null}
      activeForm={activeForm}
      decisionOptions={decisionOptions}
      comments={comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
      }))}
      auditEntries={auditEntries.map((e) => ({
        id: e.id,
        action: e.action,
        actor: e.actor,
        actorName: e.actorUser.name,
        timestamp: e.timestamp.toISOString(),
        details: e.details as Record<string, unknown>,
      }))}
    />
  )
}
