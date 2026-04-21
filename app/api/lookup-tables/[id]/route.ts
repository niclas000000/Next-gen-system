import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const table = await prisma.lookupTable.findUnique({
    where: { id },
    include: { values: { orderBy: { order: 'asc' } } },
  })
  if (!table) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ table })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { name?: string; description?: string; scope?: string }
  const table = await prisma.lookupTable.update({ where: { id }, data: body })
  return NextResponse.json({ table })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.lookupTable.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
