import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const folders = await prisma.viewFolder.findMany({
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ folders })
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; parentId?: string; filter?: Record<string, unknown>; order?: number }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const folder = await prisma.viewFolder.create({
    data: {
      name: body.name,
      parentId: body.parentId ?? null,
      filter: (body.filter ?? {}) as never,
      order: body.order ?? 0,
    },
  })
  return NextResponse.json({ folder }, { status: 201 })
}
