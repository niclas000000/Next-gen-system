import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const flow = await prisma.approvalFlow.findUnique({
    where: { id },
    include: { documentTypes: { select: { id: true, name: true } } },
  })
  if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ flow })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { name?: string; phases?: unknown[] }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.phases !== undefined) data.phases = body.phases as never

  const flow = await prisma.approvalFlow.update({ where: { id }, data })
  return NextResponse.json({ flow })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.approvalFlow.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
