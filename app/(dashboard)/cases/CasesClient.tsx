'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  List, Clock, CheckCircle, User, GitBranch, Bookmark, Plus, Trash2,
  ChevronDown, ChevronRight, Search, Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Instance {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  workflow: { name: string }
  creator?: { name: string }
}

interface SavedView {
  id: string
  name: string
  filters: Record<string, string>
}

const STATUS_COLORS: Record<string, string> = {
  running:   'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  error:     'bg-red-100 text-red-700 border-red-200',
}

const PREDEFINED_VIEWS = [
  { label: 'All cases',   href: '/cases',                     icon: <List size={14} /> },
  { label: 'Running',     href: '/cases?status=running',      icon: <Clock size={14} /> },
  { label: 'Completed',   href: '/cases?status=completed',    icon: <CheckCircle size={14} /> },
  { label: 'Cancelled',   href: '/cases?status=cancelled',    icon: <List size={14} /> },
  { label: 'My cases',    href: '/cases?view=mine',           icon: <User size={14} /> },
  { label: 'Per workflow',href: '/cases?view=by-workflow',    icon: <GitBranch size={14} /> },
]

function ViewNav({
  savedViews,
  onDelete,
  onSave,
}: {
  savedViews: SavedView[]
  onDelete: (id: string) => void
  onSave: () => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const isCurrent = (href: string) => {
    const url = new URL(href, 'http://x')
    const status = url.searchParams.get('status')
    const view = url.searchParams.get('view')
    return (
      url.pathname === '/cases' &&
      (status ?? '') === (searchParams.get('status') ?? '') &&
      (view ?? '') === (searchParams.get('view') ?? '') &&
      !searchParams.get('saved')
    )
  }

  const isSavedActive = (v: SavedView) => searchParams.get('saved') === v.id

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="p-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Views</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {PREDEFINED_VIEWS.map((v) => (
          <button
            key={v.href}
            onClick={() => router.push(v.href)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
              isCurrent(v.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}

        {savedViews.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saved views</p>
            </div>
            {savedViews.map((v) => (
              <div key={v.id} className="flex items-center group">
                <button
                  onClick={() => router.push(`/cases?saved=${v.id}`)}
                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
                    isSavedActive(v)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark size={14} />
                  <span className="truncate">{v.name}</span>
                </button>
                <button
                  onClick={() => onDelete(v.id)}
                  className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </>
        )}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onSave}>
          <Plus size={12} className="mr-1" /> Save current view
        </Button>
      </div>
    </aside>
  )
}

function GroupedByWorkflow({ instances }: { instances: Instance[] }) {
  const groups: Record<string, Instance[]> = {}
  for (const i of instances) {
    const key = i.workflow.name
    if (!groups[key]) groups[key] = []
    groups[key].push(i)
  }
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(groups).map((k) => [k, true]))
  )

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([wfName, items]) => (
        <div key={wfName} className="border border-slate-200/80 rounded-lg overflow-hidden backdrop-blur-sm">
          <button
            onClick={() => setOpen((p) => ({ ...p, [wfName]: !p[wfName] }))}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/85 hover:bg-white/95 transition-colors text-left"
          >
            {open[wfName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="font-medium text-sm text-slate-700">{wfName}</span>
            <Badge variant="outline" className="ml-auto text-xs">{items.length}</Badge>
          </button>
          {open[wfName] && (
            <div className="divide-y divide-slate-100/80">
              {items.map((inst) => <CaseRow key={inst.id} inst={inst} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CaseRow({ inst }: { inst: Instance }) {
  return (
    <Link
      href={`/workflows/instances/${inst.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-white/85 hover:bg-white/95 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{inst.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{inst.workflow.name}</p>
      </div>
      <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[inst.status] ?? ''}`}>
        {inst.status}
      </Badge>
      <span className="text-xs text-slate-400 shrink-0">
        {formatDistanceToNow(new Date(inst.updatedAt), { addSuffix: true })}
      </span>
    </Link>
  )
}

export function CasesClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams()
  const [instances, setInstances] = useState<Instance[]>([])
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)

  const status = searchParams.get('status')
  const view = searchParams.get('view')
  const savedId = searchParams.get('saved')

  const fetchViews = useCallback(async () => {
    const res = await fetch('/api/views')
    const data = await res.json()
    setSavedViews(data.views ?? [])
  }, [])

  useEffect(() => { fetchViews() }, [fetchViews])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (view === 'mine') params.set('createdBy', userId)

    // If saved view — load filters from it
    if (savedId) {
      const sv = savedViews.find((v) => v.id === savedId)
      if (sv) {
        Object.entries(sv.filters).forEach(([k, v]) => params.set(k, v))
      }
    }

    fetch(`/api/instances?${params}`)
      .then((r) => r.json())
      .then((d) => { setInstances(d.instances ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, view, savedId, savedViews, userId])

  const deleteView = async (id: string) => {
    await fetch(`/api/views/${id}`, { method: 'DELETE' })
    fetchViews()
  }

  const handleSave = async () => {
    if (!saveName.trim()) return
    setSaving(true)
    const filters: Record<string, string> = {}
    if (status) filters.status = status
    if (view) filters.view = view
    await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName.trim(), filters }),
    })
    setSaving(false)
    setSaveDialogOpen(false)
    setSaveName('')
    fetchViews()
  }

  const filtered = instances.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.workflow.name.toLowerCase().includes(search.toLowerCase())
  )

  const byWorkflow = view === 'by-workflow'

  return (
    <div className="flex h-full">
      <ViewNav
        savedViews={savedViews}
        onDelete={deleteView}
        onSave={() => setSaveDialogOpen(true)}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Cases</h1>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search cases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">No cases found.</div>
        ) : byWorkflow ? (
          <GroupedByWorkflow instances={filtered} />
        ) : (
          <div className="border border-slate-200/80 rounded-lg divide-y divide-slate-100/80 backdrop-blur-sm overflow-hidden">
            {filtered.map((inst) => <CaseRow key={inst.id} inst={inst} />)}
          </div>
        )}
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="View name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !saveName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
