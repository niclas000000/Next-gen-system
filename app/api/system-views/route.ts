import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')
  const views = await prisma.systemView.findMany({
    where: section ? { section } : undefined,
    orderBy: [{ section: 'asc' }, { order: 'asc' }],
  })
  return NextResponse.json({ views })
}

export async function POST(req: Request) {
  const body = await req.json() as {
    name: string
    section: string
    icon?: string
    filters?: Record<string, string>
    order?: number
  }
  const maxOrder = await prisma.systemView.aggregate({
    where: { section: body.section },
    _max: { order: true },
  })
  const view = await prisma.systemView.create({
    data: {
      name: body.name,
      section: body.section,
      icon: body.icon ?? 'List',
      filters: body.filters ?? {},
      order: body.order ?? (maxOrder._max.order ?? -1) + 1,
      isDefault: false,
    },
  })
  return NextResponse.json({ view }, { status: 201 })
}
