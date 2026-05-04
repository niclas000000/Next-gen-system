'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Clock, ArrowRight, Inbox, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns'

interface TaskStep {
  id: string
  stepName: string
  stepType: string
  assignedRole: string | null
  startedAt: string | null
  dueAt: string | null
  instance: {
    id: string
    title: string
    status: string
    createdAt: string
    workflow: { name: string }
    creator: { name: string } | null
  }
}

const STEP_TYPE_LABEL: Record<string, string> = {
  task: 'Task',
  decision: 'Decision',
}

function DueLabel({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null
  const due = new Date(dueAt)
  const overdue = isPast(due)
  const soonish = !overdue && differenceInHours(due, new Date()) < 24
  const color = overdue ? 'var(--risk)' : soonish ? 'var(--warn)' : 'var(--ink-4)'
  const Icon = overdue || soonish ? AlertTriangle : Clock
  return (
    <div className="flex items-center gap-1 text-xs" style={{ color }}>
      <Icon size={11} />
      {overdue ? 'Overdue · ' : 'Due · '}
      {formatDistanceToNow(due, { addSuffix: true })}
    </div>
  )
}

export function TasksClient() {
  const [steps, setSteps] = useState<TaskStep[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((d: { steps: TaskStep[] }) => setSteps(d.steps ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm" style={{ color: 'var(--ink-4)' }}>
        Loading tasks…
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: 'var(--paper-3)' }}>
          <Inbox size={22} style={{ color: 'var(--ink-4)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>No tasks assigned to you</p>
        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Tasks will appear here when a workflow step is assigned to you or your role.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <Link
          key={step.id}
          href={`/workflows/instances/${step.instance.id}`}
          className="flex items-start gap-4 px-4 py-3 rounded-[2px] transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nw-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
        >
          {/* Step icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-[2px] mt-0.5 shrink-0" style={{ background: 'var(--accent-tint)' }}>
            <CheckSquare size={15} style={{ color: 'var(--nw-accent)' }} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{step.stepName}</span>
              <Badge variant="warn">{STEP_TYPE_LABEL[step.stepType] ?? step.stepType}</Badge>
              {step.assignedRole && (
                <Badge variant="default" className="text-[10px]">{step.assignedRole}</Badge>
              )}
            </div>
            <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
              {step.instance.title}
              <span className="mx-1.5" style={{ color: 'var(--ink-4)' }}>·</span>
              {step.instance.workflow.name}
            </p>
            {step.instance.creator && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                Started by {step.instance.creator.name}
              </p>
            )}
          </div>

          {/* Time + arrow */}
          <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
            <DueLabel dueAt={step.dueAt} />
            {!step.dueAt && step.startedAt && (
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-4)' }}>
                <Clock size={11} />
                {formatDistanceToNow(new Date(step.startedAt), { addSuffix: true })}
              </div>
            )}
            <ArrowRight size={14} style={{ color: 'var(--ink-4)' }} />
          </div>
        </Link>
      ))}
    </div>
  )
}
