'use client'

import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Eye, EyeOff, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormField } from '@/types/field'

interface LookupTableOption { id: string; name: string }

const LAYOUT_TYPES = ['section', 'heading', 'divider', 'paragraph']

export function FieldProperties() {
  const { fields, selectedFieldId, updateField } = useFormBuilderStore()
  const field = fields.find((f) => f.id === selectedFieldId)

  if (!field) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-xs text-center" style={{ color: 'var(--ink-4)' }}>Select a field to edit its properties.</p>
      </div>
    )
  }

  const isRequired = field.validation.some((v) => v.type === 'required')
  const isLayout = LAYOUT_TYPES.includes(field.type)

  const setRequired = (val: boolean) => {
    const rest = field.validation.filter((v) => v.type !== 'required')
    updateField(field.id, {
      validation: val ? [...rest, { type: 'required', message: 'This field is required' }] : rest,
    })
  }

  const update = (key: keyof FormField, value: unknown) => {
    updateField(field.id, { [key]: value } as Partial<FormField>)
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Field Properties</p>
        <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>{field.type}</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={field.label} onChange={(e) => update('label', e.target.value)} className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Field name <span style={{ color: 'var(--ink-4)' }}>(variable)</span></Label>
          <Input
            value={field.name}
            onChange={(e) => update('name', e.target.value.replace(/\s+/g, '_').toLowerCase())}
            className="h-8 text-sm font-mono"
            placeholder="field_name"
          />
        </div>

        {!isLayout && field.type !== 'checkbox' && (
          <div className="space-y-1">
            <Label className="text-xs">Placeholder</Label>
            <Input value={field.placeholder ?? ''} onChange={(e) => update('placeholder', e.target.value)} className="h-8 text-sm" />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Description / Help text</Label>
          <Input value={field.description ?? ''} onChange={(e) => update('description', e.target.value)} className="h-8 text-sm" />
        </div>

        {/* Required toggle */}
        {!isLayout && (
          <div className="flex items-center justify-between py-1">
            <Label className="text-xs">Required</Label>
            <Switch checked={isRequired} onCheckedChange={setRequired} />
          </div>
        )}

        {/* Options source for select/multiselect/radio */}
        {(field.type === 'select' || field.type === 'multiselect' || field.type === 'radio') && (
          <DataSourceEditor field={field} allFields={fields} updateField={updateField} />
        )}

        {/* Number properties */}
        {field.type === 'number' && (
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Min</Label>
              <Input
                type="number"
                value={(field.properties as Record<string, unknown>)?.min as number ?? ''}
                onChange={(e) => update('properties', { ...field.properties, min: e.target.value ? Number(e.target.value) : undefined })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={(field.properties as Record<string, unknown>)?.max as number ?? ''}
                onChange={(e) => update('properties', { ...field.properties, max: e.target.value ? Number(e.target.value) : undefined })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Heading/section text */}
        {(field.type === 'heading' || field.type === 'section') && (
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <Input value={field.label} onChange={(e) => update('label', e.target.value)} className="h-8 text-sm" />
          </div>
        )}

        {/* Visibility condition — not available for layout fields */}
        {!isLayout && (
          <ConditionEditor field={field} allFields={fields} updateField={updateField} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Condition Editor
// ---------------------------------------------------------------------------

type Operator = 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty'

function buildExpression(triggerName: string, op: Operator, value: string): string {
  if (op === 'is_empty') return `${triggerName} == ""`
  if (op === 'is_not_empty') return `${triggerName} != ""`
  if (op === 'equals') return `${triggerName} == "${value}"`
  return `${triggerName} != "${value}"`
}

function ConditionEditor({
  field,
  allFields,
  updateField,
}: {
  field: FormField
  allFields: FormField[]
  updateField: (id: string, u: Partial<FormField>) => void
}) {
  const hasCondition = !!field.conditional

  // Parse current expression to populate UI state
  const parseExpression = (expr: string) => {
    const eqMatch = expr.match(/^(\w+)\s*==\s*"(.*)"$/)
    const neMatch = expr.match(/^(\w+)\s*!=\s*"(.*)"$/)
    if (eqMatch) {
      if (eqMatch[2] === '') return { triggerField: eqMatch[1], op: 'is_empty' as Operator, value: '' }
      return { triggerField: eqMatch[1], op: 'equals' as Operator, value: eqMatch[2] }
    }
    if (neMatch) {
      if (neMatch[2] === '') return { triggerField: neMatch[1], op: 'is_not_empty' as Operator, value: '' }
      return { triggerField: neMatch[1], op: 'not_equals' as Operator, value: neMatch[2] }
    }
    return { triggerField: '', op: 'equals' as Operator, value: '' }
  }

  const parsed = field.conditional ? parseExpression(field.conditional.expression) : { triggerField: '', op: 'equals' as Operator, value: '' }

  const [triggerField, setTriggerField] = useState(parsed.triggerField)
  const [op, setOp] = useState<Operator>(parsed.op)
  const [value, setValue] = useState(parsed.value)

  // Sync when field changes (selection change in store)
  useEffect(() => {
    const p = field.conditional ? parseExpression(field.conditional.expression) : { triggerField: '', op: 'equals' as Operator, value: '' }
    setTriggerField(p.triggerField)
    setOp(p.op)
    setValue(p.value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id])

  const otherFields = allFields.filter((f) => f.id !== field.id && !LAYOUT_TYPES.includes(f.type))
  const triggerFieldDef = otherFields.find((f) => f.name === triggerField)
  const triggerOptions = triggerFieldDef?.dataSource?.options ?? []
  const showValueInput = op === 'equals' || op === 'not_equals'

  const commit = (newTrigger: string, newOp: Operator, newValue: string) => {
    if (!newTrigger) return
    updateField(field.id, {
      conditional: { show: true, expression: buildExpression(newTrigger, newOp, newValue) },
    })
  }

  const enable = () => {
    const first = otherFields[0]
    const t = first?.name ?? ''
    setTriggerField(t)
    setOp('equals')
    setValue('')
    if (t) updateField(field.id, { conditional: { show: true, expression: buildExpression(t, 'equals', '') } })
  }

  const disable = () => {
    updateField(field.id, { conditional: undefined })
    setTriggerField('')
    setOp('equals')
    setValue('')
  }

  return (
    <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--rule)' }}>
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1">
          <Eye size={11} /> Visibility
        </Label>
        {hasCondition ? (
          <button onClick={disable} className="text-[10px] flex items-center gap-1" style={{ color: 'var(--risk)' }}>
            <EyeOff size={10} /> Always visible
          </button>
        ) : (
          <button
            onClick={enable}
            className="text-[10px] flex items-center gap-1"
            style={{ color: otherFields.length === 0 ? 'var(--ink-4)' : 'var(--nw-accent)' }}
            disabled={otherFields.length === 0}
          >
            + Add condition
          </button>
        )}
      </div>

      {hasCondition && (
        <div className="space-y-2 p-2 rounded-[2px]" style={{ background: 'var(--accent-tint)', border: '1px solid var(--nw-accent)' }}>
          <p className="text-[10px] font-medium" style={{ color: 'var(--nw-accent)' }}>Show this field when…</p>

          {/* Trigger field */}
          <select
            value={triggerField}
            onChange={(e) => {
              setTriggerField(e.target.value)
              setValue('')
              commit(e.target.value, op, '')
            }}
            className="w-full h-7 px-2 text-xs rounded-[2px] focus:outline-none"
            style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
          >
            <option value="">— pick a field —</option>
            {otherFields.map((f) => (
              <option key={f.id} value={f.name}>{f.label || f.name}</option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={op}
            onChange={(e) => {
              const newOp = e.target.value as Operator
              setOp(newOp)
              commit(triggerField, newOp, value)
            }}
            className="w-full h-7 px-2 text-xs rounded-[2px] focus:outline-none"
            style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
          >
            <option value="equals">equals</option>
            <option value="not_equals">does not equal</option>
            <option value="is_not_empty">is not empty</option>
            <option value="is_empty">is empty</option>
          </select>

          {/* Value — dropdown if trigger has options, else text */}
          {showValueInput && triggerOptions.length > 0 ? (
            <select
              value={value}
              onChange={(e) => { setValue(e.target.value); commit(triggerField, op, e.target.value) }}
              className="w-full h-7 px-2 text-xs rounded-[2px] focus:outline-none"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              <option value="">— any value —</option>
              {triggerOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : showValueInput ? (
            <Input
              value={value}
              onChange={(e) => { setValue(e.target.value); commit(triggerField, op, e.target.value) }}
              className="h-7 text-xs"
              placeholder="value"
            />
          ) : null}
        </div>
      )}

      {!hasCondition && (
        <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
          {otherFields.length === 0 ? 'Add more fields to enable conditions.' : 'This field is always visible.'}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DataSource Editor (Options + Cascade)
// ---------------------------------------------------------------------------

function DataSourceEditor({
  field,
  allFields,
  updateField,
}: {
  field: FormField
  allFields: FormField[]
  updateField: (id: string, u: Partial<FormField>) => void
}) {
  const sourceType = field.dataSource?.type === 'lookup' ? 'lookup' : 'static'
  const [tables, setTables] = useState<LookupTableOption[]>([])

  useEffect(() => {
    fetch('/api/lookup-tables')
      .then((r) => r.json())
      .then((d: { tables: { id: string; name: string }[] }) => setTables(d.tables))
      .catch(() => {})
  }, [])

  const setSourceType = (t: 'static' | 'lookup') => {
    if (t === 'lookup') {
      updateField(field.id, { dataSource: { type: 'lookup', tableId: '', tableName: '' } })
    } else {
      updateField(field.id, { dataSource: { type: 'static', options: field.dataSource?.options ?? [] } })
    }
  }

  const setLookupTable = (tableId: string) => {
    const found = tables.find((t) => t.id === tableId)
    updateField(field.id, { dataSource: { ...field.dataSource, type: 'lookup', tableId, tableName: found?.name } })
  }

  const options = field.dataSource?.options ?? []

  const setOptions = (newOptions: { label: string; value: string }[]) => {
    updateField(field.id, { dataSource: { type: 'static', options: newOptions } })
  }

  const addOption = () => {
    const n = options.length + 1
    setOptions([...options, { label: `Option ${n}`, value: `option_${n}` }])
  }

  const updateOption = (i: number, key: 'label' | 'value', val: string) => {
    setOptions(options.map((o, idx) => idx === i ? { ...o, [key]: val } : o))
  }

  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i))

  // Other lookup fields (for cascade filter-by)
  const otherLookupFields = allFields.filter(
    (f) => f.id !== field.id && f.dataSource?.type === 'lookup' && f.dataSource.tableId === field.dataSource?.tableId
  )

  return (
    <div className="space-y-3">
      {/* Source toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs">Options source</Label>
        <div className="flex overflow-hidden text-xs rounded-[2px]" style={{ border: '1px solid var(--rule)' }}>
          <button
            type="button"
            onClick={() => setSourceType('static')}
            className="flex-1 py-1.5 font-medium transition-colors"
            style={{
              background: sourceType === 'static' ? 'var(--ink)' : 'var(--surface)',
              color: sourceType === 'static' ? '#fff' : 'var(--ink-3)',
            }}
          >
            Static list
          </button>
          <button
            type="button"
            onClick={() => setSourceType('lookup')}
            className="flex-1 py-1.5 font-medium transition-colors"
            style={{
              background: sourceType === 'lookup' ? 'var(--ink)' : 'var(--surface)',
              color: sourceType === 'lookup' ? '#fff' : 'var(--ink-3)',
            }}
          >
            Lookup table
          </button>
        </div>
      </div>

      {sourceType === 'lookup' ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Select table</Label>
            <select
              value={field.dataSource?.tableId ?? ''}
              onChange={(e) => setLookupTable(e.target.value)}
              className="w-full h-8 px-2 text-sm rounded-[2px] focus:outline-none focus:ring-1"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              <option value="">— choose a table —</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {tables.length === 0 && (
              <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>No lookup tables found. Create one in Admin → Lookup Tables.</p>
            )}
          </div>

          {/* Cascade options — only shown when a table is selected */}
          {field.dataSource?.tableId && (
            <div className="space-y-2 p-2 rounded-[2px]" style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
              <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                <Link2 size={10} /> Hierarchy / Cascade
              </p>

              {/* Show roots only toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: 'var(--ink-3)' }}>Show top-level only</label>
                <Switch
                  checked={field.dataSource?.rootsOnly ?? false}
                  onCheckedChange={(v) => updateField(field.id, {
                    dataSource: { ...field.dataSource!, rootsOnly: v, filterByField: v ? undefined : field.dataSource?.filterByField },
                  })}
                />
              </div>

              {/* Filter by another field (cascade child) */}
              {!field.dataSource?.rootsOnly && (
                <div className="space-y-1">
                  <label className="text-[10px]" style={{ color: 'var(--ink-4)' }}>Filter by parent field</label>
                  <select
                    value={field.dataSource?.filterByField ?? ''}
                    onChange={(e) => updateField(field.id, {
                      dataSource: { ...field.dataSource!, filterByField: e.target.value || undefined },
                    })}
                    className="w-full h-7 px-2 text-xs rounded-[2px] focus:outline-none"
                    style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
                  >
                    <option value="">None (show all rows)</option>
                    {allFields
                      .filter((f) => f.id !== field.id && !LAYOUT_TYPES.includes(f.type))
                      .map((f) => (
                        <option key={f.id} value={f.name}>{f.label || f.name}</option>
                      ))}
                  </select>
                  {field.dataSource?.filterByField && (
                    <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                      Shows children of the selected "{field.dataSource.filterByField}" value.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs">Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={opt.label}
                onChange={(e) => updateOption(i, 'label', e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder="Label"
              />
              <Input
                value={opt.value}
                onChange={(e) => updateOption(i, 'value', e.target.value)}
                className="h-7 text-xs w-24 font-mono"
                placeholder="value"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                style={{ color: 'var(--ink-4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                onClick={() => removeOption(i)}
              >
                <Trash2 size={11} />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="h-7 text-xs w-full gap-1" onClick={addOption}>
            <Plus size={11} /> Add option
          </Button>
        </div>
      )}
    </div>
  )
}
