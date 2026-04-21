import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const types = await prisma.documentType.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { documents: true } } },
  })
  return NextResponse.json({ types })
}

export async function POST(req: Request) {
  const body = await req.json() as {
    name: string
    prefix: string
    format?: string
    propertyPackage?: unknown[]
    approvalFlowId?: string | null
    requireReadReceipt?: boolean
    requireChangeDesc?: boolean
  }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!body.prefix) return NextResponse.json({ error: 'prefix is required' }, { status: 400 })

  const type = await prisma.documentType.create({
    data: {
      name: body.name,
      prefix: body.prefix.toUpperCase(),
      format: body.format ?? 'richtext',
      propertyPackage: (body.propertyPackage ?? []) as never,
      approvalFlowId: body.approvalFlowId ?? null,
      requireReadReceipt: body.requireReadReceipt ?? false,
      requireChangeDesc: body.requireChangeDesc ?? true,
    },
  })
  return NextResponse.json({ type }, { status: 201 })
}
