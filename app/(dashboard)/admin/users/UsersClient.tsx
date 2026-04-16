'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Search, UserPlus, Pencil, Trash2, ShieldCheck, Shield, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  groups: string[]
  active: boolean
  createdAt: string
}

interface Group {
  id: string
  name: string
  description: string | null
  members: string[]
}

interface Props {
  initialUsers: UserRow[]
  groups: Group[]
}

const roleConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  admin:   { label: 'Admin',   class: 'bg-purple-100 text-purple-700 border-purple-200', icon: <ShieldCheck size={11} /> },
  manager: { label: 'Manager', class: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <Shield size={11} /> },
  user:    { label: 'User',    class: 'bg-slate-100 text-slate-600 border-slate-200',     icon: <User size={11} /> },
}

const SYSTEM_ID = 'system-placeholder-user'

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type FormState = { name: string; email: string; password: string; role: string }
const emptyForm: FormState = { name: '', email: '', password: '', role: 'user' }

export function UsersClient({ initialUsers, groups }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = users.filter(
    (u) =>
      u.id !== SYSTEM_ID &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const refresh = () => startTransition(() => router.refresh())

  const openEdit = (u: UserRow) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setError('')
  }

  const openInvite = () => {
    setShowInvite(true)
    setForm(emptyForm)
    setError('')
  }

  const handleToggleActive = async (u: UserRow) => {
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, active: !x.active } : x))
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    refresh()
  }

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return
    setUsers((prev) => prev.filter((x) => x.id !== u.id))
    await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    refresh()
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    setError('')
    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role }
    if (form.password) body.password = form.password
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error: string }).error); return }
    const { user } = await res.json() as { user: UserRow }
    setUsers((prev) => prev.map((x) => x.id === user.id ? { ...x, ...user } : x))
    setEditUser(null)
    refresh()
  }

  const handleInvite = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error: string }).error); return }
    const { user } = await res.json() as { user: UserRow }
    setUsers((prev) => [user, ...prev])
    setShowInvite(false)
    refresh()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage user accounts and roles.</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={openInvite}>
          <UserPlus size={14} />
          Add user
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-8 text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'manager', 'user'] as const).map((role) => {
          const cfg = roleConfig[role]
          const count = users.filter((u) => u.id !== SYSTEM_ID && u.role === role).length
          return (
            <Card key={role} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cfg.class.replace('text-', 'bg-').replace('-700', '-100').replace('-600', '-100')}`}>
                  {cfg.icon}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500">{cfg.label}{count !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* User list */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              {search ? 'No users match your search.' : 'No users found.'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Groups</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Added</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const cfg = roleConfig[u.role] ?? roleConfig.user
                  const userGroups = groups.filter((g) => u.groups.includes(g.id))
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${cfg.class}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {userGroups.slice(0, 2).map((g) => (
                            <span key={g.id} className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{g.name}</span>
                          ))}
                          {userGroups.length > 2 && (
                            <span className="text-[10px] text-slate-400">+{userGroups.length - 2}</span>
                          )}
                          {userGroups.length === 0 && <span className="text-xs text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={u.active}
                          onCheckedChange={() => handleToggleActive(u)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-blue-600"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-500"
                            onClick={() => handleDelete(u)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={(o) => !o && setShowInvite(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@company.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleInvite} disabled={saving || !form.name || !form.email || !form.password}>
              {saving ? 'Creating...' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
