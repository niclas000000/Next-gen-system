'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft, Plus, Trash2, Loader2, ChevronUp, ChevronDown,
  Check, Circle,
} from 'lucide-react'

interface LookupTableInfo {
  id: string
  name: string
  description: string | null
  scope: string
  createdAt: string
  updatedAt: string
}

interface LookupValueRow {
  id: string
  label: string
  value: string
  color: string | null
  order: number
  parentId: string | null
  active: boolean
}

const SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'workflow', label: 'Workflows' },
  { value: 'process', label: 'Processes' },
]

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#0f172a',
]

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform hover:scale-110"
      style={{ backgroundColor: color, borderColor: selected ? color : 'transparent', outline: selected ? `2px solid ${color}` : 'none', outlineOffset: '1px' }}
      title={color}
    />
  )
}

export function LookupTableEditor({
  table,
  initialValues,
}: {
  table: LookupTableInfo
  initialValues: LookupValueRow[]
}) {
  const router = useRouter()

  const [name, setName] = useState(table.name)
  const [description, setDescription] = useState(table.description ?? '')
  const [scope, setScope] = useState(table.scope)
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaSaved, setMetaSaved] = useState(false)

  const [values, setValues] = useState<LookupValueRow[]>(initialValues)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newColor, setNewColor] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const saveMeta = async () => {
    setSavingMeta(true)
    try {
      await fetch(`/api/lookup-tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, scope }),
      })
      setMetaSaved(true)
      setTimeout(() => setMetaSaved(false), 2000)
    } finally {
      setSavingMeta(false)
    }
  }

  const addValue = async () => {
    if (!newLabel.trim() || !newValue.trim()) return
    setAdding(true)
    try {
      const nextOrder = values.length > 0 ? Math.max(...values.map((v) => v.order)) + 1 : 0
      const res = await fetch(`/api/lookup-tables/${table.id}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), value: newValue.trim(), color: newColor, order: nextOrder }),
      })
      const data = await res.json() as { value: LookupValueRow }
      setValues((prev) => [...prev, data.value])
      setNewLabel('')
      setNewValue('')
      setNewColor(null)
    } finally {
      setAdding(false)
    }
  }

  const updateValue = useCallback(async (id: string, patch: Partial<LookupValueRow>) => {
    setSaving(id)
    try {
      const res = await fetch(`/api/lookup-tables/${table.id}/values/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json() as { value: LookupValueRow }
      setValues((prev) => prev.map((v) => (v.id === id ? data.value : v)))
    } finally {
      setSaving(null)
    }
  }, [table.id])

  const deleteValue = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/lookup-tables/${table.id}/values/${id}`, { method: 'DELETE' })
      setValues((prev) => prev.filter((v) => v.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const moveValue = async (id: string, dir: 'up' | 'down') => {
    const idx = values.findIndex((v) => v.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === values.length - 1) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    const next = [...values]
    const a = { ...next[idx], order: next[swapIdx].order }
    const b = { ...next[swapIdx], order: next[idx].order }
    next[idx] = a
    next[swapIdx] = b
    next.sort((x, y) => x.order - y.order)
    setValues(next)
    await Promise.all([
      fetch(`/api/lookup-tables/${table.id}/values/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: a.order }) }),
      fetch(`/api/lookup-tables/${table.id}/values/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: b.order }) }),
    ])
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/lookup-tables')}
          className="transition-colors"
          style={{ color: 'var(--ink-4)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{table.name}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>Lookup table editor</p>
        </div>
      </div>

      {/* Meta card */}
      <div className="p-5 space-y-4 rounded-[2px]" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink-3)' }}>Table settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-[2px] focus:outline-none focus:ring-1"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
              Description <span style={{ color: 'var(--ink-4)' }}>(optional)</span>
            </label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-sm" placeholder="What is this list used for?" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={saveMeta}
            disabled={savingMeta}
            size="sm"
            className="gap-1.5"
          >
            {savingMeta ? <Loader2 size={13} className="animate-spin" /> : metaSaved ? <Check size={13} /> : null}
            {metaSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Values card */}
      <div className="p-5 space-y-4 rounded-[2px]" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink-3)' }}>Values</h2>
          <span className="text-xs" style={{ color: 'var(--ink-4)' }}>{values.length} item{values.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Column headers */}
        {values.length > 0 && (
          <div className="grid grid-cols-[20px_1fr_1fr_80px_40px_72px] gap-2 px-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
            <span />
            <span>Label</span>
            <span>Value (key)</span>
            <span>Color</span>
            <span className="text-center">Active</span>
            <span />
          </div>
        )}

        {/* Value rows */}
        <div className="space-y-1.5">
          {values.map((v, idx) => (
            <ValueRow
              key={v.id}
              v={v}
              isFirst={idx === 0}
              isLast={idx === values.length - 1}
              saving={saving === v.id}
              deleting={deleting === v.id}
              onUpdate={(patch) => updateValue(v.id, patch)}
              onDelete={() => deleteValue(v.id)}
              onMove={(dir) => moveValue(v.id, dir)}
            />
          ))}
        </div>

        {/* Add row */}
        <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--rule)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--ink-4)' }}>Add value</p>
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <Input
              placeholder="Label (displayed)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addValue()}
            />
            <Input
              placeholder="Value (key)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="h-8 text-sm font-mono"
              onKeyDown={(e) => e.key === 'Enter' && addValue()}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs" style={{ color: 'var(--ink-4)' }}>Color:</span>
              <button
                type="button"
                onClick={() => setNewColor(null)}
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: !newColor ? 'var(--nw-accent)' : 'var(--rule)' }}
                title="No color"
              >
                <Circle size={10} style={{ color: 'var(--ink-4)' }} />
              </button>
              {COLORS.map((c) => (
                <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
              ))}
            </div>
            <Button
              onClick={addValue}
              disabled={!newLabel.trim() || !newValue.trim() || adding}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ValueRow({
  v, isFirst, isLast, saving, deleting, onUpdate, onDelete, onMove,
}: {
  v: LookupValueRow
  isFirst: boolean
  isLast: boolean
  saving: boolean
  deleting: boolean
  onUpdate: (patch: Partial<LookupValueRow>) => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const [label, setLabel] = useState(v.label)
  const [value, setValue] = useState(v.value)
  const [showColors, setShowColors] = useState(false)

  return (
    <div
      className="group grid grid-cols-[20px_1fr_1fr_80px_40px_72px] gap-2 items-center px-1 py-1 rounded-[2px] transition-colors"
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
    >
      {/* Order buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onMove('up')}
          disabled={isFirst}
          className="transition-colors disabled:opacity-0"
          style={{ color: 'var(--ink-4)' }}
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={isLast}
          className="transition-colors disabled:opacity-0"
          style={{ color: 'var(--ink-4)' }}
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Label */}
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label !== v.label && onUpdate({ label })}
        className="h-7 px-2 text-sm rounded-[2px] focus:outline-none focus:ring-1 bg-transparent transition-colors"
        style={{ border: '1px solid transparent', color: 'var(--ink)' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'transparent')}
      />

      {/* Value key */}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== v.value && onUpdate({ value })}
        className="h-7 px-2 text-sm font-mono rounded-[2px] focus:outline-none focus:ring-1 bg-transparent transition-colors"
        style={{ border: '1px solid transparent', color: 'var(--ink)' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'transparent')}
      />

      {/* Color */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-1.5 h-7 px-2 rounded-[2px] transition-colors text-xs"
          style={{ border: '1px solid transparent', color: 'var(--ink-4)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
        >
          <span
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: v.color ?? 'var(--rule)', border: '1px solid var(--rule)' }}
          />
          {v.color ? '' : 'None'}
        </button>
        {showColors && (
          <div className="absolute top-8 left-0 z-10 p-2 flex flex-wrap gap-1.5 w-40 rounded-[2px]" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <button
              type="button"
              onClick={() => { onUpdate({ color: null }); setShowColors(false) }}
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: !v.color ? 'var(--nw-accent)' : 'var(--rule)' }}
            >
              <Circle size={10} style={{ color: 'var(--ink-4)' }} />
            </button>
            {COLORS.map((c) => (
              <ColorDot
                key={c}
                color={c}
                selected={v.color === c}
                onClick={() => { onUpdate({ color: c }); setShowColors(false) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active toggle */}
      <button
        type="button"
        onClick={() => onUpdate({ active: !v.active })}
        className="mx-auto w-8 h-4 rounded-full transition-colors"
        style={{ background: v.active ? 'var(--ok)' : 'var(--paper-3)' }}
      >
        <span
          className="block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5"
          style={{ transform: v.active ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        {saving && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--nw-accent)' }} />}
        <button
          onClick={onDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--ink-4)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  )
}
