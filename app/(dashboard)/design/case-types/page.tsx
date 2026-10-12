import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { prisma } from '@/lib/db/client'
import { getSessionUser } from '@/lib/auth/session'
import { CaseTypeConfigSchema } from '@/lib/case-config/schema'
import { validateCaseType } from '@/lib/case-config/validate'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/components/cases/format'
import { NewCaseTypeButton } from '@/components/design/NewCaseTypeDialog'

export default async function CaseTypesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/')

  const types = await prisma.caseType.findMany({
    orderBy: { name: 'asc' },
    include: {
      versions: { orderBy: { version: 'desc' }, take: 1, select: { version: true, publishedAt: true, config: true } },
      _count: { select: { cases: true } },
    },
  })

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-meta">Design</p>
          <h1 className="font-display text-2xl font-semibold text-ink">Case types</h1>
          <p className="mt-1 text-sm text-ink-3">
            Phases, fields, roles and rules for each kind of case. Import configurations designed in CANEA Blueprint.
          </p>
        </div>
        <NewCaseTypeButton />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {types.map((t) => {
          const draft = CaseTypeConfigSchema.parse(t.draft)
          const live = t.versions[0]
          const changed = live && JSON.stringify(CaseTypeConfigSchema.parse(live.config)) !== JSON.stringify(draft)
          const errors = validateCaseType(draft).filter((i) => i.severity === 'error').length
          return (
            <Link
              key={t.id}
              href={`/design/case-types/${t.id}`}
              className="group rounded-[2px] border border-rule bg-surface p-5 hover:border-nw-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] bg-accent-tint text-nw-accent">
                  <ClipboardList size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-ink">{draft.caseTypeName}</h2>
                    <span className="font-mono text-xs text-nw-accent">{draft.prefix}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-3">{draft.description || 'No description'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-4">
                {live ? (
                  <Badge variant={changed ? 'warn' : 'ok'}>{changed ? `Draft · v${live.version} live` : `v${live.version} live`}</Badge>
                ) : (
                  <Badge>Never published</Badge>
                )}
                {errors > 0 && <Badge variant="risk">{errors} error{errors > 1 ? 's' : ''}</Badge>}
                <span>
                  {draft.phases.length} phases · {draft.fields.length} fields · {draft.roles.length} roles · {t._count.cases} cases
                </span>
                {live && <span className="ml-auto">Published {formatDate(live.publishedAt)}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
                {draft.phases.map((p) => (
                  <span key={p.id} className="truncate rounded-full bg-paper-2 px-2 py-0.5 text-[11px] text-ink-3">{p.name}</span>
                ))}
              </div>
            </Link>
          )
        })}
        {!types.length && <p className="rounded-[2px] border border-dashed border-rule p-8 text-center text-sm text-ink-4">No case types yet.</p>}
      </div>
    </div>
  )
}
