import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const scope = searchParams.get('scope')

  const items = await prisma.registryItem.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(scope ? { OR: [{ scope }, { scope: 'all' }] } : {}),
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const body = await req.json() as { type: string; name: string; color?: string; description?: string; scope?: string }
  if (!body.type || !body.name) {
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 })
  }
  try {
    const item = await prisma.registryItem.create({
      data: {
        type: body.type,
        name: body.name,
        color: body.color ?? null,
        description: body.description ?? null,
        scope: body.scope ?? 'all',
      },
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Name already exists for this type' }, { status: 409 })
  }
}
