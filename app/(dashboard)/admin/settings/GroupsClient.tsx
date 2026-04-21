'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string | null
  members: string[]
}

interface UserOption {
  id: string
  name: string
  email: string
}

interface Props {
  initialGroups: Group[]
  users: UserOption[]
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function GroupsClient({ initialGroups, users }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [groups, setGroups] = useState(initialGroups)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => startTransition(() => router.refresh())

  const openEdit = (g: Group) => {
    setEditGroup(g)
    setForm({ name: g.name, description: g.description ?? '' })
    setSelectedMembers(g.members)
    setError('')
  }

  const openCreate = () => {
    setShowCreate(true)
    setForm({ name: '', description: '' })
    setSelectedMembers([])
    setError('')
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSaveEdit = async () => {
    if (!editGroup) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/admin/groups/${editGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.description || null, members: selectedMembers }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error: string }).error); return }
    const { group } = await res.json() as { group: Group }
    setGroups((prev) => prev.map((g) => g.id === group.id ? group : g))
    setEditGroup(null)
    refresh()
  }

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.description || null }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error: string }).error); return }
    const { group } = await res.json() as { group: Group }
    setGroups((prev) => [...prev, group])
    setShowCreate(false)
    refresh()
  }

  const handleDelete = async (g: Group) => {
    if (!confirm(`Delete group "${g.name}"?`)) return
    setGroups((prev) => prev.filter((x) => x.id !== g.id))
    await fetch(`/api/admin/groups/${g.id}`, { method: 'DELETE' })
    refresh()
  }

  const GroupDialog = ({ open, onClose, onSave, title }: { open: boolean; onClose: () => void; onSave: () => void; title: string }) => (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Group name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description <span className="font-normal" style={{ color: 'var(--ink-4)' }}>(optional)</span></Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
          </div>
          {editGroup && (
            <div className="space-y-2">
              <Label className="text-xs">Members</Label>
              <div className="rounded-[2px] max-h-48 overflow-y-auto" style={{ border: '1px solid var(--rule)' }}>
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--paper-2)] cursor-pointer" style={{ borderBottom: '1px solid var(--rule)' }}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                      className="rounded"
                    />
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px]" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}>{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.name}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
            </div>
          )}
          {error && <p className="text-xs" style={{ color: 'var(--risk)' }}>{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={saving || !form.name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Groups</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Organize users into groups for assignment and permissions.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus size={14} />
          New group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: 'var(--paper-3)' }}>
              <Users size={24} style={{ color: 'var(--ink-4)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--ink)' }}>No groups yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--ink-4)' }}>Create groups to organize users by department or role.</p>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus size={14} />
              New group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => {
            const memberUsers = users.filter((u) => g.members.includes(u.id))
            return (
              <Card key={g.id} className="transition-all duration-200 hover:border-[var(--nw-accent)]">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-[2px] shrink-0" style={{ background: 'var(--paper-3)' }}>
                      <Users size={16} style={{ color: 'var(--nw-accent)' }} />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => openEdit(g)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => handleDelete(g)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-2" style={{ color: 'var(--ink)' }}>{g.name}</CardTitle>
                  {g.description && <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{g.description}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex -space-x-1">
                      {memberUsers.slice(0, 4).map((u) => (
                        <Avatar key={u.id} className="h-6 w-6 border-2 border-white">
                          <AvatarFallback className="text-[9px]" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}>{initials(u.name)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Badge variant="default" className="text-[10px]">
                      {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <GroupDialog open={!!editGroup} onClose={() => setEditGroup(null)} onSave={handleSaveEdit} title="Edit group" />
      <GroupDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="New group" />
    </div>
  )
}
