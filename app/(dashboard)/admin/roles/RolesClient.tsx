'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Shield, Trash2, Pencil, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { confirmDialog } from '@/components/ui/confirm'

interface ProcessRole {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export function RolesClient({ initialRoles }: { initialRoles: ProcessRole[] }) {
  const [roles, setRoles] = useState(initialRoles)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<ProcessRole | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      })
      const data = await res.json() as { role: ProcessRole }
      setRoles((prev) => [...prev, data.role].sort((a, b) => a.name.localeCompare(b.name)))
      setShowNew(false)
      setNewName('')
      setNewDesc('')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog('Delete this role? Workflows and approval flows referencing it will need to be updated.'))) return
    setDeleting(id)
    try {
      await fetch(`/api/roles/${id}`, { method: 'DELETE' })
      setRoles((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const openEdit = (role: ProcessRole) => {
    setEditing(role)
    setEditName(role.name)
    setEditDesc(role.description ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editing || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/roles/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      })
      const data = await res.json() as { role: ProcessRole }
      setRoles((prev) => prev.map((r) => r.id === editing.id ? data.role : r).sort((a, b) => a.name.localeCompare(b.name)))
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Process Roles</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-4)' }}>
            Define named roles used in workflow assignments and document approval flows.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 h-8 text-sm">
          <Plus size={14} /> New role
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2px]" style={{ border: '1px dashed var(--rule)', background: 'var(--paper-2)' }}>
          <Shield size={32} className="mb-3" style={{ color: 'var(--ink-4)' }} />
          <p className="font-medium text-sm" style={{ color: 'var(--ink-3)' }}>No roles defined yet.</p>
          <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--ink-4)' }}>
            Create roles like "Legal Reviewer" or "Technical Approver" to use in workflows and approval flows.
          </p>
          <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={13} /> New role
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center gap-4 px-4 py-3 rounded-[2px] group"
              style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-tint)' }}>
                <Shield size={14} style={{ color: 'var(--nw-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{role.name}</p>
                {role.description && (
                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{role.description}</p>
                )}
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--ink-4)' }}>
                {formatDistanceToNow(new Date(role.updatedAt), { addSuffix: true })}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(role)}
                  className="p-1.5 rounded-[2px] transition-colors"
                  style={{ color: 'var(--ink-4)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  disabled={deleting === role.id}
                  className="p-1.5 rounded-[2px] transition-colors"
                  style={{ color: 'var(--ink-4)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                >
                  {deleting === role.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New process role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Role name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Legal Reviewer"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this role do?"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 size={13} className="animate-spin mr-1.5" /> : null}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Role name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
                {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
