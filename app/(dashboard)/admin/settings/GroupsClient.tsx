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
            <Label className="text-xs">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
          </div>
          {editGroup && (
            <div className="space-y-2">
              <Label className="text-xs">Members</Label>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                      className="rounded"
                    />
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onSave} disabled={saving || !form.name}>
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
          <h1 className="text-2xl font-semibold text-slate-900">Groups</h1>
          <p className="text-sm text-slate-500 mt-1">Organize users into groups for assignment and permissions.</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={openCreate}>
          <Plus size={14} />
          New group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">No groups yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Create groups to organize users by department or role.</p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={openCreate}>
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
              <Card key={g.id} className="shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                      <Users size={16} className="text-blue-600" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEdit(g)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(g)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-800 mt-2">{g.name}</CardTitle>
                  {g.description && <p className="text-xs text-slate-500">{g.description}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex -space-x-1">
                      {memberUsers.slice(0, 4).map((u) => (
                        <Avatar key={u.id} className="h-6 w-6 border-2 border-white">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-[9px]">{initials(u.name)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
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
