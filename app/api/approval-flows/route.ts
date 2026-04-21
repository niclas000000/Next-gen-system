import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const flows = await prisma.approvalFlow.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { documentTypes: true } } },
  })
  return NextResponse.json({ flows })
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; phases?: unknown[] }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const flow = await prisma.approvalFlow.create({
    data: {
      name: body.name,
      phases: (body.phases ?? []) as never,
    },
  })
  return NextResponse.json({ flow }, { status: 201 })
}
