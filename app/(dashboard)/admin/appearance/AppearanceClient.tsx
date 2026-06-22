'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/lib/settings-context'
import { Check, Sidebar, Grip } from 'lucide-react'

interface Props {
  initialSettings: Record<string, string>
}

export function AppearanceClient({ initialSettings }: Props) {
  const { reload } = useSettings()
  const [navMode, setNavMode] = useState<'v1' | 'v2'>((initialSettings.navMode as 'v1' | 'v2') ?? 'v1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async (overrides?: Partial<{ navMode: string }>) => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ navMode: overrides?.navMode ?? navMode }),
    })
    setSaving(false)
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
  }

  const handleNavMode = async (mode: 'v1' | 'v2') => {
    setNavMode(mode)
    await save({ navMode: mode })
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Appearance</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Customize the look and feel of the application.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sidebar size={16} className="text-[var(--ink-3)]" /> Navigation style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
            Choose between the classic labeled sidebar or the compact icon rail with Ctrl+K command palette for power users.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleNavMode('v1')}
              className="rounded-[2px] border-2 p-4 text-left transition-all"
              style={{
                borderColor: navMode === 'v1' ? 'var(--nw-accent)' : 'var(--rule)',
                background: navMode === 'v1' ? 'var(--accent-tint)' : 'var(--surface)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sidebar size={16} style={{ color: navMode === 'v1' ? 'var(--nw-accent)' : 'var(--ink-3)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>Sidebar</span>
                {navMode === 'v1' && <Check size={13} className="ml-auto" style={{ color: 'var(--nw-accent)' }} />}
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Labeled rail, discoverable. Default for most users.</p>
            </button>
            <button
              onClick={() => handleNavMode('v2')}
              className="rounded-[2px] border-2 p-4 text-left transition-all"
              style={{
                borderColor: navMode === 'v2' ? 'var(--nw-accent)' : 'var(--rule)',
                background: navMode === 'v2' ? 'var(--accent-tint)' : 'var(--surface)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Grip size={16} style={{ color: navMode === 'v2' ? 'var(--nw-accent)' : 'var(--ink-3)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>Icon rail + Ctrl+K</span>
                {navMode === 'v2' && <Check size={13} className="ml-auto" style={{ color: 'var(--nw-accent)' }} />}
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Compact icon rail, keyboard-first. For power users.</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button onClick={() => save()} disabled={saving} className="min-w-[120px]">
          {saved ? <><Check size={14} className="mr-1" />Saved!</> : saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
