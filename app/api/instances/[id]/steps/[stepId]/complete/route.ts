import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { WorkflowEngine } from '@/lib/workflow-engine/engine'
import { requireUser } from '@/lib/auth/session'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params
  const body = await req.json() as { formData?: Record<string, unknown>; decision?: string }

  const user = await requireUser()
  if (user instanceof NextResponse) return user

  const step = await prisma.workflowStep.findUnique({ where: { id: stepId }, select: { assignedTo: true } })
  if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 })
  if (step.assignedTo && step.assignedTo !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'This step is assigned to someone else' }, { status: 403 })
  }

  const engine = new WorkflowEngine()
  await engine.completeStep(id, stepId, body, user.id)

  return NextResponse.json({ success: true })
}
