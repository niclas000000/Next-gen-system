'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Eye } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { NewCaseDialog } from '@/components/cases/NewCaseDialog'
import { Rail } from './Rail'
import { ContextPanel, hasPanel } from './ContextPanel'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { moduleFor } from './nav'

export interface Me {
  user: { id: string; name: string; email: string; role: string; viewAsBy?: { id: string; name: string } }
  demo: boolean
  switchable: { id: string; name: string; email: string; role: string }[]
}

interface Shell {
  me: Me | null
  isAdmin: boolean
  workCount: number
  panelOpen: boolean
  togglePanel: () => void
  openPalette: () => void
  openNewCase: () => void
  openMobileNav: () => void
}

const ShellContext = createContext<Shell | null>(null)

export function useShell(): Shell {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used inside AppShell')
  return ctx
}

const PANEL_KEY = 'nexus-panel'

function readPanel(): boolean {
  try {
    return localStorage.getItem(PANEL_KEY) !== 'collapsed'
  } catch {
    return true
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)
  const [workCount, setWorkCount] = useState(0)
  const [panelOpen, setPanelOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setPanelOpen(readPanel()), [])

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => {})
  }, [])

  // Inbox count follows navigation (cases are moved on the case page)
  useEffect(() => {
    fetch('/api/inbox')
      .then((r) => (r.ok ? r.json() : { cases: [] }))
      .then((d: { cases: unknown[] }) => setWorkCount(d.cases.length))
      .catch(() => {})
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      try {
        localStorage.setItem(PANEL_KEY, open ? 'collapsed' : 'open')
      } catch {}
      return !open
    })
  }, [])

  const module = moduleFor(pathname)
  const shell: Shell = {
    me,
    isAdmin: me?.user.role === 'admin',
    workCount,
    panelOpen,
    togglePanel,
    openPalette: () => setPaletteOpen(true),
    openNewCase: () => setNewCaseOpen(true),
    openMobileNav: () => setMobileOpen(true),
  }

  return (
    <ShellContext.Provider value={shell}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:rounded-[2px] focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="flex h-screen overflow-hidden bg-paper">
        <div className="hidden md:flex">
          <Rail />
          {hasPanel(module) && panelOpen && <ContextPanel module={module} />}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {me?.user.viewAsBy && <ViewAsBanner name={me.user.name} by={me.user.viewAsBy.name} />}
          <TopBar module={module} />
          <main id="main" className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-auto max-w-[90vw] gap-0 border-r border-rule bg-paper-2 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Rail />
          {hasPanel(module) && <ContextPanel module={module} inDrawer />}
        </SheetContent>
      </Sheet>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NewCaseDialog open={newCaseOpen} onOpenChange={setNewCaseOpen} />
    </ShellContext.Provider>
  )
}

function ViewAsBanner({ name, by }: { name: string; by: string }) {
  const back = async () => {
    await fetch('/api/demo/view-as', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: null }) })
    window.location.reload()
  }
  return (
    <div className="flex items-center gap-2 bg-nw-accent px-4 py-1.5 text-xs text-on-fill">
      <Eye size={13} />
      <span className="flex-1">
        Viewing Nexus as <strong>{name}</strong> — everything you do is done as {name.split(' ')[0]}.
      </span>
      <button onClick={back} className="rounded-[2px] border border-white/40 px-2 py-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        Back to {by}
      </button>
    </div>
  )
}
