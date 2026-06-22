import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

interface ApprovalResponse {
  userId: string
  decision: 'approved' | 'rejected'
  comment?: string
  at: string
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json() as { comment?: string }

  const doc = await prisma.document.findUnique({ where: { id }, select: { id: true, title: true, createdBy: true } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentApproval = await prisma.documentApproval.findFirst({
    where: { documentId: id, status: 'pending' },
    orderBy: { startedAt: 'asc' },
  })
  if (!currentApproval) return NextResponse.json({ error: 'No pending approval phase' }, { status: 400 })

  if (!currentApproval.assignedTo.includes(userId)) {
    return NextResponse.json({ error: 'Not an approver for this phase' }, { status: 403 })
  }

  const responses = currentApproval.responses as unknown as ApprovalResponse[]
  const newResponse: ApprovalResponse = { userId, decision: 'rejected', comment: body.comment, at: new Date().toISOString() }

  await prisma.$transaction([
    prisma.documentApproval.update({
      where: { id: currentApproval.id },
      data: { responses: [...responses, newResponse] as unknown as never[], status: 'rejected', completedAt: new Date() },
    }),
    prisma.document.update({ where: { id }, data: { status: 'draft' } }),
  ])

  await prisma.notification.create({
    data: {
      userId: doc.createdBy,
      type: 'approval_rejected',
      title: `Approval rejected: ${doc.title}`,
      body: body.comment ? `Reason: ${body.comment}` : `Phase "${currentApproval.phase}" was rejected.`,
      link: `/documents/${id}`,
    },
  })

  return NextResponse.json({ rejected: true })
}
