'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/lib/settings-context'
import { Check, ImageIcon, Trash2, Sidebar, Grip } from 'lucide-react'

interface Props {
  initialSettings: Record<string, string>
}

const OPACITY_PRESETS = [
  { label: 'Subtle', value: '8' },
  { label: 'Light', value: '15' },
  { label: 'Medium', value: '30' },
  { label: 'Strong', value: '50' },
  { label: 'Full', value: '100' },
]

const SAMPLE_IMAGES = [
  { label: 'Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  { label: 'Ocean', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80' },
  { label: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
  { label: 'City', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80' },
  { label: 'Abstract', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80' },
  { label: 'Minimal', url: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1920&q=80' },
]

export function AppearanceClient({ initialSettings }: Props) {
  const { reload } = useSettings()
  const [imageUrl, setImageUrl] = useState(initialSettings.backgroundImage ?? '')
  const [opacity, setOpacity] = useState(initialSettings.backgroundOpacity ?? '15')
  const [navMode, setNavMode] = useState<'v1' | 'v2'>((initialSettings.navMode as 'v1' | 'v2') ?? 'v1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async (overrides?: Partial<{ backgroundImage: string; backgroundOpacity: string; navMode: string }>) => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backgroundImage: overrides?.backgroundImage ?? imageUrl,
        backgroundOpacity: overrides?.backgroundOpacity ?? opacity,
        navMode: overrides?.navMode ?? navMode,
      }),
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

  const handleOpacityChange = async (val: string) => {
    setOpacity(val)
  }

  const handlePresetImage = async (url: string) => {
    setImageUrl(url)
  }

  const handleClear = async () => {
    setImageUrl('')
    await save({ backgroundImage: '' })
  }

  const opacityNum = Math.min(100, Math.max(0, parseInt(opacity, 10) || 0))

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Appearance</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Customize the look and feel of the application.</p>
      </div>

      {/* Navigation style */}
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
            {/* V1 */}
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
            {/* V2 */}
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

      {/* Background image */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ImageIcon size={16} style={{ color: 'var(--ink-3)' }} /> Background Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* URL input */}
          <div className="space-y-1.5">
            <Label className="text-xs">Image URL</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 text-sm"
              />
              {imageUrl && (
                <Button variant="outline" size="icon" onClick={handleClear} title="Remove image">
                  <Trash2 size={14} style={{ color: 'var(--risk)' }} />
                </Button>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Supports JPG, PNG, WebP, AVIF, SVG. Use a high-resolution image (min 1920×1080) for best results.</p>
          </div>

          {/* Sample images */}
          <div className="space-y-2">
            <Label className="text-xs">Quick pick</Label>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.url}
                  onClick={() => handlePresetImage(img.url)}
                  className="relative rounded-[2px] overflow-hidden border-2 transition-all aspect-video"
                  style={{
                    borderColor: imageUrl === img.url ? 'var(--nw-accent)' : 'transparent',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-end p-1.5">
                    <span className="text-white text-[10px] font-medium">{img.label}</span>
                  </div>
                  {imageUrl === img.url && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--nw-accent)' }}>
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Opacity</Label>
              <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>{opacityNum}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={opacityNum}
              onChange={(e) => handleOpacityChange(e.target.value)}
              className="w-full"
              style={{ accentColor: 'var(--nw-accent)' }}
              aria-label="Background image opacity"
            />
            <div className="flex gap-2">
              {OPACITY_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleOpacityChange(p.value)}
                  className="flex-1 py-1 rounded-[2px] text-xs font-medium transition-colors"
                  style={{
                    border: `1px solid ${opacity === p.value ? 'var(--nw-accent)' : 'var(--rule)'}`,
                    background: opacity === p.value ? 'var(--nw-accent)' : 'var(--surface)',
                    color: opacity === p.value ? '#fff' : 'var(--ink-3)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div className="space-y-1.5">
              <Label className="text-xs">Preview</Label>
              <div className="relative rounded-[2px] overflow-hidden h-32" style={{ border: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Background preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: opacityNum / 100 }}
                />
                <div className="relative p-4">
                  <div className="h-3 w-32 rounded mb-2 opacity-60" style={{ background: 'var(--ink)' }} />
                  <div className="h-2 w-48 rounded opacity-40" style={{ background: 'var(--ink-3)' }} />
                  <div className="h-2 w-40 rounded mt-1 opacity-40" style={{ background: 'var(--ink-3)' }} />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>This is how the background will look behind your content.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Button onClick={() => save()} disabled={saving} className="min-w-[120px]">
          {saved ? <><Check size={14} className="mr-1" />Saved!</> : saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
