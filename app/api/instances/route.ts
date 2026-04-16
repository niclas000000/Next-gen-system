import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { WorkflowEngine } from '@/lib/workflow-engine/engine'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workflowId = searchParams.get('workflowId')
  const status = searchParams.get('status')

  const instances = await prisma.workflowInstance.findMany({
    where: {
      ...(workflowId ? { workflowId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      workflow: { select: { name: true } },
      steps: { orderBy: { startedAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ instances })
}

export async function POST(req: Request) {
  const body = await req.json() as { workflowId: string; title?: string }
  if (!body.workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 })

  const workflow = await prisma.workflow.findUnique({
    where: { id: body.workflowId },
    select: { name: true, status: true },
  })
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  if (workflow.status !== 'published') {
    return NextResponse.json({ error: 'Workflow must be published before starting a case' }, { status: 400 })
  }

  // Ensure system placeholder user exists
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: { id: SYSTEM_USER_ID, name: 'System', email: 'system@nexus.internal', password: '', role: 'admin' },
    update: {},
  })

  const engine = new WorkflowEngine()
  const title = body.title ?? `${workflow.name} — ${new Date().toLocaleDateString('en-GB')}`
  const instance = await engine.startInstance(body.workflowId, title, SYSTEM_USER_ID)

  return NextResponse.json({ instance }, { status: 201 })
}
