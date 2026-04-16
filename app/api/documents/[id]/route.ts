import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true } } },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ document: doc })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  const allowed = ['title', 'description', 'category', 'tags', 'content', 'status']
  const data: Record<string, unknown> = { updatedBy: userId }
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const doc = await prisma.document.update({
    where: { id },
    data,
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ document: doc })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
