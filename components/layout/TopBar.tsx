'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, ChevronsRight, Menu, Search } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { useShell } from './AppShell'
import { hasPanel } from './ContextPanel'
import type { ModuleId } from './nav'

const LABELS: Record<string, string> = {
  tasks: 'My work',
  cases: 'Cases',
  documents: 'Documents',
  processes: 'Processes',
  design: 'Design',
  'case-types': 'Case types',
  'document-types': 'Document types',
  'approval-flows': 'Approval flows',
  views: 'Views',
  admin: 'Admin',
  users: 'Users',
  settings: 'Groups',
  register: 'Labels',
  'lookup-tables': 'Lookup tables',
  roles: 'Roles',
  appearance: 'Appearance',
  system: 'System',
  notifications: 'Notifications',
}

/** What to call an id segment, by the segment before it. */
const ITEM_LABELS: Record<string, string> = {
  documents: 'Document',
  processes: 'Process',
  'case-types': 'Editor',
  'document-types': 'Document type',
  'lookup-tables': 'Table',
}

/** Sections without a page of their own link to their first page. */
const SECTION_HREF: Record<string, string> = { design: '/design/case-types', admin: '/admin/users' }

function crumbs(pathname: string): { label: string; href: string; mono?: boolean }[] {
  const segs = pathname.split('/').filter(Boolean)
  if (!segs.length) return [{ label: 'Home', href: '/' }]
  return segs.map((seg, i) => {
    const href = SECTION_HREF[seg] && i === 0 ? SECTION_HREF[seg] : `/${segs.slice(0, i + 1).join('/')}`
    if (LABELS[seg]) return { label: LABELS[seg], href }
    const parent = segs[i - 1]
    if (parent === 'cases') return { label: decodeURIComponent(seg).toUpperCase(), href, mono: true }
    return { label: ITEM_LABELS[parent] ?? decodeURIComponent(seg), href }
  })
}

export function TopBar({ module }: { module: ModuleId }) {
  const pathname = usePathname()
  const { openPalette, openMobileNav, panelOpen, togglePanel } = useShell()
  const items = crumbs(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-paper px-4 md:px-5">
      <button
        onClick={openMobileNav}
        aria-label="Open navigation"
        className="rounded-[2px] p-1.5 text-ink-3 hover:bg-paper-2 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
      >
        <Menu size={18} />
      </button>
      {hasPanel(module) && !panelOpen && (
        <button
          onClick={togglePanel}
          aria-label="Show panel"
          title="Show panel"
          className="hidden rounded-[2px] p-1.5 text-ink-4 hover:bg-paper-2 hover:text-ink md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
        >
          <ChevronsRight size={15} />
        </button>
      )}

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-sm">
          {items.map((c, i) => {
            const last = i === items.length - 1
            return (
              <li key={i} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="shrink-0 text-ink-4" />}
                {last ? (
                  <span aria-current="page" className={`truncate font-medium text-ink ${c.mono ? 'font-mono text-[13px]' : ''}`}>
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="truncate rounded-[2px] text-ink-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent">
                    {c.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <NotificationBell />

      <button
        onClick={openPalette}
        className="hidden h-8 min-w-[220px] items-center gap-2 rounded-[2px] border border-rule bg-surface px-3 text-sm text-ink-4 transition-colors hover:border-ink-4 md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Search cases, documents…</span>
        <kbd className="rounded-[2px] bg-paper-3 px-1 font-mono text-[10px] text-ink-4">Ctrl K</kbd>
      </button>
      <button onClick={openPalette} aria-label="Search" className="rounded-[2px] p-1.5 text-ink-3 hover:bg-paper-2 md:hidden">
        <Search size={17} />
      </button>
    </header>
  )
}
