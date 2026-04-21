'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, GitBranch, Layers, PenTool, Settings, LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const MODULES = [
  { label: 'Dashboard', href: '/',          icon: <LayoutDashboard size={20} /> },
  { label: 'Documents', href: '/documents', icon: <FileText size={20} /> },
  { label: 'Processes', href: '/processes', icon: <GitBranch size={20} /> },
  { label: 'Cases',     href: '/cases',     icon: <Layers size={20} /> },
  { label: 'Design',    href: '/design/workflows', icon: <PenTool size={20} /> },
  { label: 'Admin',     href: '/admin/users', icon: <Settings size={20} /> },
]

export function IconRail() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as { name?: string } | undefined
  const name = user?.name ?? 'User'
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside
      className="w-[68px] shrink-0 flex flex-col items-center py-3 h-screen"
      style={{ background: 'var(--surface-ink)' }}
    >
      {/* Logo */}
      <div
        className="w-9 h-9 rounded flex items-center justify-center font-bold text-sm text-white mb-4"
        style={{ background: 'var(--nw-accent)' }}
      >
        N
      </div>

      {/* Module icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {MODULES.map((m) => {
          const active = isActive(m.href)
          return (
            <Link
              key={m.href}
              href={m.href}
              title={m.label}
              className={cn(
                'w-full flex items-center justify-center h-10 rounded-[2px] transition-colors relative group',
              )}
              style={{
                color: active ? 'white' : 'rgba(255,255,255,0.45)',
                background: active ? 'rgba(255,255,255,0.12)' : '',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                }
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ background: 'var(--nw-accent)' }}
                />
              )}
              {m.icon}
              {/* Tooltip */}
              <span
                className="absolute left-full ml-2 px-2 py-1 text-xs rounded-[2px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                style={{ background: 'var(--ink)', color: 'white', fontFamily: 'var(--font-inter)' }}
              >
                {m.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom — user + logout */}
      <div className="flex flex-col items-center gap-2 pb-1">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Log out"
          className="w-10 h-10 rounded flex items-center justify-center transition-colors"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = '' }}
        >
          <LogOut size={16} />
        </button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </aside>
  )
}
