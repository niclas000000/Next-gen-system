import { prisma } from '@/lib/db/client'
import { NewWorkflowButton } from '@/app/(dashboard)/workflows/design/NewWorkflowButton'
import { StartWorkflowButton } from '@/app/(dashboard)/workflows/design/StartWorkflowButton'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { GitBranch, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { WorkflowNode } from '@/types/workflow'

const statusVariant: Record<string, 'default' | 'ok' | 'warn'> = {
  draft: 'default', published: 'ok', archived: 'warn',
}

export default async function DesignWorkflowsPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, status: true, nodes: true, updatedAt: true },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Workflows</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Design and manage your workflow definitions.</p>
        </div>
        <NewWorkflowButton />
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: 'var(--paper-3)' }}>
              <GitBranch size={24} style={{ color: 'var(--ink-4)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--ink)' }}>No workflows yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--ink-4)' }}>Create your first workflow to get started.</p>
            <NewWorkflowButton />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((wf) => {
            const nodeCount = Array.isArray(wf.nodes) ? (wf.nodes as unknown as WorkflowNode[]).length : 0
            return (
              <div key={wf.id} className="relative group">
                <Link href={`/workflows/design/${wf.id}`}>
                  <Card className="transition-all duration-200 cursor-pointer h-full hover:border-[var(--nw-accent)]">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="p-2 rounded-[2px] shrink-0" style={{ background: 'var(--paper-2)' }}>
                          <GitBranch size={16} style={{ color: 'var(--nw-accent)' }} />
                        </div>
                        <Badge variant={statusVariant[wf.status] ?? 'default'} className="text-xs">
                          {wf.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--ink)' }}>{wf.name}</p>
                      {wf.description && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ink-3)' }}>{wf.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-4 text-xs" style={{ color: 'var(--ink-4)' }}>
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
                {wf.status === 'published' && (
                  <div className="absolute bottom-3 right-3">
                    <StartWorkflowButton workflowId={wf.id} workflowName={wf.name} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
