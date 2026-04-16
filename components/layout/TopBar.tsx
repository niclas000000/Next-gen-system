'use client'

import { Bell, Search, Menu, ChevronRight, Settings, User, LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  documents: 'Documents',
  processes: 'Processes',
  cases: 'Cases',
  workflows: 'Workflows',
  design: 'Design',
  instances: 'Cases',
  forms: 'Forms',
  'document-types': 'Document Types',
  admin: 'Admin',
  users: 'Users',
  settings: 'Settings',
  register: 'Register',
  system: 'System',
  appearance: 'Appearance',
}

function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isId = !routeLabels[seg] && seg.length > 16
        const label = isId ? '…' : (routeLabels[seg] ?? seg)
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-slate-500" />}
            <span className={isLast ? 'text-slate-100 font-medium' : 'text-slate-400'}>
              {label}
            </span>
          </span>
        )
      })}
    </nav>
  )
}

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession()
  const user = session?.user as { name?: string; email?: string } | undefined
  const name = user?.name ?? 'User'
  const email = user?.email ?? ''
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center gap-4 px-4 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-400 hover:text-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="flex-1">
        <Breadcrumb />
      </div>

      {/* Search */}
      <div className="hidden md:flex relative w-64">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <Input
          placeholder="Search..."
          className="pl-9 h-8 text-sm bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-600"
        />
      </div>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-100 hover:bg-slate-800">
        <Bell size={17} />
        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-blue-600 hover:bg-blue-600">
          3
        </Badge>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-slate-800">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium text-sm">{name}</p>
              <p className="text-xs text-slate-500 font-normal">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User size={14} className="mr-2" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings size={14} className="mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => signOut({ callbackUrl: '/login' })}>
            <LogOut size={14} className="mr-2" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
