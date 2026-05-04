'use client'

import { formatDistanceToNow, format } from 'date-fns'
import {
  Play, CheckCircle2, XCircle, GitBranch, Zap, AlertCircle, User,
} from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  actor: string
  actorName: string
  timestamp: string
  details: Record<string, unknown>
}

interface Props {
  entries: AuditEntry[]
}

const actionConfig: Record<string, {
  label: (details: Record<string, unknown>) => string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}> = {
  instance_started: {
    label: () => 'Case started',
    icon: <Play size={13} />,
    iconColor: 'var(--nw-accent)',
    iconBg: 'var(--accent-tint)',
  },
  instance_completed: {
    label: () => 'Case completed',
    icon: <CheckCircle2 size={13} />,
    iconColor: 'var(--ok)',
    iconBg: 'color-mix(in oklch, var(--ok) 12%, transparent)',
  },
  instance_cancelled: {
    label: () => 'Case cancelled',
    icon: <XCircle size={13} />,
    iconColor: 'var(--ink-4)',
    iconBg: 'var(--paper-3)',
  },
  step_started: {
    label: (d) => `Step started: ${d.stepName ?? ''}`,
    icon: <Play size={13} />,
    iconColor: 'var(--nw-accent)',
    iconBg: 'var(--accent-tint)',
  },
  step_completed: {
    label: (d) => `Step completed: ${d.stepName ?? ''}`,
    icon: <CheckCircle2 size={13} />,
    iconColor: 'var(--ok)',
    iconBg: 'color-mix(in oklch, var(--ok) 12%, transparent)',
  },
  decision_made: {
    label: (d) => `Decision: ${d.branch ?? d.decision ?? ''}`,
    icon: <GitBranch size={13} />,
    iconColor: 'var(--warn)',
    iconBg: 'color-mix(in oklch, var(--warn) 15%, transparent)',
  },
  decision_auto_evaluated: {
    label: (d) => `Auto-decision: ${d.matchedBranch ?? 'default'}`,
    icon: <Zap size={13} />,
    iconColor: 'var(--ink-3)',
    iconBg: 'var(--paper-3)',
  },
  commented: {
    label: () => 'Comment added',
    icon: <User size={13} />,
    iconColor: 'var(--ink-4)',
    iconBg: 'var(--paper-3)',
  },
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function AuditLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle size={18} className="mb-2" style={{ color: 'var(--ink-4)' }} />
        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>No activity yet.</p>
      </div>
    )
  }

  return (
    <ol className="space-y-0">
      {entries.map((entry, idx) => {
        const cfg = actionConfig[entry.action]
        const label = cfg ? cfg.label(entry.details) : entry.action.replace(/_/g, ' ')
        const isSystem = entry.actor === 'system-placeholder-user'

        return (
          <li key={entry.id} className="flex gap-3 pb-4 last:pb-0 relative">
            {idx < entries.length - 1 && (
              <div className="absolute left-[13px] top-[26px] w-px h-full" style={{ background: 'var(--rule)' }} />
            )}

            {/* Icon */}
            <div
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5"
              style={{
                color: cfg?.iconColor ?? 'var(--ink-4)',
                background: cfg?.iconBg ?? 'var(--paper-3)',
              }}
            >
              {cfg?.icon ?? <AlertCircle size={13} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{label}</p>
                <time
                  className="text-[10px] shrink-0 mt-0.5"
                  style={{ color: 'var(--ink-4)' }}
                  title={format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                >
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </time>
              </div>

              {/* Actor */}
              <div className="flex items-center gap-1.5 mt-1">
                {isSystem ? (
                  <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--ink-4)' }}>
                    <Zap size={9} style={{ color: 'var(--ink-3)' }} />
                    System
                  </span>
                ) : (
                  <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--ink-4)' }}>
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-medium"
                      style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}
                    >
                      {initials(entry.actorName)}
                    </span>
                    {entry.actorName}
                  </span>
                )}
              </div>

              {/* Extra details */}
              {entry.details && Object.keys(entry.details).length > 0 && entry.action === 'step_completed' && (entry.details.fields as string[])?.length > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                  Fields: {(entry.details.fields as string[]).join(', ')}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
