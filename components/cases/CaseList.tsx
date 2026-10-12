'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { listCases } from '@/lib/cases/service'
import { formatDate } from './format'

type Result = Awaited<ReturnType<typeof listCases>>
type Row = Result['cases'][number]

const STATUS_TABS = [
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
]

const STATUS_BADGE: Record<string, { label: string; variant: 'warn' | 'ok' | 'default' }> = {
  open: { label: 'Open', variant: 'warn' },
  closed: { label: 'Closed', variant: 'ok' },
  preClosed: { label: 'Closed early', variant: 'ok' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

export function CaseList({ result, caseTypes, status }: { result: Result; caseTypes: { id: string; name: string }[]; status: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in updates)) next.delete('page')
    router.push(`${pathname}?${next}`)
  }

  // Debounced search
  useEffect(() => {
    if ((params.get('q') ?? '') === q) return
    const t = setTimeout(() => set({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const mine = params.get('view') === 'mine'

  return (
    <div className="rounded-[2px] border border-rule bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-3">
        <div className="flex rounded-[2px] border border-rule p-0.5" role="tablist" aria-label="Status">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={status === t.id}
              onClick={() => set({ status: t.id === 'open' ? null : t.id })}
              className={cn(
                'rounded-[2px] px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
                status === t.id ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-paper-2'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-ink-3 cursor-pointer">
          <input type="checkbox" checked={mine} onChange={() => set({ view: mine ? null : 'mine' })} className="accent-[var(--nw-accent)]" />
          Created by me
        </label>
        {caseTypes.length > 1 && (
          <select
            value={params.get('caseTypeId') ?? ''}
            onChange={(e) => set({ caseTypeId: e.target.value })}
            className="h-8 rounded-[2px] border border-rule bg-surface px-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
            aria-label="Case type"
          >
            <option value="">All case types</option>
            {caseTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="ml-auto flex h-8 w-full sm:w-64 items-center gap-2 rounded-[2px] border border-rule bg-surface px-2.5 focus-within:ring-2 focus-within:ring-nw-accent">
          <Search size={13} className="text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number or title" className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-4" aria-label="Search cases" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              {['Case', 'Title', 'Phase', 'Status', 'Due', 'Created by', 'Created'].map((h) => (
                <th key={h} className="mono-meta px-4 py-2.5 font-normal whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.cases.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </tbody>
        </table>
        {!result.cases.length && <p className="px-4 py-10 text-center text-sm text-ink-4">No cases match the filter.</p>}
      </div>

      <div className="flex items-center justify-between border-t border-rule px-4 py-2.5 text-xs text-ink-4">
        <span>
          {result.total} case{result.total === 1 ? '' : 's'}
          {pages > 1 && ` · page ${result.page} of ${pages}`}
        </span>
        {pages > 1 && (
          <div className="flex gap-1">
            <button aria-label="Previous page" disabled={result.page <= 1} onClick={() => set({ page: String(result.page - 1) })} className="rounded-[2px] border border-rule p-1 disabled:opacity-40 hover:bg-paper-2">
              <ChevronLeft size={14} />
            </button>
            <button aria-label="Next page" disabled={result.page >= pages} onClick={() => set({ page: String(result.page + 1) })} className="rounded-[2px] border border-rule p-1 disabled:opacity-40 hover:bg-paper-2">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CaseRow({ c }: { c: Row }) {
  const overdue = c.status === 'open' && c.phaseDueAt && new Date(c.phaseDueAt) < new Date()
  const s = STATUS_BADGE[c.status] ?? { label: c.status, variant: 'default' as const }
  return (
    <tr className="group border-b border-rule-soft last:border-0 hover:bg-paper-2">
      <td className="px-4 py-2.5 whitespace-nowrap">
        <Link href={`/cases/${c.number}`} className="font-mono text-xs text-nw-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent rounded-[2px]">
          {c.number}
        </Link>
      </td>
      <td className="px-4 py-2.5 max-w-[360px]">
        <Link href={`/cases/${c.number}`} className="block truncate text-ink group-hover:text-ink">{c.title}</Link>
        <span className="text-xs text-ink-4">
          {c.caseTypeName}
          {c.parentNumber && <> · sub case of <span className="font-mono text-nw-accent">{c.parentNumber}</span></>}
        </span>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: c.phaseCount }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 w-4 rounded-full',
                  c.status !== 'open' || i < c.phaseIndex ? 'bg-ok' : i === c.phaseIndex ? 'bg-nw-accent' : 'bg-paper-3'
                )}
              />
            ))}
          </span>
          <span className="text-ink-3">{c.phaseName}</span>
        </div>
      </td>
      <td className="px-4 py-2.5"><Badge variant={s.variant}>{s.label}</Badge></td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {overdue ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-risk-ink"><AlertTriangle size={12} /> {formatDate(c.phaseDueAt)}</span>
        ) : (
          <span className="text-xs text-ink-4">{c.status === 'open' ? formatDate(c.phaseDueAt) || '—' : '—'}</span>
        )}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-ink-3">{c.creatorName}</td>
      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-ink-4">{formatDate(c.createdAt)}</td>
    </tr>
  )
}
