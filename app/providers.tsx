'use client'

import { SessionProvider } from 'next-auth/react'
import { SettingsProvider } from '@/lib/settings-context'
import { ToastProvider } from '@/components/ui/toast'
import { ConfirmHost } from '@/components/ui/confirm'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <ToastProvider>
          {children}
          <ConfirmHost />
        </ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
