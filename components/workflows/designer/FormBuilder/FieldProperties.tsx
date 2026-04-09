'use client'

import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
import type { FormField, ValidationRule } from '@/types/field'

export function FieldProperties() {
  const { fields, selectedFieldId, updateField } = useFormBuilderStore()
  const field = fields.find((f) => f.id === selectedFieldId)

  if (!field) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-xs text-slate-400 text-center">Select a field to edit its properties.</p>
      </div>
    )
  }

  const isRequired = field.validation.some((v) => v.type === 'required')

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
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-800">Field Properties</p>
        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{field.type}</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={field.label} onChange={(e) => update('label', e.target.value)} className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Field name <span className="text-slate-400">(variable)</span></Label>
          <Input
            value={field.name}
            onChange={(e) => update('name', e.target.value.replace(/\s+/g, '_').toLowerCase())}
            className="h-8 text-sm font-mono"
            placeholder="field_name"
          />
        </div>

        {field.type !== 'section' && field.type !== 'heading' && field.type !== 'divider' && (
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
        {field.type !== 'section' && field.type !== 'heading' && field.type !== 'divider' && (
          <div className="flex items-center justify-between py-1">
            <Label className="text-xs">Required</Label>
            <Switch checked={isRequired} onCheckedChange={setRequired} />
          </div>
        )}

        {/* Options for select/multiselect/radio */}
        {(field.type === 'select' || field.type === 'multiselect' || field.type === 'radio') && (
          <OptionsEditor field={field} updateField={updateField} />
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

        {/* Heading text */}
        {(field.type === 'heading' || field.type === 'section') && (
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <Input value={field.label} onChange={(e) => update('label', e.target.value)} className="h-8 text-sm" />
          </div>
        )}
      </div>
    </div>
  )
}

function OptionsEditor({ field, updateField }: { field: FormField; updateField: (id: string, u: Partial<FormField>) => void }) {
  const options = field.dataSource?.options ?? []

  const setOptions = (newOptions: { label: string; value: string }[]) => {
    updateField(field.id, { dataSource: { ...field.dataSource, type: 'static', options: newOptions } })
  }

  const addOption = () => {
    const n = options.length + 1
    setOptions([...options, { label: `Option ${n}`, value: `option_${n}` }])
  }

  const updateOption = (i: number, key: 'label' | 'value', val: string) => {
    const next = options.map((o, idx) => idx === i ? { ...o, [key]: val } : o)
    setOptions(next)
  }

  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i))

  return (
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeOption(i)}>
            <Trash2 size={11} />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs w-full gap-1" onClick={addOption}>
        <Plus size={11} /> Add option
      </Button>
    </div>
  )
}
