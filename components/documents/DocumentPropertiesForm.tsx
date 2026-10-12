'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FormField, NumberFieldProperties, TextFieldProperties } from '@/types/field'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LookupRow {
  id: string
  label: string
  value: string
  parentId: string | null
  active: boolean
}

interface UserOption {
  id: string
  name: string
  email: string
}

const LAYOUT_TYPES = ['section', 'heading', 'paragraph', 'divider']

// ---------------------------------------------------------------------------
// Condition evaluator (same logic as FormRenderer)
// ---------------------------------------------------------------------------
function evalCondition(expression: string, values: Record<string, unknown>): boolean {
  try {
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

function isVisible(field: FormField, values: Record<string, unknown>): boolean {
  if (!field.conditional) return true
  const result = evalCondition(field.conditional.expression, values)
  return field.conditional.show ? result : !result
}

// ---------------------------------------------------------------------------
// Validation (exported — used by DocumentEditor before saving)
// ---------------------------------------------------------------------------
export function validateProperties(
  fields: FormField[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (LAYOUT_TYPES.includes(field.type)) continue
    if (!isVisible(field, values)) continue
    const required = field.validation?.find((r) => r.type === 'required')
    if (!required) continue
    const val = values[field.name]
    const empty =
      val === undefined ||
      val === null ||
      val === '' ||
      (Array.isArray(val) && val.length === 0)
    if (empty) errors[field.name] = required.message || `${field.label} is required`
  }
  return errors
}

// ---------------------------------------------------------------------------
// Field input renderer
// ---------------------------------------------------------------------------
function FieldInput({
  field,
  value,
  options,
  users,
  onChange,
  error,
}: {
  field: FormField
  value: unknown
  options: { label: string; value: string }[]
  users: UserOption[]
  onChange: (val: unknown) => void
  error?: string
}) {
  const strVal = String(value ?? '')
  const inputStyle = {
    border: `1px solid ${error ? 'var(--risk)' : 'var(--rule)'}`,
    background: 'var(--surface)',
    color: 'var(--ink)',
  }

  switch (field.type) {
    // ---- Layout ----
    case 'section':
    case 'heading':
      return (
        <div className="pt-2">
          <h3 className="text-sm font-semibold pb-1" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule)' }}>
            {field.label}
          </h3>
          {field.description && (
            <p className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>{field.description}</p>
          )}
        </div>
      )
    case 'paragraph':
      return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{field.description ?? field.label}</p>
    case 'divider':
      return <hr style={{ borderColor: 'var(--rule)' }} />

    // ---- Text ----
    case 'text': {
      const tp = field.properties as TextFieldProperties
      return (
        <Input
          value={strVal}
          placeholder={field.placeholder}
          maxLength={tp?.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
          style={inputStyle}
        />
      )
    }

    case 'textarea': {
      const tp = field.properties as TextFieldProperties
      return (
        <textarea
          value={strVal}
          placeholder={field.placeholder}
          rows={tp?.rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm rounded-[2px] focus:outline-none resize-none"
          style={inputStyle}
        />
      )
    }

    // ---- Number ----
    case 'number': {
      const np = field.properties as NumberFieldProperties
      return (
        <div className="flex items-center gap-1">
          {np?.prefix && <span className="text-sm" style={{ color: 'var(--ink-4)' }}>{np.prefix}</span>}
          <Input
            type="number"
            value={strVal}
            placeholder={field.placeholder}
            step={np?.step ?? 'any'}
            min={np?.min}
            max={np?.max}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-8 text-sm flex-1"
            style={inputStyle}
          />
          {np?.suffix && <span className="text-sm" style={{ color: 'var(--ink-4)' }}>{np.suffix}</span>}
        </div>
      )
    }

    // ---- Date ----
    case 'date':
      return (
        <input
          type="date"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none"
          style={inputStyle}
        />
      )

    // ---- Select ----
    case 'select':
      return (
        <select
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none"
          style={inputStyle}
        >
          <option value="">Select…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )

    // ---- Multiselect ----
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div
          className="rounded-[2px] px-2.5 py-2 space-y-1.5"
          style={{ border: `1px solid ${error ? 'var(--risk)' : 'var(--rule)'}`, background: 'var(--surface)' }}
        >
          {options.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>No options available</p>
          )}
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...selected, opt.value])
                  else onChange(selected.filter((v) => v !== opt.value))
                }}
              />
              <span style={{ color: 'var(--ink)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
      )
    }

    // ---- Radio ----
    case 'radio':
      return (
        <div className="space-y-1.5">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={strVal === opt.value}
                onChange={() => onChange(opt.value)}
              />
              <span style={{ color: 'var(--ink)' }}>{opt.label}</span>
            </label>
          ))}
        </div>
      )

    // ---- Checkbox ----
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span style={{ color: 'var(--ink)' }}>{field.description ?? field.label}</span>
        </label>
      )

    // ---- Toggle ----
    case 'toggle': {
      const checked = Boolean(value)
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
            style={{ background: checked ? 'var(--nw-accent)' : 'var(--paper-3)' }}
          >
            <span
              className="pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transition-transform mt-0.5"
              style={{
                background: 'var(--surface)',
                transform: checked ? 'translateX(18px)' : 'translateX(2px)',
              }}
            />
          </button>
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {checked ? 'Yes' : 'No'}
          </span>
        </div>
      )
    }

    // ---- User ----
    case 'user':
      return (
        <select
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none"
          style={inputStyle}
        >
          <option value="">Select person…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
          ))}
        </select>
      )

    // ---- Default fallback ----
    default:
      return (
        <Input
          value={strVal}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
          style={inputStyle}
        />
      )
  }
}

