import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const q = searchParams.get('q')

  const view = searchParams.get('view')
  const typeId = searchParams.get('typeId')
  const userId = view === 'mine' ? searchParams.get('userId') : null

  const docs = await prisma.document.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(typeId ? { documentTypeId: typeId } : {}),
      ...(userId ? { createdBy: userId } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true, prefix: true } },
    },
  })

  return NextResponse.json({ documents: docs })
}

export async function POST(req: Request) {
  const body = await req.json() as {
    title: string
    description?: string
    category?: string
    tags?: string[]
    content?: string
    status?: string
    documentTypeId?: string
    properties?: Record<string, unknown>
    roles?: Record<string, unknown>
    requireReadReceipt?: boolean
    changeDescription?: string
    validFrom?: string
    validTo?: string
  }
  if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  const doc = await prisma.document.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? null,
      tags: body.tags ?? [],
      content: body.content ?? null,
      status: body.status ?? 'draft',
      createdBy: userId,
      documentTypeId: body.documentTypeId ?? null,
      properties: (body.properties ?? {}) as never,
      roles: (body.roles ?? {}) as never,
      requireReadReceipt: body.requireReadReceipt ?? false,
      changeDescription: body.changeDescription ?? null,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validTo: body.validTo ? new Date(body.validTo) : null,
    },
    include: {
      author: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true, prefix: true } },
    },
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}
