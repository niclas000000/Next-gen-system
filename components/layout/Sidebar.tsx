'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  Users,
  Server,
  Database,
  Palette,
  Layers,
  List,
  Clock,
  CheckCircle,
  User,
  PenTool,
  FileInput,
  FileType,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useSession, signOut } from 'next-auth/react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Documents', href: '/documents', icon: <FileText size={18} /> },
  { label: 'Processes', href: '/processes', icon: <GitBranch size={18} /> },
  {
    label: 'Cases',
    icon: <Layers size={18} />,
    children: [
      { label: 'All cases',    href: '/cases',                   icon: <List size={16} /> },
      { label: 'Running',      href: '/cases?status=running',    icon: <Clock size={16} /> },
      { label: 'Completed',    href: '/cases?status=completed',  icon: <CheckCircle size={16} /> },
      { label: 'My cases',     href: '/cases?view=mine',         icon: <User size={16} /> },
      { label: 'Per workflow', href: '/cases?view=by-workflow',  icon: <GitBranch size={16} /> },
    ],
  },
  {
    label: 'Design',
    icon: <PenTool size={18} />,
    children: [
      { label: 'Workflows',       href: '/design/workflows',       icon: <Workflow size={16} /> },
      { label: 'Processes',       href: '/design/processes',       icon: <GitBranch size={16} /> },
      { label: 'Forms',           href: '/design/forms',           icon: <FileInput size={16} /> },
      { label: 'Document Types',  href: '/design/document-types',  icon: <FileType size={16} /> },
    ],
  },
  {
    label: 'Admin',
    icon: <Settings size={18} />,
    children: [
      { label: 'Users',      href: '/admin/users',       icon: <Users size={16} /> },
      { label: 'Groups',     href: '/admin/settings',    icon: <Users size={16} /> },
      { label: 'Register',   href: '/admin/register',    icon: <Database size={16} /> },
      { label: 'Appearance', href: '/admin/appearance',  icon: <Palette size={16} /> },
      { label: 'System',     href: '/admin/system',      icon: <Server size={16} /> },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ Cases: true, Design: false, Admin: false })
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const user = session?.user as { name?: string; email?: string } | undefined
  const name = user?.name ?? 'User'
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const toggleSection = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))

  const toggleDark = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const isActive = (href: string) => {
    const url = new URL(href, 'http://x')
    if (!pathname.startsWith(url.pathname === '/' ? '/' : url.pathname)) return false
    if (url.pathname === '/' && pathname !== '/') return false
    // Check query params if present in href
    for (const [key, val] of url.searchParams.entries()) {
      if (searchParams.get(key) !== val) return false
    }
    // If href has no query params, only match if current URL also has none (for same-path items)
    if (url.searchParams.size === 0 && url.pathname !== '/' && searchParams.toString() !== '') {
      // still active if it's the base path match (e.g. /cases with no params = "All cases")
      return searchParams.toString() === ''
    }
    return true
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-slate-900 text-slate-100 transition-all duration-300 border-r border-slate-800 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
          N
        </div>
        {!collapsed && <span className="font-semibold text-base tracking-tight">Nexus</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-400 hover:text-slate-100 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openSections[item.label] ?? false
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggleSection(item.label)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
                    collapsed && 'justify-center'
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={cn('transition-transform', isOpen && 'rotate-180')}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-4 mt-1 space-y-1 pl-3 border-l border-slate-700">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                          isActive(child.href!)
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                collapsed && 'justify-center',
                isActive(item.href!)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {/* Dark mode */}
        <button
          onClick={toggleDark}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors',
            collapsed && 'justify-center'
          )}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        <Separator className="bg-slate-800" />

        {/* User profile */}
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2',
            collapsed && 'justify-center'
          )}
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email ?? ''}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-slate-500 hover:text-slate-200 transition-colors"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
