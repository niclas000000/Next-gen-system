'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { FieldPalette } from '@/components/workflows/designer/FormBuilder/FieldPalette'
import { FieldList } from '@/components/workflows/designer/FormBuilder/FieldList'
import { FieldProperties } from '@/components/workflows/designer/FormBuilder/FieldProperties'
import { FormPreview } from '@/components/workflows/designer/FormBuilder/FormPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Save, Eye, EyeOff, ArrowLeft, Check, Loader2 } from 'lucide-react'
import type { FormField, FormSettings } from '@/types/field'

interface FormData {
  id: string
  name: string
  description: string | null
  fields: FormField[]
  settings: FormSettings
}

export function FormDesigner({ form }: { form: FormData }) {
  const router = useRouter()
  const { loadForm, fields, settings, isDirty } = useFormBuilderStore()
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState(form.name)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load form into store on mount
  useEffect(() => {
    loadForm(form.id, form.fields, form.settings)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id])

  const saveToApi = useCallback(async (overrideFields?: FormField[], overrideSettings?: FormSettings, overrideName?: string) => {
    setSaving(true)
    try {
      await fetch(`/api/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: overrideName ?? name,
          fields: overrideFields ?? fields,
          settings: overrideSettings ?? settings,
        }),
      })
      useFormBuilderStore.setState({ isDirty: false })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [form.id, name, fields, settings])

  // Auto-save 2s after any change
  useEffect(() => {
    if (!isDirty) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveToApi(), 2000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [isDirty, fields, settings, saveToApi])

  const handleNameBlur = () => {
    if (name !== form.name) saveToApi(undefined, undefined, name)
  }

  const fieldCount = fields.filter((f) => !['section', 'heading', 'divider'].includes(f.type)).length

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        <button
          onClick={() => router.push('/design/forms')}
          className="transition-colors"
          style={{ color: 'var(--ink-4)' }}
          aria-label="Back to forms"
        >
          <ArrowLeft size={18} />
        </button>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="h-8 text-sm font-semibold border-transparent hover:border-slate-200 focus:border-slate-300 w-64 px-2"
        />

        <Badge variant="outline" className="text-xs text-slate-500 shrink-0">
          {fieldCount} field{fieldCount !== 1 ? 's' : ''}
        </Badge>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          {showPreview ? 'Edit' : 'Preview'}
        </Button>

        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 min-w-[90px]"
          style={saved ? { background: 'var(--ok)', color: '#fff' } : {}}
          onClick={() => saveToApi()}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 size={12} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check size={12} /> Saved</>
          ) : (
            <><Save size={12} /> Save</>
          )}
        </Button>
      </div>

      {/* Designer body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: field palette */}
        <div className="w-52 flex flex-col shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
          <FieldPalette />
        </div>

        {/* Center: field list or preview */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--paper)' }}>
          {showPreview ? <FormPreview /> : <FieldList />}
        </div>

        {/* Right: field properties */}
        <div className="w-64 overflow-y-auto shrink-0" style={{ borderLeft: '1px solid var(--rule)', background: 'var(--surface)' }}>
          <FieldProperties />
        </div>
      </div>
    </div>
  )
}
