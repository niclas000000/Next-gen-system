import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, groups: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const steps = await prisma.workflowStep.findMany({
    where: {
      status: 'in_progress',
      instance: { status: 'running' },
      OR: [
        { assignedTo: userId },
        { assignedRole: user.role },
        { assignedRole: { in: user.groups } },
      ],
    },
    include: {
      instance: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          workflow: { select: { name: true } },
          creator: { select: { name: true } },
        },
      },
    },
    orderBy: { startedAt: 'asc' },
  })

  return NextResponse.json({ steps })
}
