import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getSessionUser } from '@/lib/auth/session'
import { listCases } from '@/lib/cases/service'
import { CaseList } from '@/components/cases/CaseList'
import { NewCaseButton } from '@/components/cases/NewCaseDialog'

// System views and old links use the previous status names
const LEGACY_STATUS: Record<string, string> = { running: 'open', completed: 'closed' }

export default async function CasesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const p = await searchParams
  const status = LEGACY_STATUS[p.status ?? ''] ?? p.status ?? 'open'

  const [result, caseTypes] = await Promise.all([
    listCases(
      {
        caseTypeId: p.caseTypeId,
        status: status === 'all' ? undefined : status,
        mine: p.view === 'mine' ? '1' : undefined,
        q: p.q,
        page: Number(p.page ?? 1),
      },
      user.id
    ),
    prisma.caseType.findMany({ where: { status: 'published' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])
  const typeName = caseTypes.find((t) => t.id === p.caseTypeId)?.name
  const STATUS_TITLE: Record<string, string> = { open: 'Open cases', closed: 'Closed cases', cancelled: 'Cancelled cases', all: 'All cases' }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-meta">Cases</p>
          <h1 className="text-2xl font-semibold text-ink font-display">{typeName ?? (p.view === 'mine' ? 'My cases' : STATUS_TITLE[status] ?? 'Cases')}</h1>
        </div>
        <NewCaseButton caseTypeId={p.caseTypeId} />
      </div>
      <CaseList result={result} caseTypes={caseTypes} status={status} />
    </div>
  )
}
