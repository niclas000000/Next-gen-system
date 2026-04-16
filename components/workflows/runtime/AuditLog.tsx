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
  color: string
}> = {
  instance_started: {
    label: () => 'Case started',
    icon: <Play size={13} />,
    color: 'text-blue-600 bg-blue-50',
  },
  instance_completed: {
    label: () => 'Case completed',
    icon: <CheckCircle2 size={13} />,
    color: 'text-green-600 bg-green-50',
  },
  instance_cancelled: {
    label: () => 'Case cancelled',
    icon: <XCircle size={13} />,
    color: 'text-slate-500 bg-slate-100',
  },
  step_started: {
    label: (d) => `Step started: ${d.stepName ?? ''}`,
    icon: <Play size={13} />,
    color: 'text-blue-500 bg-blue-50',
  },
  step_completed: {
    label: (d) => `Step completed: ${d.stepName ?? ''}`,
    icon: <CheckCircle2 size={13} />,
    color: 'text-green-600 bg-green-50',
  },
  decision_made: {
    label: (d) => `Decision: ${d.branch ?? d.decision ?? ''}`,
    icon: <GitBranch size={13} />,
    color: 'text-orange-600 bg-orange-50',
  },
  decision_auto_evaluated: {
    label: (d) => `Auto-decision: ${d.matchedBranch ?? 'default'}`,
    icon: <Zap size={13} />,
    color: 'text-purple-600 bg-purple-50',
  },
  commented: {
    label: () => 'Comment added',
    icon: <User size={13} />,
    color: 'text-slate-500 bg-slate-100',
  },
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function AuditLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle size={18} className="text-slate-300 mb-2" />
        <p className="text-xs text-slate-400">No activity yet.</p>
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
              <div className="absolute left-[13px] top-[26px] w-px h-full bg-slate-100" />
            )}

            {/* Icon */}
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5 ${cfg?.color ?? 'text-slate-500 bg-slate-100'}`}>
              {cfg?.icon ?? <AlertCircle size={13} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700">{label}</p>
                <time
                  className="text-[10px] text-slate-400 shrink-0 mt-0.5"
                  title={format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                >
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </time>
              </div>

              {/* Actor */}
              <div className="flex items-center gap-1.5 mt-1">
                {isSystem ? (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Zap size={9} className="text-purple-400" />
                    System
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[8px] font-medium">
                      {initials(entry.actorName)}
                    </span>
                    {entry.actorName}
                  </span>
                )}
              </div>

              {/* Extra details */}
              {entry.details && Object.keys(entry.details).length > 0 && entry.action === 'step_completed' && (entry.details.fields as string[])?.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5">
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
