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
            className={`w-6 h-6 rounded-full border-2 transition-all ${value === c ? 'border-slate-800 scale-110' : 'border-transparent hover:border-slate-400'}`}
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
        <h1 className="text-2xl font-semibold text-slate-900">Register</h1>
        <p className="text-sm text-slate-500 mt-1">Manage categories and tags used across documents, workflows, and processes.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {[{ key: 'category', label: 'Categories', icon: <Layers size={14} /> }, { key: 'tag', label: 'Tags', icon: <Tag size={14} /> }].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key as 'category' | 'tag')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                activeTab === t.key ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              {t.icon}{t.label}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {items.filter((i) => i.type === t.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {filtered.length} {activeTab === 'category' ? 'categor' : 'tag'}{filtered.length !== 1 ? (activeTab === 'category' ? 'ies' : 's') : (activeTab === 'category' ? 'y' : '')} defined
        </p>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => openCreate(activeTab)}>
          <Plus size={14} /> New {activeTab}
        </Button>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              {activeTab === 'category' ? <Layers size={24} className="text-slate-400" /> : <Tag size={24} className="text-slate-400" />}
            </div>
            <p className="font-medium text-slate-700">No {activeTab === 'category' ? 'categories' : 'tags'} yet.</p>
            <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => openCreate(activeTab)}>
              <Plus size={14} /> Create one
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <Card key={item.id} className="shadow-sm hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.color ?? '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>}
                    <Badge variant="outline" className="text-[10px] mt-2 text-slate-500 border-slate-200">
                      {SCOPES.find((s) => s.value === item.scope)?.label ?? item.scope}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEdit(item)}><Pencil size={12} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(item)}><Trash2 size={12} /></Button>
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
              <Label className="text-xs">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Applies to</Label>
              <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
