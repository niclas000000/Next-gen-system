import { prisma } from '@/lib/db/client'
import { Card, CardContent } from '@/components/ui/card'
import { GitBranch } from 'lucide-react'
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
          <h1 className="text-2xl font-semibold text-slate-900">Approval Flows</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define multi-phase approval workflows that document types can use.
          </p>
        </div>
      </div>

      {flows.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <GitBranch size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No approval flows yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Create a flow with Review and Approve phases to use in document types.
            </p>
          </CardContent>
        </Card>
      ) : null}

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
