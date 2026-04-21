'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Tag, Layers } from 'lucide-react'

interface RegistryItem {
  id: string
  type: string
  name: string
  color: string | null
  description: string | null
  scope: string
}

interface Props { initialItems: RegistryItem[] }

type FormState = { type: string; name: string; color: string; description: string; scope: string }
const emptyForm = (type: string): FormState => ({ type, name: '', color: '#3b82f6', description: '', scope: 'all' })

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#64748b', '#84cc16',
]

const SCOPES = [
  { value: 'all', label: 'All modules' },
  { value: 'document', label: 'Documents only' },
  { value: 'workflow', label: 'Workflows only' },
  { value: 'process', label: 'Processes only' },
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${value === c ? 'scale-110' : 'border-transparent'}`}
            style={{ borderColor: value === c ? 'var(--ink)' : undefined }}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: value }} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-xs h-8 font-mono" placeholder="#3b82f6" />
      </div>
    </div>
  )
}

export function RegistryClient({ initialItems }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState<'category' | 'tag'>('category')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<RegistryItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm('category'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => startTransition(() => router.refresh())

  const openCreate = (type: string) => {
    setEditItem(null)
    setForm(emptyForm(type))
    setError('')
    setShowForm(true)
  }

  const openEdit = (item: RegistryItem) => {
    setEditItem(item)
    setForm({ type: item.type, name: item.name, color: item.color ?? '#3b82f6', description: item.description ?? '', scope: item.scope })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    if (editItem) {
      const res = await fetch(`/api/registry/${editItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, color: form.color, description: form.description, scope: form.scope }),
      })
      setSaving(false)
      if (!res.ok) { setError('Name already exists.'); return }
      const { item } = await res.json() as { item: RegistryItem }
      setItems((prev) => prev.map((i) => i.id === item.id ? item : i))
    } else {
      const res = await fetch('/api/registry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaving(false)
      if (!res.ok) { setError('Name already exists.'); return }
      const { item } = await res.json() as { item: RegistryItem }
      setItems((prev) => [...prev, item])
    }
    setShowForm(false)
    refresh()
  }

  const handleDelete = async (item: RegistryItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await fetch(`/api/registry/${item.id}`, { method: 'DELETE' })
    refresh()
  }

  const filtered = items.filter((i) => i.type === activeTab)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Labels</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Manage labels used to organize documents, workflows, and processes.</p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="flex gap-0">
          {[{ key: 'category', label: 'Categories', icon: <Layers size={14} /> }, { key: 'tag', label: 'Tags', icon: <Tag size={14} /> }].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key as 'category' | 'tag')}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors"
              style={{
                borderColor: activeTab === t.key ? 'var(--nw-accent)' : 'transparent',
                color: activeTab === t.key ? 'var(--nw-accent)' : 'var(--ink-4)',
                fontWeight: activeTab === t.key ? 500 : 400,
              }}>
              {t.icon}{t.label}
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{
                background: activeTab === t.key ? 'var(--accent-tint)' : 'var(--paper-3)',
                color: activeTab === t.key ? 'var(--nw-accent)' : 'var(--ink-4)',
              }}>
                {items.filter((i) => i.type === t.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
          {filtered.length} {activeTab === 'category' ? 'categor' : 'tag'}{filtered.length !== 1 ? (activeTab === 'category' ? 'ies' : 's') : (activeTab === 'category' ? 'y' : '')} defined
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => openCreate(activeTab)}>
          <Plus size={14} /> New {activeTab}
        </Button>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: 'var(--paper-3)' }}>
              {activeTab === 'category' ? <Layers size={24} style={{ color: 'var(--ink-4)' }} /> : <Tag size={24} style={{ color: 'var(--ink-4)' }} />}
            </div>
            <p className="font-medium" style={{ color: 'var(--ink)' }}>No {activeTab === 'category' ? 'categories' : 'tags'} yet.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => openCreate(activeTab)}>
              <Plus size={14} /> Create one
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <Card key={item.id} className="transition-all duration-200 group hover:border-[var(--nw-accent)]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.color ?? 'var(--ink-4)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{item.name}</p>
                    {item.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-4)' }}>{item.description}</p>}
                    <Badge variant="default" className="text-[10px] mt-2">
                      {SCOPES.find((s) => s.value === item.scope)?.label ?? item.scope}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => openEdit(item)}><Pencil size={12} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => handleDelete(item)}><Trash2 size={12} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? `Edit ${form.type}` : `New ${activeTab}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={activeTab === 'category' ? 'e.g. Policy' : 'e.g. iso9001'} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description <span className="font-normal" style={{ color: 'var(--ink-4)' }}>(optional)</span></Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Applies to</Label>
              <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                className="w-full rounded-[2px] text-sm px-3 py-2 focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}>
                {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--risk)' }}>{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
