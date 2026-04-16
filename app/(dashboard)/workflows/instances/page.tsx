import { prisma } from '@/lib/db/client'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Inbox, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  running: {
    label: 'Running',
    class: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Clock size={11} />,
  },
  completed: {
    label: 'Completed',
    class: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle2 size={11} />,
  },
  cancelled: {
    label: 'Cancelled',
    class: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <XCircle size={11} />,
  },
  error: {
    label: 'Error',
    class: 'bg-red-100 text-red-700 border-red-200',
    icon: <AlertCircle size={11} />,
  },
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
        <h1 className="text-2xl font-semibold text-slate-900">Cases</h1>
        <p className="text-sm text-slate-500 mt-1">All running and completed workflow cases.</p>
      </div>

      {instances.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              <Inbox size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">No cases yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Start a case from a published workflow to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => {
            const cfg = statusConfig[instance.status] ?? statusConfig.running
            const currentStepName = instance.steps[0]?.stepName
            return (
              <Link key={instance.id} href={`/workflows/instances/${instance.id}`}>
                <Card className="shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-800 text-sm truncate">{instance.title}</p>
                        <Badge variant="outline" className={`text-xs shrink-0 flex items-center gap-1 ${cfg.class}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{instance.workflow.name}</span>
                        {currentStepName && (
                          <>
                            <span>·</span>
                            <span className="text-blue-600">Current: {currentStepName}</span>
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
