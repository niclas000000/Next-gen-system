'use client'

import { SessionProvider } from 'next-auth/react'
import { SettingsProvider } from '@/lib/settings-context'
import { ToastProvider } from '@/components/ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <ToastProvider>{children}</ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
