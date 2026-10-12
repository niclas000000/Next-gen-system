import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { prisma } from '@/lib/db/client'
import { getSessionUser } from '@/lib/auth/session'
import { inbox } from '@/lib/cases/service'
import { CaseTypeConfigSchema } from '@/lib/case-config/schema'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/components/cases/format'
import { cn } from '@/lib/utils'

const DAY = 86_400_000

const EVENT_TEXT: Record<string, string> = {
  created: 'registered',
  forward: 'sent forward',
  backward: 'sent back',
  preEnd: 'closed early',
  signed: 'signed',
  taken: 'took',
}

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const now = new Date()

  const [work, openCases, closedRecent, caseTypes, events, documents] = await Promise.all([
    inbox(user.id),
    prisma.case.findMany({ where: { status: 'open' }, select: { caseTypeId: true, phaseId: true, phaseDueAt: true } }),
    prisma.case.findMany({
      where: { status: { in: ['closed', 'preClosed'] }, closedAt: { gte: new Date(now.getTime() - 30 * DAY) } },
      select: { createdAt: true, closedAt: true },
    }),
    prisma.caseType.findMany({
      where: { status: 'published' },
      orderBy: { name: 'asc' },
      include: { versions: { orderBy: { version: 'desc' }, take: 1, select: { config: true } } },
    }),
    prisma.caseEvent.findMany({
      where: { type: { in: Object.keys(EVENT_TEXT) } },
      orderBy: { at: 'desc' },
      take: 8,
      include: { actor: { select: { name: true } }, case: { select: { number: true, title: true } } },
    }),
    prisma.document.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, title: true, status: true, updatedAt: true } }),
  ])

  const mine = work.filter((c) => !c.inGroupInbox)
  const group = work.filter((c) => c.inGroupInbox)
  const myOverdue = mine.filter((c) => c.phaseDueAt && c.phaseDueAt < now).length
  const overdue = openCases.filter((c) => c.phaseDueAt && c.phaseDueAt < now).length
  const leadTimes = closedRecent.map((c) => (c.closedAt!.getTime() - c.createdAt.getTime()) / DAY).sort((a, b) => a - b)
  const medianLead = leadTimes.length ? leadTimes[Math.floor(leadTimes.length / 2)] : null

  const byPhase = caseTypes.map((t) => {
    const config = CaseTypeConfigSchema.parse(t.versions[0]?.config ?? { caseTypeName: t.name })
    const open = openCases.filter((c) => c.caseTypeId === t.id)
    return {
      id: t.id,
      name: t.name,
      total: open.length,
      phases: config.phases.map((p) => ({
        name: p.name,
        count: open.filter((c) => c.phaseId === p.id).length,
        overdue: open.filter((c) => c.phaseId === p.id && c.phaseDueAt && c.phaseDueAt < now).length,
      })),
    }
  })

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <p className="mono-meta">{formatDate(now)}</p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {greeting}, {user.name.split(' ')[0]}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        {/* Hero: what is waiting for me */}
        <Link
          href="/tasks"
          className="group flex flex-col justify-between rounded-[2px] border border-rule bg-surface p-5 hover:border-nw-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
        >
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <Inbox size={15} className="text-nw-accent" /> Waiting for you
          </div>
          <div className="mt-3 flex items-end gap-4">
            <span className="text-[56px] font-semibold leading-none text-ink tabular-nums">{mine.length}</span>
            <div className="pb-1.5 text-sm text-ink-3">
              {myOverdue > 0 && (
                <p className="flex items-center gap-1 font-medium text-risk-ink"><AlertTriangle size={13} /> {myOverdue} overdue</p>
              )}
              {group.length > 0 && <p>{group.length} in your group inboxes</p>}
              {!mine.length && !group.length && <p className="flex items-center gap-1"><CheckCircle2 size={13} className="text-ok" /> All caught up</p>}
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-nw-accent">
            Open My work <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Open cases" value={openCases.length} href="/cases" />
          <Stat label="Overdue phases" value={overdue} href="/cases" tone={overdue ? 'risk' : undefined} />
          <Stat
            label="Closed, last 30 days"
            value={closedRecent.length}
            hint={medianLead !== null ? `Median ${medianLead < 1 ? '<1' : Math.round(medianLead)} days to close` : undefined}
            href="/cases?status=closed"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {byPhase.map((t) => (
            <PhaseChart key={t.id} {...t} />
          ))}

          <section className="rounded-[2px] border border-rule bg-surface">
            <header className="flex items-center justify-between border-b border-rule px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">Next up for you</h2>
              <Link href="/tasks" className="text-xs text-nw-accent hover:underline">See all</Link>
            </header>
            {mine.length ? (
              <ul className="divide-y divide-rule-soft">
                {mine.slice(0, 5).map((c) => {
                  const late = c.phaseDueAt && c.phaseDueAt < now
                  return (
                    <li key={c.id}>
                      <Link href={`/cases/${c.number}`} className="flex items-center gap-4 px-5 py-3 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent">
                        <span className="w-12 shrink-0 font-mono text-xs text-nw-accent">{c.number}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{c.title}</span>
                          <span className="text-xs text-ink-4">{c.phaseName}</span>
                        </span>
                        {c.phaseDueAt && (
                          <span className={cn('text-xs whitespace-nowrap', late ? 'font-medium text-risk-ink' : 'text-ink-4')}>
                            {late ? 'Overdue' : 'Due'} {formatDate(c.phaseDueAt)}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-ink-4">Nothing assigned to you right now.</p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[2px] border border-rule bg-surface">
            <h2 className="border-b border-rule px-5 py-3 text-sm font-semibold text-ink">Recent activity</h2>
            <ul className="divide-y divide-rule-soft">
              {events.map((e) => (
                <li key={e.id} className="px-5 py-2.5">
                  <Link href={`/cases/${e.case.number}`} className="block text-[13px] leading-snug text-ink-3 hover:text-ink">
                    <span className="font-medium text-ink">{e.actor.name}</span> {EVENT_TEXT[e.type]}{' '}
                    <span className="font-mono text-xs text-nw-accent">{e.case.number}</span> {e.case.title}
                  </Link>
                  <p className="text-[11px] text-ink-4">{formatDistanceToNow(e.at, { addSuffix: true })}</p>
                </li>
              ))}
              {!events.length && <li className="px-5 py-6 text-sm text-ink-4">No activity yet.</li>}
            </ul>
          </section>

          <section className="rounded-[2px] border border-rule bg-surface">
            <header className="flex items-center justify-between border-b border-rule px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">Recently updated documents</h2>
              <Link href="/documents" className="text-xs text-nw-accent hover:underline">Library</Link>
            </header>
            <ul className="divide-y divide-rule-soft">
              {documents.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper-2">
                    <FileText size={14} className="shrink-0 text-ink-4" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{d.title}</span>
                    <Badge variant={d.status === 'published' ? 'ok' : d.status === 'pending' ? 'warn' : 'default'}>{d.status}</Badge>
                  </Link>
                </li>
              ))}
              {!documents.length && <li className="px-5 py-6 text-sm text-ink-4">No documents yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, hint, href, tone }: { label: string; value: number; hint?: string; href: string; tone?: 'risk' }) {
  return (
    <Link href={href} className="rounded-[2px] border border-rule bg-surface p-4 hover:border-nw-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent">
      <p className="text-xs text-ink-3">{label}</p>
      <p className={cn('mt-2 text-3xl font-semibold tabular-nums', tone === 'risk' ? 'text-risk-ink' : 'text-ink')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-4">{hint}</p>}
    </Link>
  )
}

/** Open cases per phase: one series, horizontal bars from a shared baseline, value at the tip. */
function PhaseChart({ id, name, total, phases }: { id: string; name: string; total: number; phases: { name: string; count: number; overdue: number }[] }) {
  const max = Math.max(1, ...phases.map((p) => p.count))
  return (
    <section className="rounded-[2px] border border-rule bg-surface">
      <header className="flex items-baseline justify-between border-b border-rule px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">
          Open {name.toLowerCase()} cases by phase
        </h2>
        <Link href={`/cases?caseTypeId=${id}`} className="text-xs text-nw-accent hover:underline">{total} open</Link>
      </header>
      <div className="space-y-2.5 px-5 py-4" role="img" aria-label={`Open ${name} cases by phase: ${phases.map((p) => `${p.name} ${p.count}`).join(', ')}`}>
        {phases.map((p) => (
          <div key={p.name} className="group relative grid grid-cols-[minmax(120px,190px)_1fr] items-center gap-3">
            <span className="truncate text-xs text-ink-3">{p.name}</span>
            <div className="flex h-6 min-w-0 items-center gap-2">
              {p.count > 0 && (
                <span
                  className="h-4 max-w-full rounded-r-[4px] bg-chart-1 transition-opacity group-hover:opacity-80"
                  style={{ width: `${(p.count / max) * 72}%`, minWidth: 6 }}
                />
              )}
              <span className="text-xs tabular-nums text-ink-2">{p.count}</span>
              {p.overdue > 0 && (
                <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] text-risk-ink">
                  <AlertTriangle size={11} /> {p.overdue} overdue
                </span>
              )}
            </div>
            <span className="pointer-events-none absolute left-[200px] top-[-26px] z-10 hidden whitespace-nowrap rounded-[2px] bg-ink px-2 py-1 text-[11px] text-paper group-hover:block">
              {p.name}: {p.count} open{p.overdue ? `, ${p.overdue} overdue` : ''}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
