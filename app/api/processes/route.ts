import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const SYSTEM_USER_ID = 'system-placeholder-user'

export async function GET() {
  const processes = await prisma.process.findMany({
    orderBy: { name: 'asc' },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { documents: true, workflows: true, children: true } },
    },
  })
  return NextResponse.json({ processes })
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; parentId?: string; description?: string }
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? SYSTEM_USER_ID

  const process = await prisma.process.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      parentId: body.parentId ?? null,
      createdBy: userId,
    },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { documents: true, workflows: true, children: true } },
    },
  })
  return NextResponse.json({ process }, { status: 201 })
}
