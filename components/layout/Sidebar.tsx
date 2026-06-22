'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, FileText, GitBranch, Workflow, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut,
  Users, Server, Database, Palette, Layers, List, Clock,
  CheckCircle, User, PenTool, FileInput, FileType, Table2, CheckSquare, Shield,
  Archive, Library, Star, Bookmark, FileX, Filter, Bell, Tag, Search, AlertCircle, LayoutList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSession, signOut } from 'next-auth/react'

// ---------------------------------------------------------------------------
// Icon name → JSX element
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ReactNode> = {
  List:        <List size={14} />,
  Clock:       <Clock size={14} />,
  CheckCircle: <CheckCircle size={14} />,
  User:        <User size={14} />,
  GitBranch:   <GitBranch size={14} />,
  FileText:    <FileText size={14} />,
  Archive:     <Archive size={14} />,
  FileInput:   <FileInput size={14} />,
  Library:     <Library size={14} />,
  Star:        <Star size={14} />,
  Bookmark:    <Bookmark size={14} />,
  FileX:       <FileX size={14} />,
  Layers:      <Layers size={14} />,
  Filter:      <Filter size={14} />,
  Shield:      <Shield size={14} />,
  Bell:        <Bell size={14} />,
  Tag:         <Tag size={14} />,
  Search:      <Search size={14} />,
  AlertCircle: <AlertCircle size={14} />,
  LayoutList:  <LayoutList size={14} />,
}

function iconFromName(name: string): React.ReactNode {
  return ICON_MAP[name] ?? <List size={14} />
}

