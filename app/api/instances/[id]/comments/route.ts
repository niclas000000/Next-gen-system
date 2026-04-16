import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await prisma.comment.findMany({
    where: { instanceId: id },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ comments })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { content: string; stepId?: string }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  const comment = await prisma.comment.create({
    data: {
      instanceId: id,
      stepId: body.stepId ?? null,
      content: body.content.trim(),
      createdBy: userId,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ comment }, { status: 201 })
}
