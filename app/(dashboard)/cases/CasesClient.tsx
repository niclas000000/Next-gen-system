'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  List, Clock, CheckCircle, User, GitBranch, Bookmark,
  Plus, Trash2, ChevronDown, ChevronRight, Search, Loader2,
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

interface SystemView {
  id: string
  name: string
  section: string
  icon: string
  filters: Record<string, string>
  order: number
  isDefault: boolean
}

interface SavedView {
  id: string
  name: string
  filters: Record<string, string>
}

interface Workflow {
  id: string
  name: string
}

const STATUS_VARIANT: Record<string, 'warn' | 'ok' | 'default' | 'risk'> = {
  running:   'warn',
  completed: 'ok',
  cancelled: 'default',
  error:     'risk',
}

const ICON_MAP: Record<string, React.ReactNode> = {
  List: <List size={14} />, Clock: <Clock size={14} />, CheckCircle: <CheckCircle size={14} />,
  User: <User size={14} />, GitBranch: <GitBranch size={14} />,
}
function iconFromName(n: string) { return ICON_MAP[n] ?? <List size={14} /> }

function buildHref(base: string, filters: Record<string, string>) {
  const p = new URLSearchParams(filters)
  return p.toString() ? `${base}?${p}` : base
}

// ---------------------------------------------------------------------------
// Left panel
// ---------------------------------------------------------------------------
function ViewPanel({
  systemViews,
  savedViews,
  onDelete,
  onSave,
  onStartCase,
}: {
  systemViews: SystemView[]
  savedViews: SavedView[]
  onDelete: (id: string) => void
  onSave: () => void
  onStartCase: () => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const isViewActive = (href: string) => {
    const url = new URL(href, 'http://x')
    const sp = searchParams
    if (!window.location.pathname.startsWith(url.pathname)) return false
    for (const [k, v] of url.searchParams.entries()) {
      if (sp.get(k) !== v) return false
    }
    if (url.searchParams.size === 0 && sp.toString() !== '') return sp.toString() === ''
    return true
  }

  const isSavedActive = (id: string) => searchParams.get('saved') === id

  const navBtn = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <button
      key={href}
      onClick={() => router.push(href)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[2px] text-sm transition-colors text-left"
      style={{
        color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
        background: active ? 'var(--accent-tint)' : '',
        fontWeight: active ? '500' : '400',
        borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '' }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <aside className="w-52 shrink-0 flex flex-col h-full" style={{ background: 'var(--paper-2)', borderRight: '1px solid var(--rule)' }}>
      <div className="p-2" style={{ borderBottom: '1px solid var(--rule)' }}>
        <Button className="w-full gap-1.5 text-sm h-8" onClick={onStartCase}>
          <Plus size={14} /> Start case
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll p-1.5 space-y-0.5">
        {systemViews.length > 0 && (
          <p className="mono-meta text-[10px] px-2 pt-1 pb-0.5" style={{ color: 'var(--ink-4)' }}>Views</p>
        )}
        {systemViews.map((v) => {
          const href = buildHref('/cases', v.filters)
          return navBtn(href, v.name, iconFromName(v.icon), isViewActive(href))
        })}

        {savedViews.length > 0 && (
          <p className="mono-meta text-[10px] px-2 pt-3 pb-0.5" style={{ color: 'var(--ink-4)' }}>My views</p>
        )}
        {savedViews.map((v) => {
          const active = isSavedActive(v.id)
          return (
            <div key={v.id} className="flex items-center group">
              <button
                onClick={() => router.push(`/cases?saved=${v.id}`)}
                className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-[2px] text-sm transition-colors text-left"
                style={{
                  color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
                  background: active ? 'var(--accent-tint)' : '',
                  fontWeight: active ? '500' : '400',
                  borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '' }}
              >
                <Bookmark size={14} />
                <span className="truncate">{v.name}</span>
              </button>
              <button
                onClick={() => onDelete(v.id)}
                className="p-1 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                style={{ color: 'var(--ink-4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="p-2" style={{ borderTop: '1px solid var(--rule)' }}>
        <Button variant="secondary" size="sm" className="w-full text-xs gap-1 h-7" onClick={onSave}>
          <Plus size={12} /> Save current view
        </Button>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Case list components
// ---------------------------------------------------------------------------
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
        <div key={wfName} className="rounded-[2px] overflow-hidden" style={{ border: '1px solid var(--rule)' }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, [wfName]: !p[wfName] }))}
            className="w-full flex items-center gap-2 px-4 py-2.5 transition-colors text-left"
            style={{ background: 'var(--paper-2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
          >
            {open[wfName] ? <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ink-3)' }} />}
            <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{wfName}</span>
            <Badge variant="default" className="ml-auto text-xs">{items.length}</Badge>
          </button>
          {open[wfName] && (
            <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
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
      className="flex items-center gap-4 px-4 py-3 transition-colors"
      style={{ background: 'var(--surface)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{inst.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>{inst.workflow.name}</p>
      </div>
      <Badge variant={STATUS_VARIANT[inst.status] ?? 'default'} className="text-xs shrink-0">
        {inst.status}
      </Badge>
      <span className="text-xs shrink-0" style={{ color: 'var(--ink-4)' }}>
        {formatDistanceToNow(new Date(inst.updatedAt), { addSuffix: true })}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CasesClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [instances, setInstances]   = useState<Instance[]>([])
  const [systemViews, setSystemViews] = useState<SystemView[]>([])
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName]             = useState('')
  const [saving, setSaving]                 = useState(false)

  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [workflows, setWorkflows]             = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState('')
  const [caseTitle, setCaseTitle]             = useState('')
  const [starting, setStarting]               = useState(false)

  const status  = searchParams.get('status')
  const view    = searchParams.get('view')
  const savedId = searchParams.get('saved')

  const fetchViews = useCallback(async () => {
    const res = await fetch('/api/views')
    const data = await res.json()
    setSavedViews(data.views ?? [])
  }, [])

  useEffect(() => { fetchViews() }, [fetchViews])

  useEffect(() => {
    fetch('/api/system-views?section=cases')
      .then((r) => r.json())
      .then((d: { views: SystemView[] }) => setSystemViews(d.views ?? []))
      .catch(() => {})
  }, [])

  const openStartDialog = useCallback(async () => {
    const res = await fetch('/api/workflows')
    const data = await res.json()
    setWorkflows((data.workflows ?? []).filter((w: Workflow & { status: string }) => w.status === 'published'))
    setSelectedWorkflow('')
    setCaseTitle('')
    setStartDialogOpen(true)
  }, [])

  const handleStartCase = async () => {
    if (!selectedWorkflow) return
    setStarting(true)
    const wf = workflows.find((w) => w.id === selectedWorkflow)
    const res = await fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: selectedWorkflow, title: caseTitle.trim() || wf?.name }),
    })
    const data = await res.json()
    setStarting(false)
    setStartDialogOpen(false)
    if (data.instance?.id) router.push(`/workflows/instances/${data.instance.id}`)
  }

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (view === 'mine') params.set('createdBy', userId)
    if (savedId) {
      const sv = savedViews.find((v) => v.id === savedId)
      if (sv) Object.entries(sv.filters).forEach(([k, v]) => params.set(k, v))
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
      <ViewPanel
        systemViews={systemViews}
        savedViews={savedViews}
        onDelete={deleteView}
        onSave={() => setSaveDialogOpen(true)}
        onStartCase={openStartDialog}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Cases</h1>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-4)' }} />
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
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-sm" style={{ color: 'var(--ink-4)' }}>No cases found.</div>
        ) : byWorkflow ? (
          <GroupedByWorkflow instances={filtered} />
        ) : (
          <div className="rounded-[2px] overflow-hidden" style={{ border: '1px solid var(--rule)' }}>
            {filtered.map((inst) => <CaseRow key={inst.id} inst={inst} />)}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save view</DialogTitle></DialogHeader>
          <Input
            placeholder="View name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !saveName.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Start case</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Workflow</label>
              {workflows.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No published workflows available.</p>
              ) : (
                <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a workflow…" /></SelectTrigger>
                  <SelectContent>
                    {workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Title <span style={{ color: 'var(--ink-4)' }}>(optional)</span></label>
              <Input
                placeholder="Leave blank to use workflow name"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartCase()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStartCase} disabled={starting || !selectedWorkflow}>
              {starting ? <><Loader2 size={14} className="animate-spin mr-1.5" />Starting…</> : 'Start case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
