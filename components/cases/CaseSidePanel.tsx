'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, CornerUpLeft, FilePlus2, Hand, Layers, MessageSquare, PenLine, Save, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { CaseDetail } from '@/lib/cases/service'
import { formatDate, initials } from './format'
import { formatDistanceToNow } from 'date-fns'

type Event = CaseDetail['events'][number]

export function CaseSidePanel({ detail }: { detail: CaseDetail }) {
  const [tab, setTab] = useState<'activity' | 'comments'>('activity')
  const { config, case: c } = detail
  const userName = (id: string) => detail.users.find((u) => u.id === id)?.name ?? 'Unknown'

  // Every role with someone holding it on the case, phase holders first
  const holderIds = new Set(detail.holders.map((h) => h.roleId))
  const people = config.roles
    .map((r) => ({ role: r, ids: r.id in c.roles ? c.roles[r.id] : detail.holders.find((h) => h.roleId === r.id)?.userIds ?? [] }))
    .filter((p) => p.ids.length > 0)
    .sort((a, b) => Number(holderIds.has(b.role.id)) - Number(holderIds.has(a.role.id)))

  return (
    <aside className="space-y-4 xl:sticky xl:top-0">
      <section className="rounded-[2px] border border-rule bg-surface">
        <h2 className="mono-meta px-4 pt-3.5 pb-2">People</h2>
        <ul className="px-2 pb-2">
          {people.map(({ role, ids }) => (
            <li key={role.id} className="flex items-start gap-2.5 rounded-[2px] px-2 py-1.5">
              <div className="flex -space-x-1.5 pt-0.5">
                {ids.slice(0, 3).map((id) => (
                  <span key={id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-[10px] font-semibold text-paper">
                    {initials(userName(id))}
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{ids.map(userName).join(', ')}</p>
                <p className="flex items-center gap-1 text-xs text-ink-4">
                  {role.name}
                  {holderIds.has(role.id) && c.status === 'open' && <span className="rounded-full bg-accent-tint px-1.5 text-[10px] text-nw-accent">has the case</span>}
                </p>
              </div>
            </li>
          ))}
          {!people.length && <li className="px-2 py-1.5 text-sm text-ink-4">No one assigned yet</li>}
        </ul>
      </section>

      <section className="rounded-[2px] border border-rule bg-surface">
        <div className="flex border-b border-rule" role="tablist">
          {(
            [
              ['activity', 'Activity', detail.events.length],
              ['comments', 'Comments', detail.comments.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent',
                tab === id ? 'border-nw-accent text-nw-accent' : 'border-transparent text-ink-4 hover:text-ink'
              )}
            >
              {label}
              <span className={cn('rounded-full px-1.5 text-[10px]', tab === id ? 'bg-accent-tint' : 'bg-paper-3')}>{count}</span>
            </button>
          ))}
        </div>
        <div className="max-h-[560px] overflow-y-auto p-4">
          {tab === 'activity' ? <Activity detail={detail} /> : <Comments detail={detail} />}
        </div>
      </section>
    </aside>
  )
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  created: <FilePlus2 size={12} />,
  saved: <Save size={12} />,
  taken: <Hand size={12} />,
  forward: <ArrowRight size={12} />,
  backward: <CornerUpLeft size={12} />,
  preEnd: <XCircle size={12} />,
  signed: <PenLine size={12} />,
  subcaseCreated: <Layers size={12} />,
  subcaseClosed: <Layers size={12} />,
  cancelled: <XCircle size={12} />,
}

function describe(e: Event, detail: CaseDetail): React.ReactNode {
  const phaseName = (id: string | null) => detail.config.phases.find((p) => p.id === id)?.name ?? id ?? ''
  const data = (e.data ?? {}) as { fields?: string[]; meaning?: string; parent?: string; number?: string }
  switch (e.type) {
    case 'created':
      return data.parent ? <>created the case as a sub case of <strong className="font-mono font-medium text-nw-accent">{data.parent}</strong></> : 'created the case'
    case 'subcaseCreated':
      return <>created the sub case <strong className="font-mono font-medium text-nw-accent">{data.number}</strong></>
    case 'subcaseClosed':
      return <>closed the sub case <strong className="font-mono font-medium text-nw-accent">{data.number}</strong></>
    case 'saved': {
      const names = (data.fields ?? []).map((id) => detail.config.fields.find((f) => f.id === id)?.name ?? id)
      return `updated ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` and ${names.length - 2} more` : ''}`
    }
    case 'taken':
      return 'took the case'
    case 'forward':
      return e.toPhaseId === e.fromPhaseId ? 'closed the case' : <>sent the case to <strong className="font-medium text-ink">{phaseName(e.toPhaseId)}</strong></>
    case 'backward':
      return <>sent the case back to <strong className="font-medium text-ink">{phaseName(e.toPhaseId)}</strong></>
    case 'preEnd':
      return 'closed the case early'
    case 'signed':
      return <>signed electronically: <em className="text-ink">“{data.meaning}”</em></>
    case 'cancelled':
      return 'cancelled the case'
    default:
      return e.type
  }
}

function Activity({ detail }: { detail: CaseDetail }) {
  const events = [...detail.events].reverse()
  return (
    <ol className="relative space-y-3.5 before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-px before:bg-rule">
      {events.map((e) => (
        <li key={e.id} className="relative flex gap-3">
          <span
            className={cn(
              'z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-surface',
              e.type === 'signed' ? 'border-nw-accent text-nw-accent' : e.type === 'forward' || e.type === 'preEnd' ? 'border-ok text-ok' : 'border-rule text-ink-4'
            )}
          >
            {EVENT_ICON[e.type] ?? <Check size={12} />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] leading-snug text-ink-3">
              <span className="font-medium text-ink">{e.actor.name}</span> {describe(e, detail)}
            </p>
            <p className="text-[11px] text-ink-4" title={formatDate(e.at, true)}>
              {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
              {e.fromPhaseId && e.type !== 'forward' && e.type !== 'backward' && ` · ${detail.config.phases.find((p) => p.id === e.fromPhaseId)?.name ?? ''}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Comments({ detail }: { detail: CaseDetail }) {
  const router = useRouter()
  const toast = useToast()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function post() {
    if (!body.trim()) return
    setBusy(true)
    const res = await fetch(`/api/cases/${detail.case.id}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    setBusy(false)
    if (!res.ok) return toast.error('The comment could not be saved')
    setBody('')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {detail.comments.map((cm) => (
        <div key={cm.id} className="flex gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-3 text-[10px] font-semibold text-ink-3">{initials(cm.author.name)}</span>
          <div className="min-w-0">
            <p className="text-xs text-ink-4">
              <span className="font-medium text-ink">{cm.author.name}</span> · {formatDistanceToNow(new Date(cm.createdAt), { addSuffix: true })} ·{' '}
              {detail.config.phases.find((p) => p.id === cm.phaseId)?.name}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{cm.body}</p>
          </div>
        </div>
      ))}
      {!detail.comments.length && (
        <p className="flex items-center gap-2 text-sm text-ink-4"><MessageSquare size={14} /> No comments yet</p>
      )}
      <div className="space-y-2 border-t border-rule-soft pt-3">
        <Textarea
          value={body}
          rows={3}
          placeholder="Write a comment…"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post()
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-ink-4">Ctrl+Enter to post</span>
          <Button size="sm" onClick={post} disabled={busy || !body.trim()}>Comment</Button>
        </div>
      </div>
    </div>
  )
}
