import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const logs = await prisma.auditLog.findMany({
    where: { instanceId: id },
    orderBy: { timestamp: 'desc' },
    include: { actorUser: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ logs })
}
