'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronsLeft, ClipboardList, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useShell } from './AppShell'
import { ADMIN_LINKS, DESIGN_LINKS, VIEW_ICONS, linkActive, type ModuleId, type NavLink } from './nav'

interface SystemView {
  id: string
  name: string
  section: string
  icon: string
  filters: Record<string, string>
  order: number
}

interface CaseTypeRef {
  id: string
  name: string
  prefix: string
  status: string
}

const TITLES: Partial<Record<ModuleId, string>> = { cases: 'Cases', documents: 'Documents', design: 'Design', admin: 'Admin' }

export const hasPanel = (m: ModuleId) => m in TITLES

const hrefWith = (base: string, filters: Record<string, string>) => {
  const p = new URLSearchParams(filters)
  return p.toString() ? `${base}?${p}` : base
}

export function ContextPanel({ module, inDrawer }: { module: ModuleId; inDrawer?: boolean }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const { togglePanel } = useShell()
  const [views, setViews] = useState<SystemView[]>([])
  const [caseTypes, setCaseTypes] = useState<CaseTypeRef[]>([])

  useEffect(() => {
    if (module !== 'cases' && module !== 'documents') return
    fetch(`/api/system-views?section=${module}`)
      .then((r) => (r.ok ? r.json() : { views: [] }))
      .then((d: { views: SystemView[] }) => setViews(d.views ?? []))
      .catch(() => {})
    if (module === 'cases')
      fetch('/api/case-types')
        .then((r) => (r.ok ? r.json() : { caseTypes: [] }))
        .then((d: { caseTypes: CaseTypeRef[] }) => setCaseTypes(d.caseTypes.filter((t) => t.status === 'published')))
        .catch(() => {})
  }, [module])

  const link = (l: NavLink) => {
    const active = linkActive(l.href, pathname, search)
    const Icon = l.icon
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[2px] px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
          active ? 'bg-accent-tint font-medium text-nw-accent' : 'text-ink-3 hover:bg-paper-3 hover:text-ink'
        )}
      >
        <Icon size={15} className="shrink-0" />
        <span className="truncate">{l.label}</span>
      </Link>
    )
  }

  const viewLinks = (base: string): NavLink[] =>
    views.map((v) => ({ label: v.name, href: hrefWith(base, v.filters), icon: VIEW_ICONS[v.icon] ?? List }))

  const group = (title: string, links: NavLink[]) =>
    links.length > 0 && (
      <div key={title} className="space-y-0.5">
        <p className="mono-meta px-2.5 pb-1 pt-3 text-[10px]">{title}</p>
        {links.map(link)}
      </div>
    )

  return (
    <aside
      aria-label={`${TITLES[module]} navigation`}
      className={cn('flex h-full w-60 shrink-0 flex-col border-r border-rule bg-paper-2', inDrawer && 'w-64')}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule pl-4 pr-2">
        <h2 className="font-display text-[15px] font-semibold text-ink">{TITLES[module]}</h2>
        {!inDrawer && (
          <button
            onClick={togglePanel}
            aria-label="Collapse panel"
            title="Collapse panel"
            className="rounded-[2px] p-1.5 text-ink-4 hover:bg-paper-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
          >
            <ChevronsLeft size={15} />
          </button>
        )}
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-4 pt-1">
        {module === 'cases' && (
          <>
            {group('Views', viewLinks('/cases'))}
            {group(
              'Case types',
              caseTypes.map((t) => ({ label: t.name, href: `/cases?caseTypeId=${t.id}`, icon: ClipboardList }))
            )}
          </>
        )}
        {module === 'documents' && (
          <>
            {group('Views', viewLinks('/documents'))}
          </>
        )}
        {module === 'design' && group('Configure', DESIGN_LINKS)}
        {module === 'admin' && group('Administration', ADMIN_LINKS)}
      </div>
    </aside>
  )
}
