import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const views = await prisma.savedView.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ views })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { name: string; filters?: Record<string, unknown> }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const view = await prisma.savedView.create({
    data: { name: body.name.trim(), userId, filters: body.filters ?? {} },
  })
  return NextResponse.json({ view }, { status: 201 })
}
