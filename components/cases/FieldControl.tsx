'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ExternalLink, FileText, Paperclip, Search, Upload, X, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CaseTypeConfig, Field } from '@/lib/case-config/schema'
import type { CaseValues, FieldState } from '@/lib/case-config/runtime'
import { asList, displayValue, formatDate, type UserRef } from './format'

export interface AttachmentRef {
  id: string
  fileName: string
  size: number
  uploadedAt: string | Date
  uploader: { name: string }
}

interface Props {
  field: Field
  title: string
  state: FieldState
  values: CaseValues
  config: CaseTypeConfig
  users: UserRef[]
  attachments: AttachmentRef[]
  caseId: string
  /** Highlight as missing after a blocked move */
  invalid: boolean
  onChange: (value: string | string[]) => void
  onButton: (fieldId: string) => void
  onUpload: (fieldId: string, file: File) => Promise<void>
}

const NO_LABEL = new Set(['staticText', 'delimiter', 'collapsiblePanel', 'button', 'image'])

/** Registry values, filtered by the parent registry's chosen value when the registry is hierarchical. */
function registryOptions(field: Field, config: CaseTypeConfig, values: CaseValues): string[] {
  const reg = config.registries.find((r) => r.id === field.registryId)
  if (!reg) return []
  if (!reg.parentRegistryId) return reg.values
  const parentField = config.fields.find((f) => f.registryId === reg.parentRegistryId)
  const chosen = parentField ? asList(values[parentField.id]) : []
  return chosen.length ? reg.values.filter((v) => !reg.parents[v] || chosen.includes(reg.parents[v])) : reg.values
}

export function FieldControl(props: Props) {
  const { field, title, state, invalid } = props
  if (field.type === 'delimiter') return <hr className="border-rule my-1" />
  if (field.type === 'staticText') return <p className="text-sm text-ink-3 leading-relaxed">{field.name}</p>
  if (field.type === 'collapsiblePanel')
    return <p className="mono-meta pt-2 border-t border-rule-soft">{field.name}</p>

  const readOnly = state.readOnly
  return (
    <div className="space-y-1.5 min-w-0">
      {!NO_LABEL.has(field.type) && (
        <label htmlFor={`f-${field.id}`} className="flex items-baseline gap-1 text-[13px] font-medium text-ink-2">
          {title}
          {state.mandatory && (
            <span className="text-risk" aria-label="mandatory">
              *
            </span>
          )}
        </label>
      )}
      {readOnly ? <ReadOnlyValue {...props} /> : <Editor {...props} />}
      {invalid && <p className="text-xs text-risk-ink">Required to continue</p>}
    </div>
  )
}

function ReadOnlyValue({ field, values, users, attachments, caseId }: Props) {
  const v = values[field.id]
  if (field.type === 'attachments') return <AttachmentList ids={asList(v)} attachments={attachments} caseId={caseId} />
  if (field.type === 'subcase') return <SubcasePlaceholder field={field} readOnly />
  if (field.type === 'button') return null
  if (field.type === 'url' && typeof v === 'string' && v)
    return (
      <a href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-nw-accent hover:underline break-all">
        {v} <ExternalLink size={12} />
      </a>
    )
  const text = displayValue(field, v, users)
  return (
    <p className={cn('text-sm whitespace-pre-wrap break-words', text ? 'text-ink' : 'text-ink-4')}>{text || '—'}</p>
  )
}

