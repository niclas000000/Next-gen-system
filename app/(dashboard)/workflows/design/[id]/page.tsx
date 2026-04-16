import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { DesignerShell } from './DesignerShell'
import type { WorkflowNode, WorkflowEdge, WorkflowSettings } from '@/types/workflow'

export default async function WorkflowDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = await prisma.workflow.findUnique({ where: { id } })
  if (!workflow) notFound()

  const definition = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? '',
    status: workflow.status as 'draft' | 'published' | 'archived',
    nodes: (workflow.nodes as unknown as WorkflowNode[]) ?? [],
    edges: (workflow.edges as unknown as WorkflowEdge[]) ?? [],
    settings: (workflow.settings as unknown as WorkflowSettings),
  }

  return <DesignerShell definition={definition} />
}
