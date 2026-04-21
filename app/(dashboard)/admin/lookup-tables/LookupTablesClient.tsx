'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Table2, Loader2, ChevronRight, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LookupTableRow {
  id: string
  name: string
  description: string | null
  scope: string
  valueCount: number
  createdAt: string
  updatedAt: string
}

const SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'workflow', label: 'Workflows' },
  { value: 'process', label: 'Processes' },
]

function scopeLabel(s: string) {
  return SCOPES.find((x) => x.value === s)?.label ?? s
}

export function LookupTablesClient({ initialTables }: { initialTables: LookupTableRow[] }) {
  const router = useRouter()
  const [tables, setTables] = useState(initialTables)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newScope, setNewScope] = useState('all')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/lookup-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, scope: newScope }),
      })
      const data = await res.json() as { table: { id: string; name: string; description: string | null; scope: string; createdAt: string; updatedAt: string } }
      setTables((prev) => [...prev, { ...data.table, valueCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      setShowNew(false)
      setNewName('')
      setNewDesc('')
      setNewScope('all')
      router.push(`/admin/lookup-tables/${data.table.id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lookup table and all its values?')) return
    setDeleting(id)
    try {
      await fetch(`/api/lookup-tables/${id}`, { method: 'DELETE' })
      setTables((prev) => prev.filter((t) => t.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Lookup Tables</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage reusable option lists for form fields.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 gap-2 h-8 text-sm">
          <Plus size={14} /> New table
        </Button>
      </div>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Table2 size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-sm">No lookup tables yet.</p>
          <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={13} /> New table
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tables.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer"
              onClick={() => router.push(`/admin/lookup-tables/${t.id}`)}
            >
              <Table2 size={18} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                  {t.name}
                </p>
                {t.description && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
                  {scopeLabel(t.scope)}
                </span>
                <span className="text-xs text-slate-400">{t.valueCount} value{t.valueCount !== 1 ? 's' : ''}</span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                  disabled={deleting === t.id}
                  className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  {deleting === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={(v) => !v && setShowNew(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New lookup table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Name</label>
              <Input
                placeholder="e.g. Risk Level"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Description <span className="text-slate-400">(optional)</span></label>
              <Input
                placeholder="What is this list used for?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Scope</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creating && <Loader2 size={14} className="animate-spin mr-1" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
