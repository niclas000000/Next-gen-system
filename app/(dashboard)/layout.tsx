import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { DashboardBackground } from '@/components/layout/DashboardBackground'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={<div className="w-16 shrink-0 bg-slate-900" />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <DashboardBackground>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </DashboardBackground>
      </div>
    </div>
  )
}
