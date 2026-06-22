import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { ruleId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    nodeId?: string | null; trigger?: string; expression?: string
    actions?: unknown[]; priority?: number; active?: boolean
  }

  const rule = await prisma.workflowRule.update({
    where: { id: ruleId },
    data: {
      ...(body.nodeId !== undefined ? { nodeId: body.nodeId } : {}),
      ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
      ...(body.expression !== undefined ? { expression: body.expression } : {}),
      ...(body.actions !== undefined ? { actions: body.actions as never } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  })
  return NextResponse.json({ rule })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const { ruleId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.workflowRule.delete({ where: { id: ruleId } })
  return NextResponse.json({ ok: true })
}
