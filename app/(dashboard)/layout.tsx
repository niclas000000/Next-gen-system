'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { IconRail } from '@/components/layout/IconRail'
import { TopBar } from '@/components/layout/TopBar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { useSettings } from '@/lib/settings-context'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navMode = settings.navMode ?? 'v1'

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--paper)' }}>
      {navMode === 'v1' ? (
        <Suspense fallback={<div className="w-56 shrink-0" style={{ background: 'var(--paper-2)' }} />}>
          <Sidebar />
        </Suspense>
      ) : (
        <IconRail />
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Suspense fallback={<div className="h-14 shrink-0" style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }} />}>
          <TopBar />
        </Suspense>
        <DashboardBackground>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </DashboardBackground>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen" style={{ background: 'var(--paper)' }} />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}