function buildHref(base: string, filters: Record<string, string>): string {
  const params = new URLSearchParams(filters)
  return params.toString() ? `${base}?${params}` : base
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SystemView {
  id: string
  name: string
  section: string
  icon: string
  filters: Record<string, string>
  order: number
  isDefault: boolean
}

interface NavChild {
  label: string
  href: string
  icon: React.ReactNode
}

const DESIGN_CHILDREN: NavChild[] = [
  { label: 'Workflows',      href: '/design/workflows',      icon: <Workflow size={14} /> },
  { label: 'Processes',      href: '/design/processes',      icon: <GitBranch size={14} /> },
  { label: 'Forms',          href: '/design/forms',          icon: <FileInput size={14} /> },
  { label: 'Document Types', href: '/design/document-types', icon: <FileType size={14} /> },
  { label: 'Approval Flows', href: '/design/approval-flows', icon: <CheckCircle size={14} /> },
  { label: 'Views',          href: '/design/views',          icon: <LayoutList size={14} /> },
]

const ADMIN_CHILDREN: NavChild[] = [
  { label: 'Users',         href: '/admin/users',         icon: <Users size={14} /> },
  { label: 'Groups',        href: '/admin/settings',      icon: <Users size={14} /> },
  { label: 'Labels',        href: '/admin/register',      icon: <Database size={14} /> },
  { label: 'Lookup Tables', href: '/admin/lookup-tables', icon: <Table2 size={14} /> },
  { label: 'Roles',         href: '/admin/roles',         icon: <Shield size={14} /> },
  { label: 'Appearance',    href: '/admin/appearance',    icon: <Palette size={14} /> },
  { label: 'System',        href: '/admin/system',        icon: <Server size={14} /> },
]

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Design: false, Admin: false,
  })
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const user = session?.user as { name?: string; email?: string } | undefined
  const name = user?.name ?? 'User'
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const [taskCount, setTaskCount]     = useState(0)
  const [systemViews, setSystemViews] = useState<SystemView[]>([])

  useEffect(() => {
    fetch('/api/tasks').then((r) => r.json()).then((d: { steps?: unknown[] }) => setTaskCount(d.steps?.length ?? 0)).catch(() => {})
  }, [pathname])

  useEffect(() => {
    fetch('/api/system-views')
      .then((r) => r.json())
      .then((d: { views: SystemView[] }) => setSystemViews(d.views ?? []))
      .catch(() => {})
  }, [pathname])

  // Auto-open collapsible sections based on route
  useEffect(() => {
    if (pathname.startsWith('/design')) setOpenSections((p) => ({ ...p, Design: true }))
    if (pathname.startsWith('/admin'))  setOpenSections((p) => ({ ...p, Admin: true }))
  }, [pathname])

  const toggleSection = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))

  const isActive = (href: string) => {
    const url = new URL(href, 'http://x')
    if (!pathname.startsWith(url.pathname === '/' ? '/' : url.pathname)) return false
    if (url.pathname === '/' && pathname !== '/') return false
    for (const [key, val] of url.searchParams.entries()) {
      if (searchParams.get(key) !== val) return false
    }
    if (url.searchParams.size === 0 && url.pathname !== '/' && searchParams.toString() !== '') {
      return searchParams.toString() === ''
    }
    return true
  }

  const defaultDocViews = systemViews
    .filter((v) => v.section === 'documents' && v.isDefault)
    .sort((a, b) => a.order - b.order)

  const defaultCaseViews = systemViews
    .filter((v) => v.section === 'cases' && v.isDefault)
    .sort((a, b) => a.order - b.order)

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderDirectLink = (href: string, label: string, icon: React.ReactNode, badge?: React.ReactNode) => {
    const active = isActive(href)
    return (
      <Link
        key={href}
        href={href}
        className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors', collapsed && 'justify-center')}
        style={{ color: active ? 'var(--nw-accent)' : 'var(--ink-3)', background: active ? 'var(--accent-tint)' : '', fontWeight: active ? '500' : '400' }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '' }}
      >
        <span className="shrink-0">{icon}</span>
        {!collapsed && <><span className="flex-1">{label}</span>{badge}</>}
      </Link>
    )
  }

  const renderChild = (child: NavChild) => {
    const active = isActive(child.href)
    return (
      <Link
        key={child.href}
        href={child.href}
        className="flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors"
        style={{
          color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
          background: active ? 'var(--accent-tint)' : '',
          fontWeight: active ? '500' : '400',
          borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
          marginLeft: '-2px',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '' }}
      >
        {child.icon}
        {child.label}
      </Link>
    )
  }

  const renderCollapsible = (label: string, icon: React.ReactNode, children: NavChild[]) => {
    const isOpen = openSections[label] ?? false
    const anyChildActive = children.some((c) => isActive(c.href))
    return (
      <div key={label}>
        <button
          onClick={() => collapsed ? setCollapsed(false) : toggleSection(label)}
          className={cn('w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors text-left', collapsed && 'justify-center')}
          style={{ color: anyChildActive ? 'var(--ink)' : 'var(--ink-3)', fontWeight: anyChildActive ? '500' : '400' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
        >
          <span className="shrink-0">{icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} style={{ color: 'var(--ink-4)' }} />
            </>
          )}
        </button>
        {!collapsed && isOpen && (
          <div className="ml-3 mt-0.5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--rule)' }}>
            {children.map(renderChild)}
          </div>
        )}
      </div>
    )
  }

  // Flat section: label + direct links (Documents, Cases)
  const renderFlatSection = (label: string, icon: React.ReactNode, views: SystemView[], baseHref: string) => {
    const anyActive = views.some((v) => isActive(buildHref(baseHref, v.filters)))
    if (collapsed) {
      return (
        <Link
          key={label}
          href={baseHref}
          className="flex items-center justify-center px-2.5 py-1.5 rounded text-sm transition-colors"
          style={{ color: anyActive ? 'var(--nw-accent)' : 'var(--ink-3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
        >
          {icon}
        </Link>
      )
    }
    return (
      <div key={label} className="pt-2">
        <p className="px-2.5 pb-0.5 mono-meta text-[10px]" style={{ color: 'var(--ink-4)' }}>{label.toUpperCase()}</p>
        <div className="space-y-0.5">
          {views.map((v) => {
            const href = buildHref(baseHref, v.filters)
            return renderDirectLink(href, v.name, iconFromName(v.icon))
          })}
        </div>
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen shrink-0 transition-all duration-300',
        'border-r',
        collapsed ? 'w-14' : 'w-56',
      )}
      style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-white" style={{ background: 'var(--nw-accent)' }}>
          N
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight flex-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
            Nexus
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 transition-colors"
          style={{ color: collapsed ? 'var(--ink-2)' : 'var(--ink-4)', background: collapsed ? 'var(--paper-3)' : '' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.background = 'var(--paper-3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = collapsed ? 'var(--ink-2)' : 'var(--ink-4)'; e.currentTarget.style.background = collapsed ? 'var(--paper-3)' : '' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 px-1.5 space-y-0.5">
        {/* Static items */}
        {renderDirectLink('/', 'Dashboard', <LayoutDashboard size={16} />)}
        {renderDirectLink('/tasks', 'My Tasks', <CheckSquare size={16} />,
          taskCount > 0 && !collapsed
            ? <span className="text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full" style={{ background: 'var(--nw-accent)', color: '#fff' }}>{taskCount}</span>
            : undefined
        )}
        {renderDirectLink('/processes', 'Processes', <GitBranch size={16} />)}

        {/* Documents — flat section with default views */}
        {renderFlatSection('Documents', <FileText size={16} />, defaultDocViews, '/documents')}

        {/* Cases — flat section with default views */}
        {renderFlatSection('Cases', <Layers size={16} />, defaultCaseViews, '/cases')}

        {/* Collapsible sections */}
        <div className="pt-2">
          {renderCollapsible('Design', <PenTool size={16} />, DESIGN_CHILDREN)}
          {renderCollapsible('Admin', <Settings size={16} />, ADMIN_CHILDREN)}
        </div>
      </nav>

      {/* Bottom — user */}
      <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--rule)' }}>
        <div className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded', collapsed && 'justify-center')}>
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-[10px] font-semibold text-white" style={{ background: 'var(--ink)' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{name}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--ink-4)' }}>{user?.email ?? ''}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="transition-colors shrink-0"
                style={{ color: 'var(--ink-4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                title="Log out"
              >
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
