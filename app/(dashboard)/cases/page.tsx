import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CasesClient } from './CasesClient'

export default async function CasesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const userId = (session.user as { id?: string }).id ?? ''
  return (
    <div className="-m-6 h-[calc(100%+3rem)] flex flex-col">
      <Suspense>
        <CasesClient userId={userId} />
      </Suspense>
    </div>
  )
}