// ---------------------------------------------------------------------------
// DocumentPropertiesForm
// ---------------------------------------------------------------------------

interface DocumentPropertiesFormProps {
  fields: FormField[]
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
  errors?: Record<string, string>
}

export function DocumentPropertiesForm({ fields, values, onChange, errors = {} }: DocumentPropertiesFormProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [lookupRows, setLookupRows] = useState<Map<string, LookupRow[]>>(new Map())

  const needsUsers = fields.some((f) => f.type === 'user')
  const lookupTableIds = [
    ...new Set(
      fields
        .filter((f) => f.dataSource?.type === 'lookup' && f.dataSource.tableId)
        .map((f) => f.dataSource!.tableId!)
    ),
  ]

  useEffect(() => {
    if (!needsUsers) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((d: { users: UserOption[] }) => setUsers(d.users ?? []))
      .catch(() => {})
  }, [needsUsers])

  const fetchLookups = useCallback(async () => {
    if (lookupTableIds.length === 0) return
    const entries = await Promise.all(
      lookupTableIds.map(async (id) => {
        const r = await fetch(`/api/lookup-tables/${id}/rows`)
        const d = await r.json() as { rows: LookupRow[] }
        return [id, (d.rows ?? []).filter((row) => row.active)] as [string, LookupRow[]]
      })
    )
    setLookupRows(new Map(entries))
  }, [lookupTableIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLookups() }, [fetchLookups])

  const getOptions = (field: FormField): { label: string; value: string }[] => {
    const ds = field.dataSource
    if (!ds) return []
    if (ds.type === 'static') return ds.options ?? []
    if (ds.type === 'lookup' && ds.tableId) {
      const rows = lookupRows.get(ds.tableId) ?? []
      let filtered = rows
      if (ds.rootsOnly) filtered = rows.filter((r) => r.parentId === null)
      if (ds.filterByField) {
        const parentValue = values[ds.filterByField] as string | undefined
        filtered = parentValue ? rows.filter((r) => r.parentId === parentValue) : []
      }
      return filtered.map((r) => ({ label: r.label, value: r.value }))
    }
    return []
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-4)' }}>
        No property fields defined for this document type.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (!isVisible(field, values)) return null

        const isLayout = LAYOUT_TYPES.includes(field.type)
        const isCheckboxLike = field.type === 'checkbox' || field.type === 'toggle'
        const required = field.validation?.some((r) => r.type === 'required')
        const error = errors[field.name]

        if (isLayout) {
          return (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.name]}
              options={[]}
              users={[]}
              onChange={(v) => onChange(field.name, v)}
              error={error}
            />
          )
        }

        return (
          <div key={field.id} className="space-y-1.5">
            {!isCheckboxLike && (
              <Label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                {field.label}
                {required && <span style={{ color: 'var(--risk)' }}>*</span>}
              </Label>
            )}
            {field.description && !isCheckboxLike && (
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{field.description}</p>
            )}
            <FieldInput
              field={field}
              value={values[field.name]}
              options={getOptions(field)}
              users={users}
              onChange={(v) => onChange(field.name, v)}
              error={error}
            />
            {error && (
              <p className="text-xs" style={{ color: 'var(--risk)' }}>{error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