function Editor(props: Props) {
  const { field, values, onChange, invalid, config, users } = props
  const id = `f-${field.id}`
  const v = values[field.id]
  const str = typeof v === 'string' ? v : ''
  const ring = invalid ? 'border-risk focus-visible:border-risk' : ''

  switch (field.type) {
    case 'text':
    case 'url':
      return <Input id={id} type={field.type === 'url' ? 'url' : 'text'} value={str} onChange={(e) => onChange(e.target.value)} className={ring} />
    case 'number':
      return <Input id={id} type="number" value={str} onChange={(e) => onChange(e.target.value)} className={ring} />
    case 'textMultiline':
      return <Textarea id={id} value={str} rows={3} onChange={(e) => onChange(e.target.value)} className={cn('resize-y min-h-[76px]', ring)} />
    case 'date':
      return <Input id={id} type="date" value={str.slice(0, 10)} onChange={(e) => onChange(e.target.value)} className={cn('max-w-[220px]', ring)} />
    case 'checkbox':
      return (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={str === 'Yes'}
          onClick={() => onChange(str === 'Yes' ? 'No' : 'Yes')}
          className="inline-flex items-center gap-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent rounded-[2px]"
        >
          <span className={cn('flex h-4 w-4 items-center justify-center rounded-[2px] border', str === 'Yes' ? 'bg-ink border-ink text-paper' : 'border-ink-4 bg-surface')}>
            {str === 'Yes' && <Check size={12} />}
          </span>
          {str === 'Yes' ? 'Yes' : 'No'}
        </button>
      )
    case 'registryDropdown': {
      const options = registryOptions(field, config, values)
      return field.multi ? (
        <MultiChoice id={id} options={options} value={asList(v)} onChange={onChange} invalid={invalid} />
      ) : (
        <Choice id={id} options={options.map((o) => ({ value: o, label: o }))} value={str} onChange={onChange} invalid={invalid} />
      )
    }
    case 'registrySearch':
      return (
        <Choice
          id={id}
          searchable
          placeholder="Search people…"
          options={users.map((u) => ({ value: u.id, label: u.name, hint: u.email }))}
          value={asList(v)[0] ?? ''}
          onChange={(val) => onChange(field.multi ? [val] : val)}
          invalid={invalid}
        />
      )
    case 'attachments':
      return <AttachmentEditor {...props} />
    case 'subcase':
      return <SubcasePlaceholder field={field} />
    case 'button':
      return (
        <div className="pt-6">
          <Button type="button" variant="outline" size="sm" onClick={() => props.onButton(field.id)}>
            {field.name}
          </Button>
        </div>
      )
    case 'image':
      return null
    default:
      return null
  }
}

// ---------------------------------------------------------------------------

interface Option {
  value: string
  label: string
  hint?: string
}

function Choice({
  id,
  options,
  value,
  onChange,
  invalid,
  searchable,
  placeholder = 'Select…',
}: {
  id: string
  options: Option[]
  value: string
  onChange: (v: string) => void
  invalid: boolean
  searchable?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const shown = useMemo(
    () => (q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options]
  )
  const current = options.find((o) => o.value === value)
  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQ('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-[2px] border bg-surface px-3 text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
            invalid ? 'border-risk' : 'border-rule hover:border-ink-4'
          )}
        >
          <span className={cn('truncate', current ? 'text-ink' : 'text-ink-4')}>{current?.label ?? placeholder}</span>
          <ChevronDown size={14} className="text-ink-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-[var(--radix-popover-trigger-width)] min-w-[220px] bg-surface border-rule rounded-[2px]">
        {(searchable || options.length > 8) && (
          <div className="flex items-center gap-2 px-2 pb-1 border-b border-rule-soft mb-1">
            <Search size={13} className="text-ink-4" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter…"
              className="h-8 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto" role="listbox">
          {value && (
            <button type="button" onClick={() => pick('')} className="w-full px-2 py-1.5 text-left text-xs text-ink-4 hover:bg-paper-2 rounded-[2px]">
              Clear selection
            </button>
          )}
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => pick(o.value)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-ink hover:bg-paper-2 focus-visible:bg-paper-2 focus-visible:outline-none rounded-[2px]"
            >
              <Check size={13} className={cn('shrink-0', o.value === value ? 'text-nw-accent' : 'opacity-0')} />
              <span className="flex-1 truncate">{o.label}</span>
              {o.hint && <span className="text-xs text-ink-4 truncate">{o.hint}</span>}
            </button>
          ))}
          {!shown.length && <p className="px-2 py-2 text-xs text-ink-4">No options</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MultiChoice({ id, options, value, onChange, invalid }: { id: string; options: string[]; value: string[]; onChange: (v: string[]) => void; invalid: boolean }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
  if (options.length > 6) return <MultiSelect id={id} options={options} value={value} onToggle={toggle} invalid={invalid} />
  return (
    <div id={id} role="group" className={cn('flex flex-wrap gap-1.5', invalid && 'rounded-[2px] outline outline-1 outline-risk p-1')}>
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
              on ? 'bg-accent-tint border-nw-accent text-nw-accent' : 'bg-surface border-rule text-ink-3 hover:border-ink-4'
            )}
          >
            {on && <Check size={11} />}
            {o}
          </button>
        )
      })}
      {!options.length && <p className="text-xs text-ink-4">No values in the registry yet</p>}
    </div>
  )
}

