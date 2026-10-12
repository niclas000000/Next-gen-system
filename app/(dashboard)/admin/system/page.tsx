import Link from 'next/link'
import { prisma } from '@/lib/db/client'
import { Badge } from '@/components/ui/badge'
import { demoMode } from '@/lib/auth/session'
import { formatDistanceToNow } from 'date-fns'

const STATUS: Record<string, { label: string; variant: 'warn' | 'ok' | 'default' }> = {
  open: { label: 'Open', variant: 'warn' },
  closed: { label: 'Closed', variant: 'ok' },
  preClosed: { label: 'Closed early', variant: 'ok' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

export default async function AdminSystemPage() {
  const [userCount, caseTypeCount, caseStats, documentCount, recent] = await Promise.all([
    prisma.user.count({ where: { id: { not: 'system-placeholder-user' }, active: true } }),
    prisma.caseType.count({ where: { status: 'published' } }),
    prisma.case.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.document.count(),
    prisma.case.findMany({ orderBy: { updatedAt: 'desc' }, take: 8, include: { caseType: { select: { name: true } } } }),
  ])
  const byStatus = Object.fromEntries(caseStats.map((s) => [s.status, s._count.status]))
  const total = caseStats.reduce((a, s) => a + s._count.status, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="mono-meta">Admin</p>
        <h1 className="font-display text-2xl font-semibold text-ink">System</h1>
        <p className="mt-1 text-sm text-ink-3">Platform overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Active users', userCount],
          ['Published case types', caseTypeCount],
          ['Cases', total],
          ['Documents', documentCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[2px] border border-rule bg-surface p-4">
            <p className="text-xs text-ink-3">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[2px] border border-rule bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-rule px-5 py-3">
          <h2 className="mr-auto text-sm font-semibold text-ink">Recently updated cases</h2>
          {Object.entries(STATUS).map(([k, s]) => (
            <Badge key={k} variant={s.variant}>{s.label} {byStatus[k] ?? 0}</Badge>
          ))}
        </header>
        <ul className="divide-y divide-rule-soft">
          {recent.map((c) => (
            <li key={c.id}>
              <Link href={`/cases/${c.number}`} className="flex items-center gap-4 px-5 py-2.5 text-sm hover:bg-paper-2">
                <span className="w-14 font-mono text-xs text-nw-accent">{c.number}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{c.title}</span>
                <span className="hidden text-xs text-ink-4 md:inline">{c.caseType.name}</span>
                <Badge variant={STATUS[c.status]?.variant ?? 'default'}>{STATUS[c.status]?.label ?? c.status}</Badge>
                <span className="w-28 text-right text-xs text-ink-4">{formatDistanceToNow(c.updatedAt, { addSuffix: true })}</span>
              </Link>
            </li>
          ))}
          {!recent.length && <li className="px-5 py-8 text-center text-sm text-ink-4">No cases yet.</li>}
        </ul>
      </section>

      <section className="rounded-[2px] border border-rule bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Environment</h2>
        <dl className="space-y-2 text-sm">
          {[
            ['Platform', 'Nexus 0.1 (demo)'],
            ['Framework', 'Next.js 16 · App Router'],
            ['Database', 'PostgreSQL · Prisma'],
            ['Environment', process.env.NODE_ENV ?? 'development'],
            ['Demo mode', demoMode() ? 'On — admins can view as other users' : 'Off'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <dt className="w-32 shrink-0 text-ink-4">{label}</dt>
              <dd className="font-mono text-xs leading-5 text-ink-3">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
