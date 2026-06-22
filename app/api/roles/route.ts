import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await prisma.processRole.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ roles })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { name: string; description?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const role = await prisma.processRole.create({
    data: { name: body.name.trim(), description: body.description?.trim() || null },
  })
  return NextResponse.json({ role }, { status: 201 })
}
