'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface LookupRow {
  id: string
  label: string
  value: string
  parentId: string | null
  active: boolean
}

const LAYOUT_TYPES = ['section', 'heading', 'paragraph', 'divider']

// ---------------------------------------------------------------------------
// Evaluate condition expression against current form values
// ---------------------------------------------------------------------------
function evalCondition(expression: string, values: Record<string, unknown>): boolean {
  try {
    // Support: field == "value", field != "value", field == "", field != ""
    const eqMatch = expression.match(/^(\w+)\s*==\s*"(.*)"$/)
    const neMatch = expression.match(/^(\w+)\s*!=\s*"(.*)"$/)
    if (eqMatch) {
      const [, name, val] = eqMatch
      return String(values[name] ?? '') === val
    }
    if (neMatch) {
      const [, name, val] = neMatch
      return String(values[name] ?? '') !== val
    }
    return true
  } catch {
    return true
  }
}

// ---------------------------------------------------------------------------
// FieldInput — renders the appropriate input for a field type
// ---------------------------------------------------------------------------
function FieldInput({
  field,
  value,
  options,
  onChange,
}: {
  field: FormField
  value: unknown
  options: { label: string; value: string }[]
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
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }
    case 'multiselect': {
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

// ---------------------------------------------------------------------------
// FormRenderer
// ---------------------------------------------------------------------------
export function FormRenderer({ form, onSubmit, submitting }: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const f of form.fields) {
      if (f.defaultValue !== undefined) initial[f.name] = f.defaultValue
    }
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch lookup rows for all lookup-typed fields (needed for cascade)
  const [lookupRows, setLookupRows] = useState<Record<string, LookupRow[]>>({})

  useEffect(() => {
    const lookupFields = form.fields.filter((f) => f.dataSource?.type === 'lookup' && f.dataSource.tableId)
    const uniqueTableIds = [...new Set(lookupFields.map((f) => f.dataSource!.tableId!))]
    uniqueTableIds.forEach((tableId) => {
      fetch(`/api/lookup-tables/${tableId}/values`)
        .then((r) => r.json())
        .then((d: { values: LookupRow[] }) => setLookupRows((prev) => ({ ...prev, [tableId]: d.values })))
        .catch(() => {})
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute visible options for a field (respects rootsOnly + filterByField)
  const getOptions = useCallback((field: FormField): { label: string; value: string }[] => {
    const ds = field.dataSource
    if (!ds) return []
    if (ds.type !== 'lookup') return ds.options ?? []

    const rows = lookupRows[ds.tableId!] ?? []

    if (ds.rootsOnly) {
      return rows.filter((r) => !r.parentId && r.active).map((r) => ({ label: r.label, value: r.value }))
    }
    if (ds.filterByField) {
      const parentValue = values[ds.filterByField] as string
      if (!parentValue) return []
      const parentRow = rows.find((r) => r.value === parentValue)
      if (!parentRow) return []
      return rows.filter((r) => r.parentId === parentRow.id && r.active).map((r) => ({ label: r.label, value: r.value }))
    }
    return rows.filter((r) => r.active).map((r) => ({ label: r.label, value: r.value }))
  }, [lookupRows, values])

  // Check if a field should be visible given the current values
  const isVisible = (field: FormField): boolean => {
    if (!field.conditional) return true
    return evalCondition(field.conditional.expression, values) === field.conditional.show
  }

  const handleChange = (field: FormField, val: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [field.name]: val }
      // Reset any child cascade fields when their parent changes
      for (const f of form.fields) {
        if (f.dataSource?.filterByField === field.name) {
          next[f.name] = ''
        }
      }
      return next
    })
    setErrors((prev) => { const n = { ...prev }; delete n[field.name]; return n })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Only validate and submit visible fields
    const visibleFields = form.fields.filter(isVisible)

    const newErrors: Record<string, string> = {}
    for (const field of visibleFields) {
      if (LAYOUT_TYPES.includes(field.type)) continue
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

    // Submit only visible field values
    const submitPayload: Record<string, unknown> = {}
    for (const field of visibleFields) {
      if (!LAYOUT_TYPES.includes(field.type)) {
        submitPayload[field.name] = values[field.name]
      }
    }

    await onSubmit(submitPayload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {form.fields.map((field) => {
        if (!isVisible(field)) return null

        const isLayout = LAYOUT_TYPES.includes(field.type)
        const options = getOptions(field)

        return (
          <div key={field.id} className={isLayout ? '' : 'space-y-1'}>
            {!isLayout && field.type !== 'checkbox' && (
              <Label htmlFor={field.id} className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                {field.label}
                {field.validation?.some((v) => v.type === 'required') && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
            )}
            {field.description && !isLayout && (
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{field.description}</p>
            )}
            <FieldInput
              field={field}
              value={values[field.name]}
              options={options}
              onChange={(val) => handleChange(field, val)}
            />
            {errors[field.name] && (
              <p className="text-xs" style={{ color: 'var(--risk)' }}>{errors[field.name]}</p>
            )}
          </div>
        )
      })}

      <div className="pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : (form.settings?.submitButtonText ?? 'Submit')}
        </Button>
      </div>
    </form>
  )
}
