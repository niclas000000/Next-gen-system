import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ versions })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  const body = await req.json() as { version: string; content?: string; properties?: Record<string, unknown>; changeDesc: string }
  if (!body.changeDesc) return NextResponse.json({ error: 'changeDesc is required' }, { status: 400 })
  if (!body.version) return NextResponse.json({ error: 'version is required' }, { status: 400 })

  const docVersion = await prisma.documentVersion.create({
    data: {
      documentId: id,
      version: body.version,
      content: body.content ?? null,
      properties: (body.properties ?? {}) as never,
      changeDesc: body.changeDesc,
      createdBy: userId,
    },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ version: docVersion }, { status: 201 })
}
