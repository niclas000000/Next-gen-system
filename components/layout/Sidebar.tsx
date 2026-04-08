'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

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
    label: 'Workflows',
    icon: <Workflow size={18} />,
    children: [
      { label: 'Design', href: '/workflows/design', icon: <Workflow size={16} /> },
      { label: 'Cases', href: '/workflows/instances', icon: <FileText size={16} /> },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [workflowsOpen, setWorkflowsOpen] = useState(true)
  const pathname = usePathname()

  const toggleDark = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

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
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && setWorkflowsOpen(!workflowsOpen)}
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
                        className={cn('transition-transform', workflowsOpen && 'rotate-180')}
                      />
                    </>
                  )}
                </button>
                {!collapsed && workflowsOpen && (
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
            <AvatarFallback className="bg-blue-600 text-white text-xs">NS</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">Niclas Svensson</p>
              <p className="text-xs text-slate-500 truncate">Admin</p>
            </div>
          )}
          {!collapsed && (
            <button className="text-slate-500 hover:text-slate-200 transition-colors">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
