'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Check, Eye, FilePlus2, FolderPlus, LogOut, Monitor, Moon, Plus, Sun } from 'lucide-react'
import { signOut } from 'next-auth/react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { initials } from '@/components/cases/format'
import { useSettings, type ThemeChoice } from '@/lib/settings-context'
import { LogoMark } from './Logo'
import { useShell } from './AppShell'
import { CONFIG_MODULES, WORK_MODULES, moduleFor, type ModuleDef } from './nav'

const itemClass =
  'group relative flex h-10 w-10 items-center justify-center rounded-[2px] text-[color:var(--rail-ink)] transition-colors hover:bg-[color:var(--rail-hover)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent'

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-2.5 whitespace-nowrap rounded-[2px] bg-ink px-2 py-1 text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  )
}

export function Rail() {
  const pathname = usePathname()
  const { isAdmin, workCount } = useShell()
  const current = moduleFor(pathname)

  const item = (m: ModuleDef) => {
    const active = current === m.id
    const Icon = m.icon
    return (
      <Link
        key={m.id}
        href={m.href}
        aria-label={m.label}
        aria-current={active ? 'page' : undefined}
        className={cn(itemClass, active && 'bg-[color:var(--rail-active)] text-white')}
      >
        {active && <span className="absolute left-[-8px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-nw-accent" />}
        <Icon size={19} />
        {m.id === 'work' && workCount > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-[16px] rounded-full bg-nw-accent px-1 text-center text-[10px] font-semibold leading-4 text-on-fill">
            {workCount}
          </span>
        )}
        <Tip>{m.label}{m.id === 'work' && workCount > 0 ? ` · ${workCount}` : ''}</Tip>
      </Link>
    )
  }

  return (
    <nav aria-label="Modules" className="flex h-full w-16 shrink-0 flex-col items-center gap-1 bg-rail py-3">
      <Link href="/" aria-label="Nexus home" className="mb-3 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent">
        <LogoMark size={34} />
      </Link>
      {WORK_MODULES.map(item)}
      <NewMenu />
      <div className="flex-1" />
      {isAdmin && CONFIG_MODULES.map(item)}
      <UserMenu />
    </nav>
  )
}

function NewMenu() {
  const router = useRouter()
  const { openNewCase } = useShell()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Create new" className={cn(itemClass, 'mt-2 border border-dashed border-white/20')}>
          <Plus size={18} />
          <Tip>New…</Tip>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-48 rounded-[2px] border-rule bg-surface">
        <DropdownMenuItem onSelect={openNewCase} className="gap-2">
          <FolderPlus size={14} /> New case
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/documents?new=1')} className="gap-2">
          <FilePlus2 size={14} /> New document
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const THEMES: { id: ThemeChoice; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun size={13} /> },
  { id: 'dark', label: 'Dark', icon: <Moon size={13} /> },
  { id: 'system', label: 'System', icon: <Monitor size={13} /> },
]

function UserMenu() {
  const { me } = useShell()
  const { userTheme, setUserTheme, settings } = useSettings()
  if (!me) return <span className="mt-2 h-8 w-8 rounded-full bg-white/10" />
  const { user } = me
  const canSwitch = me.demo && (user.role === 'admin' || !!user.viewAsBy)

  const viewAs = async (userId: string | null) => {
    await fetch('/api/demo/view-as', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId }) })
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Account: ${user.name}`}
          className={cn(
            'mt-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
            user.viewAsBy ? 'bg-nw-accent' : 'bg-white/15 hover:bg-white/25'
          )}
        >
          {initials(user.name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-64 rounded-[2px] border-rule bg-surface">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-ink">{user.name}</p>
          <p className="text-xs text-ink-4">{user.email} · {user.role}</p>
        </DropdownMenuLabel>
        {canSwitch && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-normal uppercase tracking-wide text-ink-4">
              <Eye size={12} /> View as (demo)
            </DropdownMenuLabel>
            <div className="max-h-64 overflow-y-auto">
              {me.switchable.map((u) => {
                const current = u.id === user.id
                const isReal = u.id === user.viewAsBy?.id
                return (
                  <DropdownMenuItem key={u.id} onSelect={() => !current && viewAs(isReal ? null : u.id)} className="gap-2">
                    <Check size={13} className={current ? 'text-nw-accent' : 'opacity-0'} />
                    <span className="flex-1 truncate">{u.name}</span>
                    <span className="text-[10px] text-ink-4">{isReal ? 'you' : u.role}</span>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wide text-ink-4">Theme</DropdownMenuLabel>
        <div className="flex gap-1 px-2 pb-1.5" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const on = (userTheme ?? settings.theme) === t.id
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={on}
                onClick={() => setUserTheme(t.id === settings.theme ? null : t.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-[2px] border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
                  on ? 'border-nw-accent bg-accent-tint text-nw-accent' : 'border-rule text-ink-3 hover:bg-paper-2'
                )}
              >
                {t.icon} {t.label}
              </button>
            )
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/login' })} className="gap-2">
          <LogOut size={14} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
