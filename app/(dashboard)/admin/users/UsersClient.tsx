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

const roleVariant: Record<string, 'warn' | 'ok' | 'default'> = {
  admin: 'warn', manager: 'ok', user: 'default',
}
const roleLabel: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', user: 'User',
}
const roleIcon: Record<string, React.ReactNode> = {
  admin: <ShieldCheck size={11} />, manager: <Shield size={11} />, user: <User size={11} />,
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
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Users</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>Manage user accounts and roles.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openInvite}>
          <UserPlus size={14} />
          Add user
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-4)' }} />
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
          const count = users.filter((u) => u.id !== SYSTEM_ID && u.role === role).length
          return (
            <Card key={role}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-[2px]" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}>
                  {roleIcon[role]}
                </div>
                <div>
                  <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{count}</p>
                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{roleLabel[role]}{count !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* User list */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'var(--ink-4)' }}>
              {search ? 'No users match your search.' : 'No users found.'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                  <th className="text-left text-xs font-medium px-5 py-3" style={{ color: 'var(--ink-4)' }}>User</th>
                  <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--ink-4)' }}>Role</th>
                  <th className="text-left text-xs font-medium px-4 py-3 hidden md:table-cell" style={{ color: 'var(--ink-4)' }}>Groups</th>
                  <th className="text-left text-xs font-medium px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--ink-4)' }}>Added</th>
                  <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--ink-4)' }}>Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const userGroups = groups.filter((g) => u.groups.includes(g.id))
                  return (
                    <tr key={u.id} className="hover:bg-[var(--paper-2)] transition-colors" style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs font-medium" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}>
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{u.name}</p>
                            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleVariant[u.role] ?? 'default'} className="text-xs flex items-center gap-1 w-fit">
                          {roleIcon[u.role]}
                          {roleLabel[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {userGroups.slice(0, 2).map((g) => (
                            <span key={g.id} className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}>{g.name}</span>
                          ))}
                          {userGroups.length > 2 && (
                            <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>+{userGroups.length - 2}</span>
                          )}
                          {userGroups.length === 0 && <span className="text-xs" style={{ color: 'var(--ink-4)' }}>—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
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
                            className="h-7 w-7"
                            style={{ color: 'var(--ink-4)' }}
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            style={{ color: 'var(--ink-4)' }}
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
                className="w-full rounded-[2px] text-sm px-3 py-2 focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New password <span className="font-normal" style={{ color: 'var(--ink-4)' }}>(leave blank to keep current)</span></Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--risk)' }}>{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
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
                className="w-full rounded-[2px] text-sm px-3 py-2 focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--risk)' }}>{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInvite} disabled={saving || !form.name || !form.email || !form.password}>
              {saving ? 'Creating...' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
