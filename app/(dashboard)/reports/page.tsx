import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { buildReport } from '@/lib/reports/service'
import { ReportView } from '@/components/reports/ReportView'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const p = await searchParams
  const report = await buildReport({
    caseTypeId: p.caseTypeId || undefined,
    status: p.status === 'open' || p.status === 'closed' ? p.status : 'all',
    days: p.days !== undefined ? Number(p.days) : 90,
    dimension: p.dimension,
    value: p.value,
  })
  return <ReportView report={report} />
}
