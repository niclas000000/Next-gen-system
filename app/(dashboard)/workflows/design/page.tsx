import { prisma } from '@/lib/db/client'
import { NewWorkflowButton } from './NewWorkflowButton'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { GitBranch, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { WorkflowNode } from '@/types/workflow'

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-orange-100 text-orange-700 border-orange-200',
}

export default async function WorkflowDesignListPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, status: true, nodes: true, updatedAt: true },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Workflows</h1>
          <p className="text-sm text-slate-500 mt-1">Design and manage your workflow definitions.</p>
        </div>
        <NewWorkflowButton />
      </div>

      {workflows.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              <GitBranch size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">No workflows yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Create your first workflow to get started.</p>
            <NewWorkflowButton />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((wf) => {
            const nodeCount = Array.isArray(wf.nodes) ? (wf.nodes as unknown as WorkflowNode[]).length : 0
            return (
              <Link key={wf.id} href={`/workflows/design/${wf.id}`}>
                <Card className="shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                        <GitBranch size={16} className="text-blue-600" />
                      </div>
                      <Badge variant="outline" className={`text-xs ${statusColors[wf.status] ?? ''}`}>
                        {wf.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{wf.name}</p>
                    {wf.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{wf.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <GitBranch size={11} />
                        {nodeCount} nodes
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
