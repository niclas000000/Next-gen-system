import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, FileCheck, Inbox, UserRound } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { prisma } from '@/lib/db/client'
import { getSessionUser } from '@/lib/auth/session'
import { inbox } from '@/lib/cases/service'
import { formatDate } from '@/components/cases/format'
import { cn } from '@/lib/utils'

export default async function MyWorkPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [cases, approvals] = await Promise.all([
    inbox(user.id),
    prisma.documentApproval.findMany({
      where: { status: 'pending', assignedTo: { has: user.id } },
      orderBy: { startedAt: 'asc' },
      include: { document: { select: { id: true, title: true } } },
    }),
  ])
  const mine = cases.filter((c) => !c.inGroupInbox)
  const group = cases.filter((c) => c.inGroupInbox)
  const overdue = mine.filter((c) => c.phaseDueAt && new Date(c.phaseDueAt) < new Date()).length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="mono-meta">My work</p>
        <h1 className="text-2xl font-semibold text-ink font-display">
          {mine.length + group.length + approvals.length ? 'Waiting for you' : 'You are all caught up'}
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          {mine.length} case{mine.length === 1 ? '' : 's'} to work on
          {overdue > 0 && <span className="text-risk-ink"> · {overdue} overdue</span>}
          {group.length > 0 && ` · ${group.length} in your group inboxes`}
          {approvals.length > 0 && ` · ${approvals.length} document approval${approvals.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <Section icon={<UserRound size={15} />} title="Assigned to you" empty="Nothing assigned to you right now.">
        {mine.map((c) => <CaseItem key={c.id} c={c} />)}
      </Section>

      <Section icon={<Inbox size={15} />} title="Group inboxes" empty="Your groups' inboxes are empty." hint="Open a case and choose Take case to make it yours.">
        {group.map((c) => <CaseItem key={c.id} c={c} />)}
      </Section>

      <Section icon={<FileCheck size={15} />} title="Document approvals" empty="No documents waiting for your approval.">
        {approvals.map((a) => (
          <Link key={a.id} href={`/documents/${a.document.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent">
            <FileCheck size={15} className="text-ink-4 shrink-0" />
            <span className="flex-1 truncate text-sm text-ink">{a.document.title}</span>
            <span className="text-xs text-ink-4">{a.phase} · since {formatDate(a.startedAt)}</span>
            <ArrowRight size={14} className="text-ink-4" />
          </Link>
        ))}
      </Section>
    </div>
  )
}

function Section({ icon, title, empty, hint, children }: { icon: React.ReactNode; title: string; empty: string; hint?: string; children: React.ReactNode[] }) {
  return (
    <section className="rounded-[2px] border border-rule bg-surface">
      <header className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <span className="text-ink-4">{icon}</span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="rounded-full bg-paper-3 px-1.5 text-[11px] text-ink-3">{children.length}</span>
        {hint && children.length > 0 && <span className="ml-auto text-xs text-ink-4">{hint}</span>}
      </header>
      {children.length ? (
        <div className="divide-y divide-rule-soft">{children}</div>
      ) : (
        <p className="flex items-center gap-2 px-4 py-5 text-sm text-ink-4"><CheckCircle2 size={14} className="text-ok" /> {empty}</p>
      )}
    </section>
  )
}

function CaseItem({ c }: { c: Awaited<ReturnType<typeof inbox>>[number] }) {
  const overdue = c.phaseDueAt && new Date(c.phaseDueAt) < new Date()
  return (
    <Link href={`/cases/${c.number}`} className="flex items-center gap-4 px-4 py-3 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent">
      <span className="w-14 shrink-0 font-mono text-xs text-nw-accent">{c.number}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{c.title}</span>
        <span className="text-xs text-ink-4">{c.caseTypeName} · {c.phaseName} · waiting {formatDistanceToNow(new Date(c.phaseEnteredAt))}</span>
      </span>
      {c.phaseDueAt && (
        <span className={cn('inline-flex items-center gap-1 text-xs whitespace-nowrap', overdue ? 'font-medium text-risk-ink' : 'text-ink-4')}>
          {overdue && <AlertTriangle size={12} />}
          {overdue ? 'Overdue ' : 'Due '}
          {formatDate(c.phaseDueAt)}
        </span>
      )}
      <ArrowRight size={14} className="text-ink-4 shrink-0" />
    </Link>
  )
}
