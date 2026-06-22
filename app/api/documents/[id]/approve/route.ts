import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

interface ApprovalPhase {
  id: string
  name: string
  role: string
  rule: 'any' | 'all'
  deadlineDays?: number
  order: number
}

interface ApprovalResponse {
  userId: string
  decision: 'approved' | 'rejected'
  comment?: string
  at: string
}

async function resolveUsersForRole(role: string): Promise<string[]> {
  const [byRole, group] = await Promise.all([
    prisma.user.findMany({ where: { role, active: true }, select: { id: true } }),
    prisma.group.findFirst({ where: { name: role } }),
  ])
  const ids = new Set([...byRole.map((u) => u.id), ...(group?.members ?? [])])
  return Array.from(ids)
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

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { documentType: { include: { approvalFlow: true } } },
  })
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
  if (responses.some((r) => r.userId === userId)) {
    return NextResponse.json({ error: 'Already responded' }, { status: 400 })
  }

  const newResponse: ApprovalResponse = { userId, decision: 'approved', comment: body.comment, at: new Date().toISOString() }
  const updatedResponses = [...responses, newResponse]

  const phases = ((doc.documentType?.approvalFlow?.phases as unknown as ApprovalPhase[]) ?? []).sort((a, b) => a.order - b.order)
  const currentPhaseIndex = phases.findIndex((p) => p.name === currentApproval.phase)
  const currentPhaseDef = phases[currentPhaseIndex]

  // Check if phase is complete
  const approvals = updatedResponses.filter((r) => r.decision === 'approved')
  const phaseComplete =
    currentPhaseDef?.rule === 'any'
      ? approvals.length >= 1
      : approvals.length >= currentApproval.assignedTo.length

  if (!phaseComplete) {
    // Just record the response
    await prisma.documentApproval.update({
      where: { id: currentApproval.id },
      data: { responses: updatedResponses as unknown as never[] },
    })
    return NextResponse.json({ phaseComplete: false })
  }

  // Phase complete — advance
  const nextPhase = phases[currentPhaseIndex + 1]

  if (nextPhase) {
    // Advance to next phase — prefer the approvers chosen at submit, fall back to role resolution
    const storedAssignments = doc.approvalAssignments as Record<string, string[]> | null
    const stored = storedAssignments?.[String(currentPhaseIndex + 1)] ?? []
    const assignedTo = stored.length > 0 ? stored : await resolveUsersForRole(nextPhase.role)
    await prisma.$transaction([
      prisma.documentApproval.update({
        where: { id: currentApproval.id },
        data: { responses: updatedResponses as unknown as never[], status: 'approved', completedAt: new Date() },
      }),
      prisma.documentApproval.create({
        data: { documentId: id, phase: nextPhase.name, status: 'pending', assignedTo },
      }),
    ])
    if (assignedTo.length > 0) {
      await prisma.notification.createMany({
        data: assignedTo.map((uid) => ({
          userId: uid,
          type: 'approval_requested',
          title: `Approval requested: ${doc.title}`,
          body: `Phase: ${nextPhase.name}`,
          link: `/documents/${id}`,
        })),
      })
    }
    return NextResponse.json({ phaseComplete: true, nextPhase: nextPhase.name })
  } else {
    // All phases done — publish
    await prisma.$transaction([
      prisma.documentApproval.update({
        where: { id: currentApproval.id },
        data: { responses: updatedResponses as unknown as never[], status: 'approved', completedAt: new Date() },
      }),
      prisma.document.update({ where: { id }, data: { status: 'published' } }),
    ])
    await prisma.notification.create({
      data: {
        userId: doc.createdBy,
        type: 'document_published',
        title: `Document published: ${doc.title}`,
        body: 'All approval phases completed.',
        link: `/documents/${id}`,
      },
    })
    return NextResponse.json({ phaseComplete: true, published: true })
  }
}
