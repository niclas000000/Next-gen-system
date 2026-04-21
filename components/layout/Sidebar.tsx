'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, FileText, GitBranch, Workflow, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut,
  Users, Server, Database, Palette, Layers, List, Clock,
  CheckCircle, User, PenTool, FileInput, FileType, Table2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSession, signOut } from 'next-auth/react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={16} /> },
  { label: 'Processes', href: '/processes', icon: <GitBranch size={16} /> },
  {
    label: 'Documents',
    icon: <FileText size={16} />,
    children: [
      { label: 'Library',          href: '/documents',                 icon: <FileText size={14} /> },
      { label: 'Pending Approval', href: '/documents?status=pending',  icon: <Clock size={14} /> },
      { label: 'My Documents',     href: '/documents?view=mine',       icon: <User size={14} /> },
      { label: 'Drafts',           href: '/documents?status=draft',    icon: <FileInput size={14} /> },
      { label: 'Archived',         href: '/documents?status=archived', icon: <FileType size={14} /> },
    ],
  },
  {
    label: 'Cases',
    icon: <Layers size={16} />,
    children: [
      { label: 'All cases',    href: '/cases',                    icon: <List size={14} /> },
      { label: 'Running',      href: '/cases?status=running',     icon: <Clock size={14} /> },
      { label: 'Completed',    href: '/cases?status=completed',   icon: <CheckCircle size={14} /> },
      { label: 'Cancelled',    href: '/cases?status=cancelled',   icon: <FileType size={14} /> },
      { label: 'My cases',     href: '/cases?view=mine',          icon: <User size={14} /> },
      { label: 'Per workflow', href: '/cases?view=by-workflow',   icon: <GitBranch size={14} /> },
    ],
  },
  {
    label: 'Design',
    icon: <PenTool size={16} />,
    children: [
      { label: 'Workflows',       href: '/design/workflows',        icon: <Workflow size={14} /> },
      { label: 'Processes',       href: '/design/processes',        icon: <GitBranch size={14} /> },
      { label: 'Forms',           href: '/design/forms',            icon: <FileInput size={14} /> },
      { label: 'Document Types',  href: '/design/document-types',   icon: <FileType size={14} /> },
      { label: 'Approval Flows',  href: '/design/approval-flows',   icon: <CheckCircle size={14} /> },
    ],
  },
  {
    label: 'Admin',
    icon: <Settings size={16} />,
    children: [
      { label: 'Users',         href: '/admin/users',         icon: <Users size={14} /> },
      { label: 'Groups',        href: '/admin/settings',      icon: <Users size={14} /> },
      { label: 'Labels',        href: '/admin/register',      icon: <Database size={14} /> },
      { label: 'Lookup Tables', href: '/admin/lookup-tables', icon: <Table2 size={14} /> },
      { label: 'Appearance',    href: '/admin/appearance',    icon: <Palette size={14} /> },
      { label: 'System',        href: '/admin/system',        icon: <Server size={14} /> },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Documents: false, Cases: true, Design: false, Admin: false,
  })
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const user = session?.user as { name?: string; email?: string } | undefined
  const name = user?.name ?? 'User'
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

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
      <div
        className="flex items-center gap-2.5 px-4 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        <div
          className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-white"
          style={{ background: 'var(--nw-accent)' }}
        >
          N
        </div>
        {!collapsed && (
          <span
            className="font-semibold text-sm tracking-tight flex-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}
          >
            Nexus
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 transition-colors"
          style={{
            color: collapsed ? 'var(--ink-2)' : 'var(--ink-4)',
            background: collapsed ? 'var(--paper-3)' : '',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--ink)'
            e.currentTarget.style.background = 'var(--paper-3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = collapsed ? 'var(--ink-2)' : 'var(--ink-4)'
            e.currentTarget.style.background = collapsed ? 'var(--paper-3)' : ''
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 px-1.5 space-y-0.5">
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openSections[item.label] ?? false
            const anyChildActive = item.children.some((c) => c.href && isActive(c.href))
            return (
              <div key={item.label}>
                <button
                  onClick={() => collapsed ? setCollapsed(false) : toggleSection(item.label)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors text-left',
                    collapsed && 'justify-center',
                  )}
                  style={{
                    color: anyChildActive ? 'var(--ink)' : 'var(--ink-3)',
                    fontWeight: anyChildActive ? '500' : '400',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={12}
                        className={cn('transition-transform', isOpen && 'rotate-180')}
                        style={{ color: 'var(--ink-4)' }}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-3 mt-0.5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--rule)' }}>
                    {item.children.map((child) => {
                      const active = child.href ? isActive(child.href) : false
                      return (
                        <Link
                          key={child.href}
                          href={child.href!}
                          className="flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors"
                          style={{
                            color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
                            background: active ? 'var(--accent-tint)' : '',
                            fontWeight: active ? '500' : '400',
                            borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
                            marginLeft: '-2px',
                          }}
                          onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.background = 'var(--paper-3)'
                          }}
                          onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = ''
                          }}
                        >
                          {child.icon}
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = item.href ? isActive(item.href) : false
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors',
                collapsed && 'justify-center',
              )}
              style={{
                color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
                background: active ? 'var(--accent-tint)' : '',
                fontWeight: active ? '500' : '400',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--paper-3)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = ''
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — user */}
      <div
        className="p-2 shrink-0"
        style={{ borderTop: '1px solid var(--rule)' }}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-1.5 rounded',
            collapsed && 'justify-center',
          )}
        >
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback
              className="text-[10px] font-semibold text-white"
              style={{ background: 'var(--ink)' }}
            >
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
