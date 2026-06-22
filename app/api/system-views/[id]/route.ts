import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as {
    name?: string
    icon?: string
    filters?: Record<string, string>
    order?: number
  }
  const view = await prisma.systemView.update({
    where: { id },
    data: {
      ...(body.name !== undefined    && { name: body.name }),
      ...(body.icon !== undefined    && { icon: body.icon }),
      ...(body.filters !== undefined && { filters: body.filters }),
      ...(body.order !== undefined   && { order: body.order }),
    },
  })
  return NextResponse.json({ view })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const view = await prisma.systemView.findUnique({ where: { id } })
  if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (view.isDefault) return NextResponse.json({ error: 'Cannot delete a default view' }, { status: 400 })
  await prisma.systemView.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
