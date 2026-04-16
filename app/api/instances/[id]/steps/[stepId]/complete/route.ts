import { NextResponse } from 'next/server'
import { WorkflowEngine } from '@/lib/workflow-engine/engine'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params
  const body = await req.json() as { formData?: Record<string, unknown>; decision?: string }
  const engine = new WorkflowEngine()

  await engine.completeStep(id, stepId, body, SYSTEM_USER_ID)

  return NextResponse.json({ success: true })
}
