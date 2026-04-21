import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const type = await prisma.documentType.findUnique({
    where: { id },
    include: { approvalFlow: true, _count: { select: { documents: true } } },
  })
  if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ type })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const allowed = ['name', 'prefix', 'format', 'propertyPackage', 'approvalFlowId', 'requireReadReceipt', 'requireChangeDesc']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (data.prefix) data.prefix = (data.prefix as string).toUpperCase()

  const type = await prisma.documentType.update({ where: { id }, data })
  return NextResponse.json({ type })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.documentType.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
