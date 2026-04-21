import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const values = await prisma.lookupValue.findMany({
    where: { tableId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json({ values })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as {
    label: string
    value: string
    color?: string
    order?: number
    parentId?: string
  }
  const value = await prisma.lookupValue.create({
    data: { tableId: id, ...body },
  })
  return NextResponse.json({ value }, { status: 201 })
}
