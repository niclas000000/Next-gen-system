import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const groups = await prisma.group.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ groups })
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; description?: string }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const group = await prisma.group.create({
    data: { name: body.name, description: body.description ?? null },
  })
  return NextResponse.json({ group }, { status: 201 })
}
