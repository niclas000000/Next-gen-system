import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSessionUser } from '@/lib/auth/session'
import { CaseError, getCaseDetail } from '@/lib/cases/service'
import { CaseView } from '@/components/cases/CaseView'

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params
  return { title: `${number.toUpperCase()} · Nexus` }
}

export default async function CasePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')
  try {
    const detail = await getCaseDetail(number, user.id)
    return <CaseView detail={detail} />
  } catch (e) {
    if (e instanceof CaseError && e.status === 404) notFound()
    throw e
  }
}
