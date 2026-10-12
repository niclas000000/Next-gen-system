'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowRight, Table2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Report } from '@/lib/reports/service'
import { formatDate } from '@/components/cases/format'

const PERIODS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
  { days: 0, label: 'All time' },
]
const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
]

export function ReportView({ report }: { report: Report }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { kpis, filter } = report

  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    router.push(`${pathname}?${next}`, { scroll: false })
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-meta">Reports</p>
          <h1 className="font-display text-2xl font-semibold text-ink">Case reports</h1>
          <p className="mt-1 text-sm text-ink-3">Fields shared by several case types — by name or property category — are reported together.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[2px] border border-rule bg-surface px-4 py-3">
        <select
          value={filter.caseTypeId ?? ''}
          onChange={(e) => set({ caseTypeId: e.target.value, dimension: null, value: null })}
          aria-label="Case type"
          className="h-8 rounded-[2px] border border-rule bg-surface px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
        >
          <option value="">All case types</option>
          {report.caseTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Segmented options={PERIODS.map((p) => ({ id: String(p.days), label: p.label }))} value={String(filter.days)} onChange={(v) => set({ days: v, value: null })} label="Period" />
        <Segmented options={STATUSES} value={filter.status ?? 'all'} onChange={(v) => set({ status: v === 'all' ? null : v, value: null })} label="Status" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Cases" value={kpis.total} />
        <Kpi label="Open" value={kpis.open} />
        <Kpi label="Overdue" value={kpis.overdue} tone={kpis.overdue ? 'risk' : undefined} />
        <Kpi label="Closed" value={kpis.closed} />
        <Kpi label="Median days to close" value={kpis.medianDaysToClose === null ? '—' : kpis.medianDaysToClose < 1 ? '<1' : Math.round(kpis.medianDaysToClose)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Breakdown report={report} onDimension={(d) => set({ dimension: d, value: null })} onValue={(v) => set({ value: v === filter.value ? null : v })} />
        <div className="space-y-4">
          <Trend months={report.trend} />
          {report.phaseTimes ? (
            <PhaseTimes rows={report.phaseTimes} />
          ) : (
            <section className="rounded-[2px] border border-dashed border-rule p-5 text-sm text-ink-4">Choose a case type to see the time spent in each phase.</section>
          )}
        </div>
      </div>

      {report.drill && filter.value && (
        <section className="rounded-[2px] border border-rule bg-surface">
          <header className="flex items-center gap-2 border-b border-rule px-5 py-3">
            <h2 className="flex-1 text-sm font-semibold text-ink">
              {report.dimension.name}: {filter.value} <span className="font-normal text-ink-4">· {report.drill.length} case{report.drill.length === 1 ? '' : 's'}</span>
            </h2>
            <button onClick={() => set({ value: null })} aria-label="Clear selection" className="rounded-[2px] p-1 text-ink-4 hover:bg-paper-2 hover:text-ink">
              <X size={14} />
            </button>
          </header>
          <ul className="divide-y divide-rule-soft">
            {report.drill.map((c) => (
              <li key={c.id}>
                <Link href={`/cases/${c.number}`} className="flex items-center gap-4 px-5 py-2.5 hover:bg-paper-2">
                  <span className="w-14 shrink-0 font-mono text-xs text-nw-accent">{c.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{c.title}</span>
                    <span className="text-xs text-ink-4">{c.caseTypeName} · {c.phaseName} · created {formatDate(c.createdAt)}</span>
                  </span>
                  {c.overdue && <span className="inline-flex items-center gap-1 text-xs text-risk-ink"><AlertTriangle size={12} /> Overdue</span>}
                  <Badge variant={c.status === 'open' ? 'warn' : c.status === 'cancelled' ? 'default' : 'ok'}>{c.status === 'preClosed' ? 'Closed early' : c.status[0].toUpperCase() + c.status.slice(1)}</Badge>
                  <ArrowRight size={13} className="text-ink-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Segmented({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex rounded-[2px] border border-rule p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('rounded-[2px] px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent', value === o.id ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-paper-2')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: 'risk' }) {
  return (
    <div className="rounded-[2px] border border-rule bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tone === 'risk' ? 'text-risk-ink' : 'text-ink')}>{value}</p>
    </div>
  )
}

/** One series, horizontal bars from a shared baseline; a bar opens the cases behind it. */
function Breakdown({ report, onDimension, onValue }: { report: Report; onDimension: (key: string) => void; onValue: (v: string) => void }) {
  const rows = report.breakdown
  const max = Math.max(1, ...rows.map((r) => r.count))
  const builtins = report.dimensions.filter((d) => d.kind === 'builtin')
  const properties = report.dimensions.filter((d) => d.kind === 'property')
  return (
    <section className="rounded-[2px] border border-rule bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">Cases by</h2>
        <select
          value={report.dimension.key}
          onChange={(e) => onDimension(e.target.value)}
          aria-label="Dimension"
          className="h-8 max-w-[320px] rounded-[2px] border border-rule bg-surface px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
        >
          <optgroup label="Case">
            {builtins.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
          </optgroup>
          <optgroup label="Properties">
            {properties.map((d) => (
              <option key={d.key} value={d.key}>
                {d.name}{d.caseTypes.length > 1 ? ` — ${d.caseTypes.join(', ')}` : ''}
              </option>
            ))}
          </optgroup>
        </select>
        {report.dimension.caseTypes.length > 1 && <Badge variant="accent">Shared by {report.dimension.caseTypes.length} case types</Badge>}
      </header>
      <div className="px-5 py-4">
        {rows.length ? (
          <ul className="space-y-1.5" aria-label={`Cases by ${report.dimension.name}`}>
            {rows.map((r) => {
              const selected = report.filter.value === r.value
              return (
                <li key={r.value}>
                  <button
                    onClick={() => onValue(r.value)}
                    aria-pressed={selected}
                    title={`${r.value}: ${r.count} case${r.count === 1 ? '' : 's'}, ${r.open} open${r.overdue ? `, ${r.overdue} overdue` : ''}`}
                    className={cn(
                      'group grid w-full grid-cols-[minmax(110px,200px)_1fr] items-center gap-3 rounded-[2px] px-1.5 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
                      selected ? 'bg-accent-tint' : 'hover:bg-paper-2'
                    )}
                  >
                    <span className={cn('truncate text-xs', selected ? 'font-medium text-ink' : 'text-ink-3')}>{r.value}</span>
                    <span className="flex h-5 min-w-0 items-center gap-2">
                      <span className="h-4 rounded-r-[4px] bg-chart-1 transition-opacity group-hover:opacity-80" style={{ width: `${(r.count / max) * 70}%`, minWidth: 6 }} />
                      <span className="text-xs tabular-nums text-ink-2">{r.count}</span>
                      {r.overdue > 0 && (
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] text-risk-ink"><AlertTriangle size={11} /> {r.overdue}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-ink-4">No cases in this period.</p>
        )}
        <p className="mt-3 text-[11px] text-ink-4">Click a bar to list its cases. Multi-choice fields count a case once per value.</p>
      </div>
    </section>
  )
}

/** Created vs closed per month: two series, direct end labels, crosshair tooltip, table view. */
function Trend({ months }: { months: Report['trend'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const W = 520
  const H = 180
  const pad = { l: 28, r: 64, t: 12, b: 24 }
  const max = Math.max(2, ...months.flatMap((m) => [m.created, m.closed]))
  const ticks = [0, Math.ceil(max / 2), max]
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, months.length - 1)
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b)
  const path = (key: 'created' | 'closed') => months.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m[key])}`).join(' ')
  const series = [
    { key: 'created' as const, label: 'Created', color: 'var(--chart-1)' },
    { key: 'closed' as const, label: 'Closed', color: 'var(--chart-2)' },
  ]
  const last = months.length - 1

  return (
    <section className="rounded-[2px] border border-rule bg-surface">
      <header className="flex items-center gap-3 border-b border-rule px-5 py-3">
        <h2 className="flex-1 text-sm font-semibold text-ink">Created and closed per month</h2>
        <div className="flex items-center gap-3 text-xs text-ink-3" aria-hidden>
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
        <button onClick={() => setTable(!table)} aria-pressed={table} title="Show as table" className={cn('rounded-[2px] p-1', table ? 'bg-paper-3 text-ink' : 'text-ink-4 hover:bg-paper-2 hover:text-ink')}>
          <Table2 size={14} />
        </button>
      </header>
      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              {['Month', 'Created', 'Closed'].map((h) => <th key={h} className="mono-meta px-5 py-2 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key} className="border-b border-rule-soft last:border-0">
                <td className="px-5 py-1.5 text-ink-3">{m.label}</td>
                <td className="px-5 py-1.5 tabular-nums text-ink">{m.created}</td>
                <td className="px-5 py-1.5 tabular-nums text-ink">{m.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative px-3 py-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Created and closed per month: ${months.map((m) => `${m.label} ${m.created} created, ${m.closed} closed`).join('; ')}`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule-soft)" strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="var(--ink-4)">{t}</text>
              </g>
            ))}
            {months.map((m, i) => (
              <text key={m.key} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ink-4)">{m.label}</text>
            ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="2 3" />}
            {series.map((s) => (
              <g key={s.key}>
                <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {months.map((m, i) => (
                  <circle key={m.key} cx={x(i)} cy={y(m[s.key])} r={hover === i ? 5 : 4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
                <text x={x(last) + 10} y={y(months[last][s.key]) + (s.key === 'created' ? -4 : 12)} fontSize={11} fill="var(--ink-2)">
                  {s.label} {months[last][s.key]}
                </text>
              </g>
            ))}
            {months.map((m, i) => (
              <rect
                key={m.key}
                x={x(i) - (W - pad.l - pad.r) / Math.max(1, months.length - 1) / 2}
                y={0}
                width={(W - pad.l - pad.r) / Math.max(1, months.length - 1)}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 rounded-[2px] border border-rule bg-surface px-2.5 py-1.5 text-xs shadow-[0_6px_16px_-8px_rgba(0,0,0,0.3)]"
              style={{ left: `calc(${(x(hover) / W) * 100}% + ${hover > months.length / 2 ? '-120px' : '12px'})` }}
            >
              <p className="font-medium text-ink">{months[hover].label}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center gap-1.5 text-ink-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label} <span className="tabular-nums text-ink">{months[hover][s.key]}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/** Median days in each phase against the phase's lead time target. */
function PhaseTimes({ rows }: { rows: NonNullable<Report['phaseTimes']> }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.median ?? 0, r.deadlineDays ?? 0)))
  return (
    <section className="rounded-[2px] border border-rule bg-surface">
      <header className="flex items-center gap-3 border-b border-rule px-5 py-3">
        <h2 className="flex-1 text-sm font-semibold text-ink">Time in phase</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-4" aria-hidden>
          <span className="h-3 w-0.5 bg-ink-3" /> lead time target
        </span>
      </header>
      <ul className="space-y-2.5 px-5 py-4">
        {rows.map((r) => (
          <li
            key={r.phase}
            className="grid grid-cols-[minmax(110px,170px)_1fr_48px] items-center gap-3"
            title={r.count ? `${r.phase}: median ${r.median!.toFixed(1)} days, average ${r.average!.toFixed(1)} days over ${r.count} completed visit${r.count === 1 ? '' : 's'}` : `${r.phase}: no completed visits yet`}
          >
            <span className="truncate text-xs text-ink-3">{r.phase}</span>
            <span className="relative flex h-5 items-center">
              {r.median !== null && (
                <span className={cn('h-4 rounded-r-[4px]', r.deadlineDays && r.median > r.deadlineDays ? 'bg-chart-2' : 'bg-chart-1')} style={{ width: `${(r.median / max) * 100}%`, minWidth: 6 }} />
              )}
              {r.deadlineDays && <span className="absolute top-0 h-5 w-0.5 bg-ink-3" style={{ left: `calc(${(r.deadlineDays / max) * 100}% - 1px)` }} />}
            </span>
            <span className="text-right text-xs tabular-nums text-ink-2">
              {r.median === null ? '—' : `${r.median < 1 ? '<1' : r.median.toFixed(r.median < 10 ? 1 : 0)} d`}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-5 pb-3 text-[11px] text-ink-4">Median of completed visits; orange bars are over the phase&apos;s lead time target.</p>
    </section>
  )
}
