import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const tables = await prisma.lookupTable.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { values: true } } },
  })
  return NextResponse.json({ tables })
}

export async function POST(req: Request) {
  const { name, description, scope } = await req.json() as {
    name: string
    description?: string
    scope?: string
  }
  const table = await prisma.lookupTable.create({
    data: { name, description, scope: scope ?? 'all' },
  })
  return NextResponse.json({ table }, { status: 201 })
}
