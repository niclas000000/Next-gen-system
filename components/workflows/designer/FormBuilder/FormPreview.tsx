'use client'

import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { FormField } from '@/types/field'

function PreviewField({ field }: { field: FormField }) {
  const isRequired = field.validation.some((v) => v.type === 'required')

  if (field.type === 'divider') return <Separator className="my-2" />

  if (field.type === 'heading') {
    return <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{field.label}</h3>
  }

  if (field.type === 'section') {
    return (
      <div className="pt-2">
        <p className="text-sm font-semibold pb-1" style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--rule)' }}>{field.label}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
        {field.label}
        {isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {field.description && <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{field.description}</p>}

      {(field.type === 'text' || field.type === 'number' || field.type === 'date' || field.type === 'time') && (
        <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
          placeholder={field.placeholder} className="h-9 text-sm" disabled />
      )}

      {field.type === 'textarea' && (
        <textarea placeholder={field.placeholder} disabled
          className="w-full rounded-[2px] text-sm px-3 py-2 h-20 resize-none"
          style={{ border: '1px solid var(--rule)', background: 'var(--paper-2)', color: 'var(--ink-4)' }} />
      )}

      {(field.type === 'select' || field.type === 'multiselect') && (
        <select disabled className="w-full rounded-[2px] text-sm px-3 py-2 h-9"
          style={{ border: '1px solid var(--rule)', background: 'var(--paper-2)', color: 'var(--ink-4)' }}>
          <option value="">{field.placeholder || `Select ${field.label}…`}</option>
          {field.dataSource?.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {field.type === 'radio' && (
        <div className="space-y-1.5">
          {field.dataSource?.options?.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-not-allowed" style={{ color: 'var(--ink-3)' }}>
              <input type="radio" disabled /> {o.label}
            </label>
          ))}
        </div>
      )}

      {field.type === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Checkbox disabled />
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>{field.label}</span>
        </div>
      )}

      {field.type === 'toggle' && (
        <div className="flex items-center gap-2">
          <Switch disabled />
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>{field.label}</span>
        </div>
      )}

      {field.type === 'file' && (
        <div className="border-2 border-dashed rounded-[2px] p-4 text-center text-xs"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper-2)', color: 'var(--ink-4)' }}>
          Click to upload or drag files here
        </div>
      )}

      {field.type === 'user' && (
        <Input placeholder="Search for a user…" className="h-9 text-sm" disabled />
      )}
    </div>
  )
}

export function FormPreview() {
  const { fields, settings } = useFormBuilderStore()

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No fields to preview yet.
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="rounded-[2px] p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        {fields.map((field) => (
          <PreviewField key={field.id} field={field} />
        ))}
        <div className="pt-2">
          <Button className="text-sm" disabled>
            {settings.submitButtonText || 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}
