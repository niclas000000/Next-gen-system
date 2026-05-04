import { prisma } from '@/lib/db/client'
import { ApprovalFlowsClient } from './ApprovalFlowsClient'

export default async function ApprovalFlowsPage() {
  const flows = await prisma.approvalFlow.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { documentTypes: true } } },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Approval Flows</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>
            Define multi-phase approval workflows that document types can use.
          </p>
        </div>
      </div>

      <ApprovalFlowsClient initialFlows={flows.map(f => ({
        id: f.id,
        name: f.name,
        phases: f.phases as Phase[],
        usedBy: f._count.documentTypes,
        updatedAt: f.updatedAt.toISOString(),
      }))} />
    </div>
  )
}

interface Phase {
  id: string
  name: string
  role: string
  rule: 'any' | 'all'
  deadlineDays: number
  order: number
}
