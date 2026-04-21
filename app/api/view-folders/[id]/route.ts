import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const allowed = ['name', 'parentId', 'filter', 'order']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const folder = await prisma.viewFolder.update({ where: { id }, data })
  return NextResponse.json({ folder })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.viewFolder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
