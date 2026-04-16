import { NextResponse } from 'next/server'
import { WorkflowEngine } from '@/lib/workflow-engine/engine'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  const engine = new WorkflowEngine()
  await engine.cancelInstance(id, userId)
  return NextResponse.json({ success: true })
}
