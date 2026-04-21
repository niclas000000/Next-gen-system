import { prisma } from '@/lib/db/client'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Inbox, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusVariant: Record<string, 'warn' | 'ok' | 'default' | 'risk'> = {
  running: 'warn', completed: 'ok', cancelled: 'default', error: 'risk',
}
const statusLabel: Record<string, string> = {
  running: 'Running', completed: 'Completed', cancelled: 'Cancelled', error: 'Error',
}
const statusIcon: Record<string, React.ReactNode> = {
  running: <Clock size={11} />, completed: <CheckCircle2 size={11} />, cancelled: <XCircle size={11} />, error: <AlertCircle size={11} />,
}

export default async function WorkflowInstancesPage() {
  const instances = await prisma.workflowInstance.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      workflow: { select: { name: true } },
      steps: { where: { status: 'in_progress' }, take: 1 },
    },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Cases</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>All running and completed workflow cases.</p>
      </div>

      {instances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: 'var(--paper-3)' }}>
              <Inbox size={24} style={{ color: 'var(--ink-4)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--ink)' }}>No cases yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>
              Start a case from a published workflow to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => {
            const currentStepName = instance.steps[0]?.stepName
            return (
              <Link key={instance.id} href={`/workflows/instances/${instance.id}`}>
                <Card className="transition-all duration-200 cursor-pointer hover:border-[var(--nw-accent)]">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--ink)' }}>{instance.title}</p>
                        <Badge variant={statusVariant[instance.status] ?? 'default'} className="text-xs shrink-0 flex items-center gap-1">
                          {statusIcon[instance.status]}
                          {statusLabel[instance.status] ?? instance.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ink-4)' }}>
                        <span>{instance.workflow.name}</span>
                        {currentStepName && (
                          <>
                            <span>·</span>
                            <span style={{ color: 'var(--nw-accent)' }}>Current: {currentStepName}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(instance.createdAt), { addSuffix: true })}</span>
                      </div>
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
