import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      children: {
        select: { id: true, name: true, status: true },
        orderBy: { name: 'asc' },
      },
      documents: {
        include: {
          document: {
            select: { id: true, title: true, status: true, category: true, updatedAt: true },
          },
        },
      },
      workflows: {
        include: {
          workflow: {
            select: { id: true, name: true, status: true, updatedAt: true },
          },
        },
      },
    },
  })
  if (!process) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ process })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const allowed = ['name', 'description', 'purpose', 'scope', 'status', 'ownerId', 'parentId', 'category', 'tags', 'nodes', 'edges', 'kpis']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  const process = await prisma.process.update({
    where: { id },
    data,
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { documents: true, workflows: true, children: true } },
    },
  })
  return NextResponse.json({ process })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.process.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
