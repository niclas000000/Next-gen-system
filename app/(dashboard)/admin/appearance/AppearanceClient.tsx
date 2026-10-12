'use client'

import { useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useSettings, type ThemeChoice } from '@/lib/settings-context'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const OPTIONS: { id: ThemeChoice; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', hint: 'Paper and ink', icon: <Sun size={16} /> },
  { id: 'dark', label: 'Dark', hint: 'Easy on the eyes', icon: <Moon size={16} /> },
  { id: 'system', label: 'System', hint: 'Follows the device', icon: <Monitor size={16} /> },
]

export function AppearanceClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const { reload } = useSettings()
  const toast = useToast()
  const initial = (['light', 'dark', 'system'] as const).find((t) => t === initialSettings.theme) ?? 'light'
  const [theme, setTheme] = useState<ThemeChoice>(initial)

  async function choose(t: ThemeChoice) {
    setTheme(t)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    })
    if (!res.ok) return toast.error('The setting could not be saved')
    reload()
    toast.ok('Default theme updated')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mono-meta">Admin</p>
        <h1 className="font-display text-2xl font-semibold text-ink">Appearance</h1>
        <p className="mt-1 text-sm text-ink-3">The default theme for everyone. People can still pick their own in the account menu.</p>
      </div>

      <section className="rounded-[2px] border border-rule bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Default theme</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Default theme">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={theme === o.id}
              onClick={() => choose(o.id)}
              className={cn(
                'flex items-center gap-3 rounded-[2px] border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
                theme === o.id ? 'border-nw-accent bg-accent-tint' : 'border-rule hover:bg-paper-2'
              )}
            >
              <span className={theme === o.id ? 'text-nw-accent' : 'text-ink-3'}>{o.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-ink">{o.label}</span>
                <span className="block text-xs text-ink-4">{o.hint}</span>
              </span>
              {theme === o.id && <Check size={14} className="text-nw-accent" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
