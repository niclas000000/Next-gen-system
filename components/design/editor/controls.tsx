'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Small building blocks shared by the case type editor tabs. */

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-4">{hint}</span>}
    </label>
  )
}

const inputClass =
  'h-9 w-full rounded-[2px] border border-rule bg-surface px-3 text-sm text-ink placeholder:text-ink-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent focus-visible:border-nw-accent'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, 'h-auto min-h-[72px] py-2 leading-relaxed', props.className)} />
}

export function Select({ value, onChange, options, className, placeholder, ...rest }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, 'pr-8', className)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
        on ? 'border-nw-accent bg-accent-tint text-nw-accent' : 'border-rule bg-surface text-ink-3 hover:border-ink-4'
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-[2px] p-1.5 text-ink-4 transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
        danger ? 'hover:bg-risk-tint hover:text-risk-ink' : 'hover:bg-paper-3 hover:text-ink'
      )}
    >
      {children}
    </button>
  )
}

/** Up / down / delete for an item in an ordered list. */
export function RowActions({ index, count, onMove, onDelete, label }: { index: number; count: number; onMove: (to: number) => void; onDelete: () => void; label: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <IconButton label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp size={14} /></IconButton>
      <IconButton label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown size={14} /></IconButton>
      <IconButton label={`Delete ${label}`} danger onClick={onDelete}><Trash2 size={14} /></IconButton>
    </div>
  )
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[2px] border border-dashed border-rule px-3 py-1.5 text-sm text-ink-3 hover:border-nw-accent hover:text-nw-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
    >
      <Plus size={14} /> {children}
    </button>
  )
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[2px] border border-rule bg-surface', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function move<T>(list: T[], from: number, to: number): void {
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
}

/** Readable unique id from a name, e.g. "Root cause" → "rootCause", "rootCause2". */
export function makeId(name: string, taken: Iterable<string>): string {
  const words = name.normalize('NFKD').replace(/[^\w\s]/g, '').trim().split(/\s+/).filter(Boolean)
  const base = words.length ? words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('') : 'item'
  const set = new Set(taken)
  let id = base
  for (let n = 2; set.has(id); n++) id = `${base}${n}`
  return id
}
