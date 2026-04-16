import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET() {
  const forms = await prisma.form.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, fields: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ forms })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: { id: SYSTEM_USER_ID, name: 'System', email: 'system@nexus.internal', password: '', role: 'admin', active: false },
    update: {},
  })

  const body = await req.json() as { name: string; description?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const form = await prisma.form.create({
    data: { name: body.name.trim(), description: body.description ?? '', createdBy: userId },
  })
  return NextResponse.json({ form }, { status: 201 })
}
