import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await prisma.workflowRule.findMany({
    where: { workflowId: id },
    orderBy: { priority: 'desc' },
  })
  return NextResponse.json({ rules })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    nodeId?: string; type?: string; trigger: string
    expression?: string; actions?: unknown[]; priority?: number; active?: boolean
  }

  const rule = await prisma.workflowRule.create({
    data: {
      workflowId: id,
      nodeId: body.nodeId ?? null,
      type: body.type ?? 'automation',
      trigger: body.trigger,
      expression: body.expression ?? '',
      actions: (body.actions ?? []) as never,
      priority: body.priority ?? 0,
      active: body.active ?? true,
    },
  })
  return NextResponse.json({ rule }, { status: 201 })
}
