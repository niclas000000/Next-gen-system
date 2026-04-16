'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactFlow, {
  useNodesState, useEdgesState, addEdge, Background, Controls, MiniMap,
  type Connection, type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  GitBranch, FileText, Workflow, Target, ChevronRight, Plus,
  Pencil, Trash2, Check, X, Link2, Unlink, Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Process node types for canvas ──────────────────────────────────────────
function StartNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-12 h-12 rounded-full bg-green-500 border-2 border-green-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
      {data.label}
    </div>
  )
}
function EndNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-12 h-12 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
      {data.label}
    </div>
  )
}
function ActivityNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg bg-blue-500 border-2 border-blue-600 text-white text-xs font-medium shadow-sm min-w-[100px] text-center">
      {data.label}
    </div>
  )
}
function DecisionNode({ data }: { data: { label: string } }) {
  return (
    <div
      className="w-16 h-16 bg-orange-500 border-2 border-orange-600 text-white text-[10px] font-medium shadow-sm flex items-center justify-center text-center px-1"
      style={{ transform: 'rotate(45deg)' }}
    >
      <span style={{ transform: 'rotate(-45deg)' }}>{data.label}</span>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  activity: ActivityNode,
  decision: DecisionNode,
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ProcessDetail {
  id: string
  name: string
  description: string | null
  purpose: string | null
  scope: string | null
  status: string
  category: string | null
  tags: string[]
  parentId: string | null
  parent: { id: string; name: string } | null
  owner: { id: true; name: string } | null
  children: { id: string; name: string; status: string }[]
  nodes: unknown[]
  edges: unknown[]
  kpis: unknown[]
  documents: { id: string; title: string; status: string; category: string | null; updatedAt: string }[]
  workflows: { id: string; name: string; status: string; updatedAt: string }[]
  createdAt: string
  updatedAt: string
}

interface KPI { id: string; name: string; description: string; value: string; unit: string; target: string }

const statusConfig: Record<string, { label: string; class: string }> = {
  draft:    { label: 'Draft',    class: 'bg-slate-100 text-slate-600 border-slate-200' },
  active:   { label: 'Active',   class: 'bg-green-100 text-green-700 border-green-200' },
  archived: { label: 'Archived', class: 'bg-orange-100 text-orange-700 border-orange-200' },
}
const docStatus: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', published: 'bg-green-100 text-green-700', archived: 'bg-orange-100 text-orange-700',
}

let nodeIdCounter = 100

export function ProcessDetailClient({
  process: initial, allDocuments, allWorkflows, allUsers,
}: {
  process: ProcessDetail
  allDocuments: { id: string; title: string; status: string }[]
  allWorkflows: { id: string; name: string; status: string }[]
  allUsers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'overview' | 'canvas' | 'documents' | 'workflows' | 'kpis'>('overview')
  const [process, setProcess] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: initial.name, description: initial.description ?? '', purpose: initial.purpose ?? '', scope: initial.scope ?? '', status: initial.status, ownerId: (initial.owner as { id: string; name: string } | null)?.id ?? '' })
  const [saving, setSaving] = useState(false)

  // Canvas
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initial.nodes as never[] ?? [])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initial.edges as never[] ?? [])
  const [canvasDirty, setCanvasDirty] = useState(false)

  // Links
  const [linkedDocs, setLinkedDocs] = useState(initial.documents)
  const [linkedWorkflows, setLinkedWorkflows] = useState(initial.workflows)
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [showWfPicker, setShowWfPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  // KPIs
  const [kpis, setKpis] = useState<KPI[]>((initial.kpis as KPI[]) ?? [])
  const [editKpi, setEditKpi] = useState<KPI | null>(null)
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [kpiForm, setKpiForm] = useState<Omit<KPI, 'id'>>({ name: '', description: '', value: '', unit: '', target: '' })

  const refresh = () => startTransition(() => router.refresh())

  const patch = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/processes/${process.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok ? (await res.json() as { process: ProcessDetail }).process : null
  }

  const saveOverview = async () => {
    setSaving(true)
    const updated = await patch({ name: form.name, description: form.description || null, purpose: form.purpose || null, scope: form.scope || null, status: form.status, ownerId: form.ownerId || null })
    setSaving(false)
    if (updated) { setProcess((p) => ({ ...p, ...updated })); setEditing(false); refresh() }
  }

  const saveCanvas = async () => {
    setSaving(true)
    await patch({ nodes: rfNodes, edges: rfEdges })
    setSaving(false)
    setCanvasDirty(false)
  }

  const onConnect = useCallback((conn: Connection) => {
    setRfEdges((eds) => addEdge({ ...conn, type: 'smoothstep' }, eds))
    setCanvasDirty(true)
  }, [setRfEdges])

  const addNode = (type: string, label: string) => {
    const id = `node_${++nodeIdCounter}`
    setRfNodes((nds) => [...nds, { id, type, position: { x: 200, y: 100 + nds.length * 80 }, data: { label } }])
    setCanvasDirty(true)
  }

  const linkDocument = async (docId: string) => {
    await fetch(`/api/processes/${process.id}/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'document', targetId: docId }),
    })
    const doc = allDocuments.find((d) => d.id === docId)!
    setLinkedDocs((prev) => [...prev, { id: doc.id, title: doc.title, status: doc.status, category: null, updatedAt: new Date().toISOString() }])
    setShowDocPicker(false)
  }

  const unlinkDocument = async (docId: string) => {
    await fetch(`/api/processes/${process.id}/links`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'document', targetId: docId }),
    })
    setLinkedDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  const linkWorkflow = async (wfId: string) => {
    await fetch(`/api/processes/${process.id}/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'workflow', targetId: wfId }),
    })
    const wf = allWorkflows.find((w) => w.id === wfId)!
    setLinkedWorkflows((prev) => [...prev, { id: wf.id, name: wf.name, status: wf.status, updatedAt: new Date().toISOString() }])
    setShowWfPicker(false)
  }

  const unlinkWorkflow = async (wfId: string) => {
    await fetch(`/api/processes/${process.id}/links`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'workflow', targetId: wfId }),
    })
    setLinkedWorkflows((prev) => prev.filter((w) => w.id !== wfId))
  }

  const saveKpis = async (updated: KPI[]) => {
    setKpis(updated)
    await patch({ kpis: updated })
  }

  const openAddKpi = () => {
    setEditKpi(null)
    setKpiForm({ name: '', description: '', value: '', unit: '', target: '' })
    setShowKpiForm(true)
  }
  const openEditKpi = (k: KPI) => {
    setEditKpi(k)
    setKpiForm({ name: k.name, description: k.description, value: k.value, unit: k.unit, target: k.target })
    setShowKpiForm(true)
  }
  const handleSaveKpi = async () => {
    if (!kpiForm.name) return
    const updated = editKpi
      ? kpis.map((k) => k.id === editKpi.id ? { ...editKpi, ...kpiForm } : k)
      : [...kpis, { id: `kpi_${Date.now()}`, ...kpiForm }]
    await saveKpis(updated)
    setShowKpiForm(false)
  }
  const deleteKpi = async (id: string) => saveKpis(kpis.filter((k) => k.id !== id))

  const cfg = statusConfig[process.status] ?? statusConfig.draft
  const tabs = [
    { key: 'overview', label: 'Overview', icon: <GitBranch size={14} /> },
    { key: 'canvas', label: 'Canvas', icon: <Target size={14} /> },
    { key: 'documents', label: `Documents (${linkedDocs.length})`, icon: <FileText size={14} /> },
    { key: 'workflows', label: `Workflows (${linkedWorkflows.length})`, icon: <Workflow size={14} /> },
    { key: 'kpis', label: `KPIs (${kpis.length})`, icon: <Target size={14} /> },
  ] as const

  const unlinkedDocs = allDocuments.filter((d) => !linkedDocs.some((ld) => ld.id === d.id))
    .filter((d) => !pickerSearch || d.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  const unlinkedWfs = allWorkflows.filter((w) => !linkedWorkflows.some((lw) => lw.id === w.id))
    .filter((w) => !pickerSearch || w.name.toLowerCase().includes(pickerSearch.toLowerCase()))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/processes" className="hover:text-blue-600 transition-colors">Processes</Link>
        {process.parent && (
          <>
            <ChevronRight size={14} />
            <Link href={`/processes/${process.parent.id}`} className="hover:text-blue-600 transition-colors">{process.parent.name}</Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-slate-800 font-medium">{process.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50">
            <GitBranch size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{process.name}</h1>
              <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
            </div>
            {process.owner && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Users size={12} /> {process.owner.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {tab === 'canvas' && canvasDirty && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={saveCanvas} disabled={saving}>
              {saving ? 'Saving...' : 'Save canvas'}
            </Button>
          )}
          {tab === 'overview' && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={13} className="mr-1.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {editing ? (
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Purpose <span className="text-slate-400 font-normal">(Syfte)</span></Label>
                    <Textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} rows={3} placeholder="Why does this process exist?" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Scope <span className="text-slate-400 font-normal">(Omfång)</span></Label>
                    <Textarea value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} rows={2} placeholder="What is included and excluded?" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Owner</Label>
                    <select value={form.ownerId} onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">No owner</option>
                      {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X size={13} className="mr-1" />Cancel</Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={saveOverview} disabled={saving || !form.name}>
                    <Check size={13} className="mr-1" />{saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-2 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  {process.description && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-slate-700">{process.description}</p>
                    </div>
                  )}
                  {process.purpose && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Purpose</p>
                      <p className="text-sm text-slate-700">{process.purpose}</p>
                    </div>
                  )}
                  {process.scope && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Scope</p>
                      <p className="text-sm text-slate-700">{process.scope}</p>
                    </div>
                  )}
                  {!process.description && !process.purpose && !process.scope && (
                    <p className="text-sm text-slate-400 italic">No description yet. Click Edit to add details.</p>
                  )}
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
                    </div>
                    {process.owner && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Owner</span>
                        <span className="text-slate-800 font-medium">{process.owner.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Documents</span>
                      <span className="font-medium">{linkedDocs.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Workflows</span>
                      <span className="font-medium">{linkedWorkflows.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">KPIs</span>
                      <span className="font-medium">{kpis.length}</span>
                    </div>
                    {process.children.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Sub-processes</span>
                        <span className="font-medium">{process.children.length}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Updated</span>
                      <span className="text-slate-400 text-xs">{formatDistanceToNow(new Date(process.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
                {process.children.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-processes</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                      {process.children.map((c) => (
                        <Link key={c.id} href={`/processes/${c.id}`}
                          className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 transition-colors py-0.5">
                          <GitBranch size={12} className="text-slate-400" />{c.name}
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CANVAS ── */}
      {tab === 'canvas' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Add node:</span>
            {[
              { type: 'start', label: 'Start', color: 'bg-green-100 text-green-700 border-green-200' },
              { type: 'activity', label: 'Activity', color: 'bg-blue-100 text-blue-700 border-blue-200' },
              { type: 'decision', label: 'Decision', color: 'bg-orange-100 text-orange-700 border-orange-200' },
              { type: 'end', label: 'End', color: 'bg-red-100 text-red-700 border-red-200' },
            ].map((n) => (
              <button key={n.type} onClick={() => addNode(n.type, n.label)}
                className={`px-3 py-1 rounded border text-xs font-medium transition-colors hover:opacity-80 ${n.color}`}>
                + {n.label}
              </button>
            ))}
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            <ReactFlow
              nodes={rfNodes} edges={rfEdges}
              onNodesChange={(changes) => { onNodesChange(changes); setCanvasDirty(true) }}
              onEdgesChange={(changes) => { onEdgesChange(changes); setCanvasDirty(true) }}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
          {canvasDirty && (
            <p className="text-xs text-orange-600">Unsaved changes — click &quot;Save canvas&quot; in the header.</p>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{linkedDocs.length} linked document{linkedDocs.length !== 1 ? 's' : ''}</p>
            <Button size="sm" variant="outline" onClick={() => { setPickerSearch(''); setShowDocPicker(true) }}>
              <Link2 size={13} className="mr-1.5" /> Link document
            </Button>
          </div>
          {linkedDocs.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-slate-400">No documents linked yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {linkedDocs.map((doc) => (
                <Card key={doc.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400">Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${docStatus[doc.status] ?? docStatus.draft}`}>{doc.status}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => unlinkDocument(doc.id)} title="Unlink">
                      <Unlink size={13} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WORKFLOWS ── */}
      {tab === 'workflows' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{linkedWorkflows.length} linked workflow{linkedWorkflows.length !== 1 ? 's' : ''}</p>
            <Button size="sm" variant="outline" onClick={() => { setPickerSearch(''); setShowWfPicker(true) }}>
              <Link2 size={13} className="mr-1.5" /> Link workflow
            </Button>
          </div>
          {linkedWorkflows.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-slate-400">No workflows linked yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {linkedWorkflows.map((wf) => (
                <Card key={wf.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Workflow size={16} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{wf.name}</p>
                      <p className="text-xs text-slate-400">Updated {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${docStatus[wf.status] ?? docStatus.draft}`}>{wf.status}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => unlinkWorkflow(wf.id)} title="Unlink">
                      <Unlink size={13} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ── */}
      {tab === 'kpis' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{kpis.length} KPI{kpis.length !== 1 ? 's' : ''} defined</p>
            <Button size="sm" variant="outline" onClick={openAddKpi}>
              <Plus size={13} className="mr-1.5" /> Add KPI
            </Button>
          </div>
          {kpis.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-slate-400">No KPIs defined yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {kpis.map((k) => (
                <Card key={k.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{k.name}</p>
                      {k.description && <p className="text-xs text-slate-500 mt-0.5">{k.description}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      {k.value && (
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Value</p>
                          <p className="font-semibold text-slate-800">{k.value}{k.unit && ` ${k.unit}`}</p>
                        </div>
                      )}
                      {k.target && (
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Target</p>
                          <p className="font-semibold text-green-600">{k.target}{k.unit && ` ${k.unit}`}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEditKpi(k)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => deleteKpi(k.id)}><Trash2 size={13} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Document picker */}
      <Dialog open={showDocPicker} onOpenChange={(o) => !o && setShowDocPicker(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link document</DialogTitle></DialogHeader>
          <Input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search documents..." className="mb-3" />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {unlinkedDocs.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">No documents to link.</p>
              : unlinkedDocs.map((d) => (
                <button key={d.id} onClick={() => linkDocument(d.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{d.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${docStatus[d.status]}`}>{d.status}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow picker */}
      <Dialog open={showWfPicker} onOpenChange={(o) => !o && setShowWfPicker(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link workflow</DialogTitle></DialogHeader>
          <Input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search workflows..." className="mb-3" />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {unlinkedWfs.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">No workflows to link.</p>
              : unlinkedWfs.map((w) => (
                <button key={w.id} onClick={() => linkWorkflow(w.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
                  <Workflow size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{w.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${docStatus[w.status]}`}>{w.status}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI form */}
      <Dialog open={showKpiForm} onOpenChange={(o) => !o && setShowKpiForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editKpi ? 'Edit KPI' : 'Add KPI'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label>
              <Input value={kpiForm.name} onChange={(e) => setKpiForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Customer satisfaction" />
            </div>
            <div className="space-y-1"><Label className="text-xs">Description</Label>
              <Input value={kpiForm.description} onChange={(e) => setKpiForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs">Value</Label>
                <Input value={kpiForm.value} onChange={(e) => setKpiForm((f) => ({ ...f, value: e.target.value }))} placeholder="85" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Unit</Label>
                <Input value={kpiForm.unit} onChange={(e) => setKpiForm((f) => ({ ...f, unit: e.target.value }))} placeholder="%" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Target</Label>
                <Input value={kpiForm.target} onChange={(e) => setKpiForm((f) => ({ ...f, target: e.target.value }))} placeholder="90" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowKpiForm(false)}>Cancel</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveKpi} disabled={!kpiForm.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
