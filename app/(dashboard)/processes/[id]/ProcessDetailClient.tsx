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
  GitBranch, FileText, ClipboardList, Target, ChevronRight, Plus,
  Pencil, Trash2, Check, X, Link2, Unlink, Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Process node types for canvas ──────────────────────────────────────────
function StartNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-12 h-12 rounded-full bg-ok border-2 border-ok flex items-center justify-center text-on-fill text-xs font-semibold shadow-sm">
      {data.label}
    </div>
  )
}
function EndNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-12 h-12 rounded-full bg-risk border-2 border-risk flex items-center justify-center text-on-fill text-xs font-semibold shadow-sm">
      {data.label}
    </div>
  )
}
function ActivityNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg bg-nw-accent border-2 border-nw-accent text-on-fill text-xs font-medium shadow-sm min-w-[100px] text-center">
      {data.label}
    </div>
  )
}
function DecisionNode({ data }: { data: { label: string } }) {
  return (
    <div
      className="w-16 h-16 bg-warn border-2 border-warn text-on-fill text-[10px] font-medium shadow-sm flex items-center justify-center text-center px-1"
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
  owner: { id: string; name: string } | null
  children: { id: string; name: string; status: string }[]
  nodes: unknown[]
  edges: unknown[]
  kpis: unknown[]
  documents: { id: string; title: string; status: string; category: string | null; updatedAt: string }[]
  caseTypes: { id: string; name: string; status: string; updatedAt: string }[]
  createdAt: string
  updatedAt: string
}

interface KPI { id: string; name: string; description: string; value: string; unit: string; target: string }

const statusConfig: Record<string, { label: string; class: string }> = {
  draft:    { label: 'Draft',    class: 'bg-paper-3 text-ink-3 border-rule' },
  active:   { label: 'Active',   class: 'bg-ok-tint text-ok-ink border-ok-line' },
  archived: { label: 'Archived', class: 'bg-warn-tint text-warn-ink border-warn-line' },
}
const docStatus: Record<string, string> = {
  draft: 'bg-paper-3 text-ink-3', published: 'bg-ok-tint text-ok-ink', archived: 'bg-warn-tint text-warn-ink',
}

let nodeIdCounter = 100

export function ProcessDetailClient({
  process: initial, allDocuments, allCaseTypes, allUsers,
}: {
  process: ProcessDetail
  allDocuments: { id: string; title: string; status: string }[]
  allCaseTypes: { id: string; name: string; status: string }[]
  allUsers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'overview' | 'canvas' | 'documents' | 'caseTypes' | 'kpis'>('overview')
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
  const [linkedCaseTypes, setLinkedCaseTypes] = useState(initial.caseTypes)
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
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

  const linkCaseType = async (typeId: string) => {
    await fetch(`/api/processes/${process.id}/links`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'caseType', targetId: typeId }),
    })
    const wf = allCaseTypes.find((w) => w.id === typeId)!
    setLinkedCaseTypes((prev) => [...prev, { id: wf.id, name: wf.name, status: wf.status, updatedAt: new Date().toISOString() }])
    setShowTypePicker(false)
  }

  const unlinkCaseType = async (typeId: string) => {
    await fetch(`/api/processes/${process.id}/links`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'caseType', targetId: typeId }),
    })
    setLinkedCaseTypes((prev) => prev.filter((w) => w.id !== typeId))
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
    { key: 'caseTypes', label: `Case types (${linkedCaseTypes.length})`, icon: <ClipboardList size={14} /> },
    { key: 'kpis', label: `KPIs (${kpis.length})`, icon: <Target size={14} /> },
  ] as const

  const unlinkedDocs = allDocuments.filter((d) => !linkedDocs.some((ld) => ld.id === d.id))
    .filter((d) => !pickerSearch || d.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  const unlinkedCaseTypes = allCaseTypes.filter((w) => !linkedCaseTypes.some((lw) => lw.id === w.id))
    .filter((w) => !pickerSearch || w.name.toLowerCase().includes(pickerSearch.toLowerCase()))

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-ink-4">
        <Link href="/processes" className="hover:text-nw-accent transition-colors">Processes</Link>
        {process.parent && (
          <>
            <ChevronRight size={14} />
            <Link href={`/processes/${process.parent.id}`} className="hover:text-nw-accent transition-colors">{process.parent.name}</Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-ink font-medium">{process.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent-tint">
            <GitBranch size={20} className="text-nw-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{process.name}</h1>
              <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
            </div>
            {process.owner && (
              <p className="text-sm text-ink-4 flex items-center gap-1 mt-0.5">
                <Users size={12} /> {process.owner.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {tab === 'canvas' && canvasDirty && (
            <Button size="sm" className="bg-nw-accent hover:bg-nw-accent" onClick={saveCanvas} disabled={saving}>
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
      <div className="border-b border-rule">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-nw-accent text-nw-accent font-medium'
                  : 'border-transparent text-ink-4 hover:text-ink'
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
                    <Label className="text-xs">Purpose <span className="text-ink-4 font-normal">(Syfte)</span></Label>
                    <Textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} rows={3} placeholder="Why does this process exist?" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Scope <span className="text-ink-4 font-normal">(Omfång)</span></Label>
                    <Textarea value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} rows={2} placeholder="What is included and excluded?" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-md border border-rule text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nw-accent">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Owner</Label>
                    <select value={form.ownerId} onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
                      className="w-full rounded-md border border-rule text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nw-accent">
                      <option value="">No owner</option>
                      {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X size={13} className="mr-1" />Cancel</Button>
                  <Button size="sm" className="bg-nw-accent hover:bg-nw-accent" onClick={saveOverview} disabled={saving || !form.name}>
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
                      <p className="text-xs font-medium text-ink-4 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-ink-3">{process.description}</p>
                    </div>
                  )}
                  {process.purpose && (
                    <div>
                      <p className="text-xs font-medium text-ink-4 uppercase tracking-wide mb-1">Purpose</p>
                      <p className="text-sm text-ink-3">{process.purpose}</p>
                    </div>
                  )}
                  {process.scope && (
                    <div>
                      <p className="text-xs font-medium text-ink-4 uppercase tracking-wide mb-1">Scope</p>
                      <p className="text-sm text-ink-3">{process.scope}</p>
                    </div>
                  )}
                  {!process.description && !process.purpose && !process.scope && (
                    <p className="text-sm text-ink-4 italic">No description yet. Click Edit to add details.</p>
                  )}
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-4">Status</span>
                      <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
                    </div>
                    {process.owner && (
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-4">Owner</span>
                        <span className="text-ink font-medium">{process.owner.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-4">Documents</span>
                      <span className="font-medium">{linkedDocs.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-4">Case types</span>
                      <span className="font-medium">{linkedCaseTypes.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-4">KPIs</span>
                      <span className="font-medium">{kpis.length}</span>
                    </div>
                    {process.children.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-4">Sub-processes</span>
                        <span className="font-medium">{process.children.length}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-4">Updated</span>
                      <span className="text-ink-4 text-xs">{formatDistanceToNow(new Date(process.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
                {process.children.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold text-ink-4 uppercase tracking-wide">Sub-processes</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                      {process.children.map((c) => (
                        <Link key={c.id} href={`/processes/${c.id}`}
                          className="flex items-center gap-2 text-sm text-ink-3 hover:text-nw-accent transition-colors py-0.5">
                          <GitBranch size={12} className="text-ink-4" />{c.name}
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
            <span className="text-xs text-ink-4">Add node:</span>
            {[
              { type: 'start', label: 'Start', color: 'bg-ok-tint text-ok-ink border-ok-line' },
              { type: 'activity', label: 'Activity', color: 'bg-accent-tint text-nw-accent border-rule' },
              { type: 'decision', label: 'Decision', color: 'bg-warn-tint text-warn-ink border-warn-line' },
              { type: 'end', label: 'End', color: 'bg-risk-tint text-risk-ink border-risk-line' },
            ].map((n) => (
              <button key={n.type} onClick={() => addNode(n.type, n.label)}
                className={`px-3 py-1 rounded border text-xs font-medium transition-colors hover:opacity-80 ${n.color}`}>
                + {n.label}
              </button>
            ))}
          </div>
          <div className="border border-rule rounded-lg overflow-hidden" style={{ height: '500px' }}>
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
            <p className="text-xs text-warn-ink">Unsaved changes — click &quot;Save canvas&quot; in the header.</p>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-ink-4">{linkedDocs.length} linked document{linkedDocs.length !== 1 ? 's' : ''}</p>
            <Button size="sm" variant="outline" onClick={() => { setPickerSearch(''); setShowDocPicker(true) }}>
              <Link2 size={13} className="mr-1.5" /> Link document
            </Button>
          </div>
          {linkedDocs.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-ink-4">No documents linked yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {linkedDocs.map((doc) => (
                <Card key={doc.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <FileText size={16} className="text-ink-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{doc.title}</p>
                      <p className="text-xs text-ink-4">Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${docStatus[doc.status] ?? docStatus.draft}`}>{doc.status}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-ink-4 hover:text-risk-ink" onClick={() => unlinkDocument(doc.id)} title="Unlink">
                      <Unlink size={13} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CASE TYPES ── */}
      {tab === 'caseTypes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-ink-4">{linkedCaseTypes.length} linked case type{linkedCaseTypes.length !== 1 ? 's' : ''}</p>
            <Button size="sm" variant="outline" onClick={() => { setPickerSearch(''); setShowTypePicker(true) }}>
              <Link2 size={13} className="mr-1.5" /> Link case type
            </Button>
          </div>
          {linkedCaseTypes.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-ink-4">No case types linked yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {linkedCaseTypes.map((wf) => (
                <Card key={wf.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <ClipboardList size={16} className="text-ink-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{wf.name}</p>
                      <p className="text-xs text-ink-4">Updated {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${docStatus[wf.status] ?? docStatus.draft}`}>{wf.status}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-ink-4 hover:text-risk-ink" onClick={() => unlinkCaseType(wf.id)} title="Unlink">
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
            <p className="text-sm text-ink-4">{kpis.length} KPI{kpis.length !== 1 ? 's' : ''} defined</p>
            <Button size="sm" variant="outline" onClick={openAddKpi}>
              <Plus size={13} className="mr-1.5" /> Add KPI
            </Button>
          </div>
          {kpis.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="py-12 text-center text-sm text-ink-4">No KPIs defined yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {kpis.map((k) => (
                <Card key={k.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{k.name}</p>
                      {k.description && <p className="text-xs text-ink-4 mt-0.5">{k.description}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      {k.value && (
                        <div className="text-center">
                          <p className="text-xs text-ink-4">Value</p>
                          <p className="font-semibold text-ink">{k.value}{k.unit && ` ${k.unit}`}</p>
                        </div>
                      )}
                      {k.target && (
                        <div className="text-center">
                          <p className="text-xs text-ink-4">Target</p>
                          <p className="font-semibold text-ok-ink">{k.target}{k.unit && ` ${k.unit}`}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-ink-4 hover:text-nw-accent" onClick={() => openEditKpi(k)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-ink-4 hover:text-risk-ink" onClick={() => deleteKpi(k.id)}><Trash2 size={13} /></Button>
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
              ? <p className="text-sm text-ink-4 text-center py-6">No documents to link.</p>
              : unlinkedDocs.map((d) => (
                <button key={d.id} onClick={() => linkDocument(d.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-paper-2 text-left transition-colors">
                  <FileText size={14} className="text-ink-4 shrink-0" />
                  <span className="text-sm text-ink-3 flex-1 truncate">{d.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${docStatus[d.status]}`}>{d.status}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Case type picker */}
      <Dialog open={showTypePicker} onOpenChange={(o) => !o && setShowTypePicker(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link case type</DialogTitle></DialogHeader>
          <Input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search case types..." className="mb-3" />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {unlinkedCaseTypes.length === 0
              ? <p className="text-sm text-ink-4 text-center py-6">No case types to link.</p>
              : unlinkedCaseTypes.map((w) => (
                <button key={w.id} onClick={() => linkCaseType(w.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-paper-2 text-left transition-colors">
                  <ClipboardList size={14} className="text-ink-4 shrink-0" />
                  <span className="text-sm text-ink-3 flex-1 truncate">{w.name}</span>
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
            <Button size="sm" className="bg-nw-accent hover:bg-nw-accent" onClick={handleSaveKpi} disabled={!kpiForm.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