/** Long lists: selected values as chips, the rest in a filterable popover. */
function MultiSelect({ id, options, value, onToggle, invalid }: { id: string; options: string[]; value: string[]; onToggle: (o: string) => void; invalid: boolean }) {
  const [q, setQ] = useState('')
  const shown = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1 rounded-[2px] border bg-surface px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
            invalid ? 'border-risk' : 'border-rule hover:border-ink-4'
          )}
        >
          {value.length ? (
            value.map((v) => (
              <span key={v} className="rounded-full bg-accent-tint px-2 py-0.5 text-xs text-nw-accent">{v}</span>
            ))
          ) : (
            <span className="px-1 text-ink-4">Select…</span>
          )}
          <ChevronDown size={14} className="ml-auto text-ink-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-[var(--radix-popover-trigger-width)] min-w-[240px] bg-surface border-rule rounded-[2px]">
        <div className="flex items-center gap-2 px-2 pb-1 border-b border-rule-soft mb-1">
          <Search size={13} className="text-ink-4" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="h-8 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-4" />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {shown.map((o) => {
            const on = value.includes(o)
            return (
              <button key={o} type="button" role="menuitemcheckbox" aria-checked={on} onClick={() => onToggle(o)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-ink hover:bg-paper-2 focus-visible:bg-paper-2 focus-visible:outline-none rounded-[2px]">
                <span className={cn('flex h-4 w-4 items-center justify-center rounded-[2px] border', on ? 'bg-ink border-ink text-paper' : 'border-ink-4')}>{on && <Check size={11} />}</span>
                {o}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AttachmentList({ ids, attachments, caseId, onRemove }: { ids: string[]; attachments: AttachmentRef[]; caseId: string; onRemove?: (id: string) => void }) {
  const files = ids.map((id) => attachments.find((a) => a.id === id)).filter((a): a is AttachmentRef => !!a)
  if (!files.length) return onRemove ? null : <p className="text-sm text-ink-4">No files</p>
  return (
    <ul className="space-y-1">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2 text-sm">
          <FileText size={14} className="text-ink-4 shrink-0" />
          <a href={`/api/cases/${caseId}/attachments/${f.id}`} target="_blank" rel="noreferrer" className="text-nw-accent hover:underline truncate">
            {f.fileName}
          </a>
          <span className="text-xs text-ink-4 shrink-0">
            {(f.size / 1024).toFixed(0)} KB · {f.uploader.name} · {formatDate(f.uploadedAt)}
          </span>
          {onRemove && (
            <button type="button" aria-label={`Remove ${f.fileName}`} onClick={() => onRemove(f.id)} className="text-ink-4 hover:text-risk">
              <X size={13} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function AttachmentEditor({ field, values, attachments, caseId, onChange, onUpload }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const ids = asList(values[field.id])
  return (
    <div className="space-y-2">
      <AttachmentList ids={ids} attachments={attachments} caseId={caseId} onRemove={(id) => onChange(ids.filter((x) => x !== id))} />
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          try {
            await onUpload(field.id, file)
          } finally {
            setBusy(false)
            e.target.value = ''
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Upload size={13} className="animate-pulse" /> : <Paperclip size={13} />}
        {busy ? 'Uploading…' : 'Attach file'}
      </Button>
    </div>
  )
}

function SubcasePlaceholder({ field, readOnly }: { field: Field; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[2px] border border-dashed border-rule px-3 py-2.5">
      <Layers size={15} className="text-ink-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink">{field.name}</p>
        <p className="text-xs text-ink-4">No linked sub cases{readOnly ? '' : ' · sub cases are not part of this demo yet'}</p>
      </div>
      {!readOnly && (
        <Button type="button" variant="ghost" size="sm" disabled title="Sub cases are not part of this demo yet">
          + New
        </Button>
      )}
    </div>
  )
}
