import { NextResponse } from 'next/server'
import { WorkflowEngine } from '@/lib/workflow-engine/engine'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const engine = new WorkflowEngine()
  await engine.cancelInstance(id)
  return NextResponse.json({ success: true })
}
