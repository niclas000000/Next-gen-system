import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const receipts = await prisma.readReceipt.findMany({
    where: { documentId: id },
    orderBy: { readAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ receipts })
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const receipt = await prisma.readReceipt.upsert({
    where: { documentId_userId: { documentId: id, userId } },
    create: { documentId: id, userId },
    update: { readAt: new Date() },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ receipt })
}
