import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const allowed = ['name', 'color', 'description', 'scope']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  try {
    const item = await prisma.registryItem.update({ where: { id }, data })
    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: 'Name already exists for this type' }, { status: 409 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.registryItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
