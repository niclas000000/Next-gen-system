import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  const { valueId } = await params
  const body = await req.json() as {
    label?: string
    value?: string
    color?: string
    order?: number
    active?: boolean
    parentId?: string | null
  }
  const value = await prisma.lookupValue.update({ where: { id: valueId }, data: body })
  return NextResponse.json({ value })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  const { valueId } = await params
  await prisma.lookupValue.delete({ where: { id: valueId } })
  return NextResponse.json({ ok: true })
}
