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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // roleAssignments: { [phaseIndex]: userId[] } — provided by the submission modal
  const body = await req.json() as { roleAssignments?: Record<string, string[]> }

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { documentType: { include: { approvalFlow: true } } },
  })

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'draft') return NextResponse.json({ error: 'Only draft documents can be submitted' }, { status: 400 })

  const flow = doc.documentType?.approvalFlow
  if (!flow) return NextResponse.json({ error: 'No approval flow configured for this document type' }, { status: 400 })

  const phases = (flow.phases as unknown as ApprovalPhase[]).sort((a, b) => a.order - b.order)
  if (phases.length === 0) {
    await prisma.document.update({ where: { id }, data: { status: 'published' } })
    return NextResponse.json({ status: 'published' })
  }

  const firstPhase = phases[0]

  // Use explicitly assigned users from the modal; fall back to role-based resolution
  let assignedTo: string[] = body.roleAssignments?.[0] ?? []
  if (assignedTo.length === 0 && firstPhase.role) {
    const [byRole, group] = await Promise.all([
      prisma.user.findMany({ where: { role: firstPhase.role, active: true }, select: { id: true } }),
      prisma.group.findFirst({ where: { name: firstPhase.role } }),
    ])
    assignedTo = Array.from(new Set([...byRole.map((u) => u.id), ...(group?.members ?? [])]))
  }

  await prisma.$transaction([
    prisma.document.update({
      where: { id },
      data: { status: 'pending', approvalAssignments: (body.roleAssignments ?? {}) as never },
    }),
    prisma.documentApproval.create({
      data: { documentId: id, phase: firstPhase.name, status: 'pending', assignedTo },
    }),
  ])

  if (assignedTo.length > 0) {
    await prisma.notification.createMany({
      data: assignedTo.map((userId) => ({
        userId,
        type: 'approval_requested',
        title: `Approval requested: ${doc.title}`,
        body: `Phase: ${firstPhase.name}`,
        link: `/documents/${id}`,
      })),
    })
  }

  return NextResponse.json({ status: 'pending', phase: firstPhase.name, assignedTo })
}
