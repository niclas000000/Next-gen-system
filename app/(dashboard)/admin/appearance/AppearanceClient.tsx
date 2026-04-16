'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/lib/settings-context'
import { Check, ImageIcon, Trash2 } from 'lucide-react'

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async (overrides?: Partial<{ backgroundImage: string; backgroundOpacity: string }>) => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backgroundImage: overrides?.backgroundImage ?? imageUrl,
        backgroundOpacity: overrides?.backgroundOpacity ?? opacity,
      }),
    })
    setSaving(false)
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
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
        <h1 className="text-2xl font-semibold text-slate-900">Appearance</h1>
        <p className="text-sm text-slate-500 mt-1">Customize the look and feel of the application.</p>
      </div>

      {/* Background image */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ImageIcon size={16} className="text-slate-500" /> Background Image
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
                  <Trash2 size={14} className="text-red-500" />
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">Supports JPG, PNG, WebP, AVIF, SVG. Use a high-resolution image (min 1920×1080) for best results.</p>
          </div>

          {/* Sample images */}
          <div className="space-y-2">
            <Label className="text-xs">Quick pick</Label>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_IMAGES.map((img) => (
                <button
                  key={img.url}
                  onClick={() => handlePresetImage(img.url)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-video ${
                    imageUrl === img.url ? 'border-blue-600 shadow-md' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-end p-1.5">
                    <span className="text-white text-[10px] font-medium">{img.label}</span>
                  </div>
                  {imageUrl === img.url && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
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
              <span className="text-xs font-mono text-slate-500">{opacityNum}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={opacityNum}
              onChange={(e) => handleOpacityChange(e.target.value)}
              className="w-full accent-blue-600"
              aria-label="Background image opacity"
            />
            <div className="flex gap-2">
              {OPACITY_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleOpacityChange(p.value)}
                  className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                    opacity === p.value ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
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
              <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Background preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: opacityNum / 100 }}
                />
                <div className="relative p-4">
                  <div className="h-3 w-32 bg-slate-800 rounded mb-2 opacity-60" />
                  <div className="h-2 w-48 bg-slate-600 rounded opacity-40" />
                  <div className="h-2 w-40 bg-slate-600 rounded mt-1 opacity-40" />
                </div>
              </div>
              <p className="text-xs text-slate-400">This is how the background will look behind your content.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Button
          className={`min-w-[120px] ${saved ? 'bg-green-600 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={() => save()}
          disabled={saving}
        >
          {saved ? <><Check size={14} className="mr-1.5" />Saved!</> : saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
