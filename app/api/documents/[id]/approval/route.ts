import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const approvals = await prisma.documentApproval.findMany({
    where: { documentId: id },
    orderBy: { startedAt: 'asc' },
  })

  // Resolve user names for all user IDs referenced
  const allUserIds = new Set<string>()
  for (const a of approvals) {
    a.assignedTo.forEach((uid) => allUserIds.add(uid))
    const responses = a.responses as { userId: string }[]
    responses.forEach((r) => allUserIds.add(r.userId))
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, name: true, email: true },
  })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  return NextResponse.json({
    approvals: approvals.map((a) => ({
      id: a.id,
      phase: a.phase,
      status: a.status,
      assignedTo: a.assignedTo.map((uid) => userMap[uid] ?? { id: uid, name: uid, email: '' }),
      responses: (a.responses as { userId: string; decision: string; comment?: string; at: string }[]).map((r) => ({
        ...r,
        user: userMap[r.userId] ?? { id: r.userId, name: r.userId, email: '' },
      })),
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
  })
}
