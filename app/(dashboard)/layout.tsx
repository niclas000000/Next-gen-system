import { Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // AppShell's panel reads search params (active views), which needs a Suspense boundary
    <Suspense fallback={<div className="flex h-screen bg-paper" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}
