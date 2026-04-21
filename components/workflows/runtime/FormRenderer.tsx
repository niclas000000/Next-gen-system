'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { FormField, FormDefinition } from '@/types/field'

interface FormRendererProps {
  form: FormDefinition
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  submitting?: boolean
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: unknown
  onChange: (val: unknown) => void
}) {
  const strVal = (value as string) ?? ''

  switch (field.type) {
    case 'text':
    case 'user':
      return (
        <Input
          id={field.id}
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'textarea':
      return (
        <Textarea
          id={field.id}
          value={strVal}
          placeholder={field.placeholder}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <Input
          id={field.id}
          type="number"
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'date':
      return (
        <Input
          id={field.id}
          type="date"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'select': {
      const options = field.dataSource?.options ?? []
      return (
        <select
          id={field.id}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[2px] px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }
    case 'multiselect': {
      const options = field.dataSource?.options ?? []
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, opt.value])
                  else onChange(selected.filter((v) => v !== opt.value))
                }}
                className="rounded"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )
    }
    case 'radio': {
      const options = field.dataSource?.options ?? []
      return (
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={strVal === opt.value}
                onChange={() => onChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      )
    }
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          {field.label}
        </label>
      )
    case 'section':
    case 'heading':
      return <h3 className="font-semibold text-base pb-2" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}>{field.label}</h3>
    case 'paragraph':
      return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{field.description ?? field.label}</p>
    case 'divider':
      return <hr style={{ borderColor: 'var(--rule)' }} />
    default:
      return (
        <Input
          id={field.id}
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export function FormRenderer({ form, onSubmit, submitting }: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const f of form.fields) {
      if (f.defaultValue !== undefined) initial[f.name] = f.defaultValue
    }
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const newErrors: Record<string, string> = {}
    for (const field of form.fields) {
      if (field.type === 'section' || field.type === 'heading' || field.type === 'paragraph' || field.type === 'divider') continue
      const required = field.validation?.some((v) => v.type === 'required')
      if (required && (values[field.name] === undefined || values[field.name] === '' || values[field.name] === null)) {
        newErrors[field.name] = field.validation.find((v) => v.type === 'required')?.message ?? 'Required'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    await onSubmit(values)
  }

  const isLayoutField = (type: string) => ['section', 'heading', 'paragraph', 'divider'].includes(type)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {form.fields.map((field) => (
        <div key={field.id} className={isLayoutField(field.type) ? '' : 'space-y-1'}>
          {!isLayoutField(field.type) && field.type !== 'checkbox' && (
            <Label htmlFor={field.id} className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
              {field.label}
              {field.validation?.some((v) => v.type === 'required') && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
          )}
          {field.description && !isLayoutField(field.type) && (
            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{field.description}</p>
          )}
          <FieldInput
            field={field}
            value={values[field.name]}
            onChange={(val) => {
              setValues((prev) => ({ ...prev, [field.name]: val }))
              setErrors((prev) => { const n = { ...prev }; delete n[field.name]; return n })
            }}
          />
          {errors[field.name] && (
            <p className="text-xs text-red-500">{errors[field.name]}</p>
          )}
        </div>
      ))}

      <div className="pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : (form.settings?.submitButtonText ?? 'Submit')}
        </Button>
      </div>
    </form>
  )
}
