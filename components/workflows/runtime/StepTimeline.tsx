'use client'

import { CheckCircle2, Clock, Circle, XCircle, AlertCircle, User, AlarmClock } from 'lucide-react'
import { formatDistanceToNow, format, isPast, differenceInHours } from 'date-fns'

interface Step {
  id: string
  nodeId: string
  stepName: string
  stepType: string
  status: string
  startedAt: string | null
  completedAt: string | null
  formData: Record<string, unknown> | null
  decision: string | null
  assigneeName?: string | null
  assignedRole?: string | null
  dueAt?: string | null
}

interface StepTimelineProps {
  steps: Step[]
}

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} />,
  in_progress: <Clock size={18} className="animate-pulse" style={{ color: 'var(--nw-accent)' }} />,
  skipped: <XCircle size={18} style={{ color: 'var(--ink-4)' }} />,
  error: <AlertCircle size={18} style={{ color: 'var(--risk)' }} />,
  pending: <Circle size={18} style={{ color: 'var(--rule)' }} />,
}

const nodeTypeLabel: Record<string, string> = {
  task: 'Task',
  decision: 'Decision',
  automation: 'Automation',
  notification: 'Notification',
  start: 'Start',
  end: 'End',
  delay: 'Delay',
  subprocess: 'Subprocess',
  'parallel-split': 'Parallel Split',
  'parallel-join': 'Parallel Join',
}

export function StepTimeline({ steps }: StepTimelineProps) {
  if (steps.length === 0) {
    return <p className="text-sm italic" style={{ color: 'var(--ink-4)' }}>No steps yet.</p>
  }

  return (
    <ol className="relative">
      {steps.map((step, idx) => (
        <li key={step.id} className="flex gap-4 pb-6 last:pb-0 relative">
          {/* Vertical line */}
          {idx < steps.length - 1 && (
            <div className="absolute left-[8px] top-[22px] w-[2px] h-full" style={{ background: 'var(--rule)' }} />
          )}

          {/* Icon */}
          <div className="shrink-0 mt-0.5 z-10">{statusIcon[step.status] ?? statusIcon.pending}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{step.stepName}</p>
                <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{nodeTypeLabel[step.stepType] ?? step.stepType}</p>
              </div>
              <div className="text-right shrink-0">
                {step.completedAt ? (
                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
                    {formatDistanceToNow(new Date(step.completedAt), { addSuffix: true })}
                  </p>
                ) : step.startedAt ? (
                  <p className="text-xs" style={{ color: 'var(--nw-accent)' }}>
                    Started {formatDistanceToNow(new Date(step.startedAt), { addSuffix: true })}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Assignee + due */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {(step.assigneeName || step.assignedRole) && (
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-4)' }}>
                  <User size={10} />
                  {step.assigneeName ?? step.assignedRole}
                </div>
              )}
              {step.dueAt && step.status === 'in_progress' && (() => {
                const due = new Date(step.dueAt)
                const overdue = isPast(due)
                const soon = !overdue && differenceInHours(due, new Date()) < 24
                const color = overdue ? 'var(--risk)' : soon ? 'var(--warn)' : 'var(--ink-4)'
                return (
                  <div className="flex items-center gap-1 text-xs" style={{ color }}>
                    <AlarmClock size={10} />
                    {overdue ? 'Overdue · ' : 'Due · '}{formatDistanceToNow(due, { addSuffix: true })}
                  </div>
                )
              })()}
              {step.dueAt && step.status === 'completed' && (
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-4)' }}>
                  <AlarmClock size={10} />
                  Due {format(new Date(step.dueAt), 'dd MMM')}
                </div>
              )}
            </div>

            {/* Decision made */}
            {step.decision && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs rounded-[2px] px-2 py-0.5"
                style={{ background: 'var(--accent-tint)', color: 'var(--nw-accent)', border: '1px solid var(--nw-accent)' }}>
                Decision: {step.decision}
              </div>
            )}

            {/* Form data summary */}
            {step.formData && Object.keys(step.formData).length > 0 && (
              <div className="mt-2 rounded-[2px] p-2 space-y-1" style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
                {Object.entries(step.formData).slice(0, 4).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <span className="font-medium min-w-0 truncate" style={{ color: 'var(--ink-3)' }}>{key}:</span>
                    <span className="truncate" style={{ color: 'var(--ink)' }}>{String(val)}</span>
                  </div>
                ))}
                {Object.keys(step.formData).length > 4 && (
                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>+{Object.keys(step.formData).length - 4} more fields</p>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
