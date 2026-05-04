'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  GitBranch, Plus, ChevronRight, ChevronDown, FileText, Workflow as WorkflowIcon,
  Users, Circle, Trash2, FolderPlus, ExternalLink, Pencil, Check, X,
  Link2, Unlink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ── Canvas node types ──────────────────────────────────────────────────────
function StartNode({ data }: { data: { label: string } }) {
  return <div className="w-12 h-12 rounded-full bg-green-500 border-2 border-green-600 flex items-center justify-center text-white text-xs font-semibold">{data.label}</div>
}
function EndNode({ data }: { data: { label: string } }) {
  return <div className="w-12 h-12 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center text-white text-xs font-semibold">{data.label}</div>
}
function ActivityNode({ data }: { data: { label: string } }) {
  return <div className="px-4 py-2.5 rounded-[2px] bg-blue-500 border-2 border-blue-600 text-white text-xs font-medium min-w-[100px] text-center">{data.label}</div>
}
function DecisionNode({ data }: { data: { label: string } }) {
  return (
    <div className="w-16 h-16 bg-orange-500 border-2 border-orange-600 text-white text-[10px] font-medium flex items-center justify-center text-center px-1" style={{ transform: 'rotate(45deg)' }}>
      <span style={{ transform: 'rotate(-45deg)' }}>{data.label}</span>
    </div>
  )
}
const nodeTypes: NodeTypes = { start: StartNode, end: EndNode, activity: ActivityNode, decision: DecisionNode }

// ── Types ──────────────────────────────────────────────────────────────────
interface Process {
  id: string; name: string; description: string | null; status: string
  parentId: string | null; owner: { id: string; name: string } | null
  category: string | null; tags: string[]
  _count: { documents: number; workflows: number; children: number }
  createdAt: string; updatedAt: string
}

interface ProcessDetail extends Process {
  purpose: string | null; scope: string | null
  parent: { id: string; name: string } | null
  children: { id: string; name: string; status: string }[]
  nodes: unknown[]; edges: unknown[]; kpis: unknown[]
  linkedDocuments: { id: string; title: string; status: string; category: string | null; updatedAt: string }[]
  linkedWorkflows: { id: string; name: string; status: string; updatedAt: string }[]
}

interface KPI { id: string; name: string; description: string; value: string; unit: string; target: string }

interface Props {
  initialProcesses: Process[]
  allDocuments: { id: string; title: string; status: string }[]
  allWorkflows: { id: string; name: string; status: string }[]
  allUsers: { id: string; name: string }[]
}

// ── Status configs ─────────────────────────────────────────────────────────
const statusVariant: Record<string, 'default' | 'ok' | 'warn'> = {
  draft: 'default', active: 'ok', archived: 'warn',
}
const statusLabel: Record<string, string> = {
  draft: 'Draft', active: 'Active', archived: 'Archived',
}
const docStatusVariant: Record<string, 'default' | 'ok' | 'warn'> = {
  draft: 'default', published: 'ok', archived: 'warn',
}

// ── Tree helpers ───────────────────────────────────────────────────────────
function buildTree(processes: Process[]): (Process & { childProcesses: Process[] })[] {
  const map = new Map<string, Process & { childProcesses: Process[] }>()
  for (const p of processes) map.set(p.id, { ...p, childProcesses: [] })
  const roots: (Process & { childProcesses: Process[] })[] = []
  for (const p of processes) {
    const node = map.get(p.id)!
    if (p.parentId && map.has(p.parentId)) map.get(p.parentId)!.childProcesses.push(node)
    else roots.push(node)
  }
  return roots
}

interface ContextMenu { x: number; y: number; process: Process }

function TreeNode({ node, depth, selectedId, onSelect, expanded, onToggle, onContextMenu }: {
  node: Process & { childProcesses: (Process & { childProcesses: Process[] })[] }
  depth: number; selectedId: string | null
  onSelect: (id: string) => void; expanded: Set<string>
  onToggle: (id: string) => void
  onContextMenu: (e: React.MouseEvent, p: Process) => void
}) {
  const hasChildren = node.childProcesses.length > 0
  const isExpanded = expanded.has(node.id)
  const isSelected = selectedId === node.id
  return (
    <div>
      <button
        onClick={() => { onSelect(node.id); if (hasChildren) onToggle(node.id) }}
        onContextMenu={(e) => onContextMenu(e, node)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[2px] text-sm transition-colors text-left"
        style={{
          background: isSelected ? 'var(--accent-tint)' : '',
          color: isSelected ? 'var(--nw-accent)' : 'var(--ink-3)',
          fontWeight: isSelected ? '500' : '400',
          borderLeft: isSelected ? '2px solid var(--nw-accent)' : '2px solid transparent',
        }}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren
          ? (isExpanded ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />)
          : <Circle size={6} className="shrink-0 ml-1" />}
        <span className="truncate flex-1">{node.name}</span>
        {node._count.children > 0 && <span className="text-[10px] shrink-0" style={{ color: isSelected ? 'var(--nw-accent)' : 'var(--ink-4)' }}>{node._count.children}</span>}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.childProcesses.map((child) => (
            <TreeNode key={child.id} node={child as Process & { childProcesses: (Process & { childProcesses: Process[] })[] }}
              depth={depth + 1} selectedId={selectedId} onSelect={onSelect}
              expanded={expanded} onToggle={onToggle} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Canvas panel (needs own state to avoid re-mount) ──────────────────────
let nodeIdCounter = 100

function CanvasPanel({ processId, initialNodes, initialEdges }: { processId: string; initialNodes: unknown[]; initialEdges: unknown[] }) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes as never[])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges as never[])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const onConnect = useCallback((conn: Connection) => {
    setRfEdges((eds) => addEdge({ ...conn, type: 'smoothstep' }, eds))
    setDirty(true)
  }, [setRfEdges])

  const addNode = (type: string, label: string) => {
    setRfNodes((nds) => [...nds, { id: `node_${++nodeIdCounter}`, type, position: { x: 200, y: 80 + nds.length * 90 }, data: { label } }])
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/processes/${processId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: rfNodes, edges: rfEdges }),
    })
    setSaving(false)
    setDirty(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--ink-4)' }}>Add:</span>
          {[
            { type: 'start', label: 'Start', color: 'border-green-300 text-green-700 hover:bg-green-50' },
            { type: 'activity', label: 'Activity', color: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
            { type: 'decision', label: 'Decision', color: 'border-orange-300 text-orange-700 hover:bg-orange-50' },
            { type: 'end', label: 'End', color: 'border-red-300 text-red-700 hover:bg-red-50' },
          ].map((n) => (
            <button key={n.type} onClick={() => addNode(n.type, n.label)}
              className={`px-3 py-1 rounded border text-xs font-medium hover:opacity-80 transition-opacity ${n.color}`}>
              + {n.label}
            </button>
          ))}
        </div>
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save canvas'}
          </Button>
        )}
      </div>
      <div className="rounded-[2px] overflow-hidden" style={{ height: '480px', border: '1px solid var(--rule)' }}>
        <ReactFlow nodes={rfNodes} edges={rfEdges}
          onNodesChange={(c) => { onNodesChange(c); setDirty(true) }}
          onEdgesChange={(c) => { onEdgesChange(c); setDirty(true) }}
          onConnect={onConnect} nodeTypes={nodeTypes} fitView>
          <Background /><Controls /><MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function ProcessesClient({ initialProcesses, allDocuments, allWorkflows, allUsers }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [processes, setProcesses] = useState(initialProcesses)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProcessDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<'overview' | 'canvas' | 'documents' | 'workflows' | 'kpis'>('overview')

  // Overview edit
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', purpose: '', scope: '', status: '', ownerId: '' })
  const [saving, setSaving] = useState(false)

  // Link pickers
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [showWfPicker, setShowWfPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  // KPIs
  const [kpis, setKpis] = useState<KPI[]>([])
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [editKpi, setEditKpi] = useState<KPI | null>(null)
  const [kpiForm, setKpiForm] = useState<Omit<KPI, 'id'>>({ name: '', description: '', value: '', unit: '', target: '' })

  const refresh = () => startTransition(() => router.refresh())

  // Fetch full detail when selection changes
  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    setLoadingDetail(true)
    setTab('overview')
    setEditing(false)
    fetch(`/api/processes/${selectedId}`)
      .then((r) => r.json())
      .then(({ process: p }: { process: {
        id: string; name: string; description: string | null; purpose: string | null; scope: string | null
        status: string; parentId: string | null; category: string | null; tags: string[]; createdAt: string; updatedAt: string
        owner: { id: string; name: string } | null; parent: { id: string; name: string } | null
        children: { id: string; name: string; status: string }[]
        nodes: unknown[]; edges: unknown[]; kpis: unknown[]
        _count: { documents: number; workflows: number; children: number }
        documents: { document: { id: string; title: string; status: string; category: string | null; updatedAt: string } }[]
        workflows: { workflow: { id: string; name: string; status: string; updatedAt: string } }[]
      } }) => {
        setDetail({
          ...p,
          _count: p._count ?? { documents: p.documents.length, workflows: p.workflows.length, children: p.children.length },
          linkedDocuments: p.documents.map((pd) => ({ ...pd.document, updatedAt: pd.document.updatedAt })),
          linkedWorkflows: p.workflows.map((pw) => ({ ...pw.workflow, updatedAt: pw.workflow.updatedAt })),
        })
        setKpis((p.kpis as KPI[]) ?? [])
        setEditForm({
          name: p.name, description: p.description ?? '',
          purpose: p.purpose ?? '', scope: p.scope ?? '',
          status: p.status, ownerId: p.owner?.id ?? '',
        })
        setLoadingDetail(false)
      })
  }, [selectedId])

  const patch = async (data: Record<string, unknown>) => {
    if (!selectedId) return null
    const res = await fetch(`/api/processes/${selectedId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok ? (await res.json() as { process: ProcessDetail }).process : null
  }

  const saveOverview = async () => {
    setSaving(true)
    const updated = await patch({ name: editForm.name, description: editForm.description || null, purpose: editForm.purpose || null, scope: editForm.scope || null, status: editForm.status, ownerId: editForm.ownerId || null })
    setSaving(false)
    if (updated) {
      setDetail((d) => d ? { ...d, ...updated } : d)
      setProcesses((prev) => prev.map((p) => p.id === selectedId ? { ...p, name: editForm.name, status: editForm.status } : p))
      setEditing(false)
      refresh()
    }
  }

  const linkDocument = async (docId: string) => {
    await fetch(`/api/processes/${selectedId}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'document', targetId: docId }) })
    const doc = allDocuments.find((d) => d.id === docId)!
    setDetail((d) => d ? { ...d, linkedDocuments: [...d.linkedDocuments, { id: doc.id, title: doc.title, status: doc.status, category: null, updatedAt: new Date().toISOString() }] } : d)
    setShowDocPicker(false)
  }
  const unlinkDocument = async (docId: string) => {
    await fetch(`/api/processes/${selectedId}/links`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'document', targetId: docId }) })
    setDetail((d) => d ? { ...d, linkedDocuments: d.linkedDocuments.filter((x) => x.id !== docId) } : d)
  }
  const linkWorkflow = async (wfId: string) => {
    await fetch(`/api/processes/${selectedId}/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'workflow', targetId: wfId }) })
    const wf = allWorkflows.find((w) => w.id === wfId)!
    setDetail((d) => d ? { ...d, linkedWorkflows: [...d.linkedWorkflows, { id: wf.id, name: wf.name, status: wf.status, updatedAt: new Date().toISOString() }] } : d)
    setShowWfPicker(false)
  }
  const unlinkWorkflow = async (wfId: string) => {
    await fetch(`/api/processes/${selectedId}/links`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'workflow', targetId: wfId }) })
    setDetail((d) => d ? { ...d, linkedWorkflows: d.linkedWorkflows.filter((x) => x.id !== wfId) } : d)
  }

  const saveKpis = async (updated: KPI[]) => {
    setKpis(updated)
    await patch({ kpis: updated })
  }
  const handleSaveKpi = async () => {
    if (!kpiForm.name) return
    const updated = editKpi
      ? kpis.map((k) => k.id === editKpi.id ? { ...editKpi, ...kpiForm } : k)
      : [...kpis, { id: `kpi_${Date.now()}`, ...kpiForm }]
    await saveKpis(updated)
    setShowKpiForm(false)
  }

  const toggleExpanded = (id: string) => setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleContextMenu = (e: React.MouseEvent, p: Process) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, process: p }) }

  const handleDelete = async (p: Process) => {
    setContextMenu(null)
    if (!confirm(`Delete "${p.name}"?${p._count.children > 0 ? `\n\nThis will also delete ${p._count.children} sub-process(es).` : ''}`)) return
    setProcesses((prev) => prev.filter((x) => x.id !== p.id))
    if (selectedId === p.id) setSelectedId(null)
    await fetch(`/api/processes/${p.id}`, { method: 'DELETE' })
    refresh()
  }

  const openCreate = (parentId: string | null = null) => { setCreateParentId(parentId); setNewName(''); setShowCreate(true) }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/processes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), parentId: createParentId }) })
    setCreating(false)
    if (!res.ok) return
    const { process } = await res.json() as { process: Process }
    setProcesses((prev) => [...prev, process])
    if (createParentId) setExpanded((prev) => new Set([...prev, createParentId]))
    setShowCreate(false)
    setSelectedId(process.id)
    refresh()
  }

  const tree = buildTree(processes)
  const linkedDocs = detail?.linkedDocuments ?? []
  const linkedWorkflows = detail?.linkedWorkflows ?? []
  const unlinkedDocs = allDocuments.filter((d) => !linkedDocs.some((ld) => ld.id === d.id)).filter((d) => !pickerSearch || d.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  const unlinkedWfs = allWorkflows.filter((w) => !linkedWorkflows.some((lw) => lw.id === w.id)).filter((w) => !pickerSearch || w.name.toLowerCase().includes(pickerSearch.toLowerCase()))

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'canvas' as const, label: 'Canvas' },
    { key: 'documents' as const, label: `Documents (${linkedDocs.length})` },
    { key: 'workflows' as const, label: `Workflows (${linkedWorkflows.length})` },
    { key: 'kpis' as const, label: `KPIs (${kpis.length})` },
  ]

  return (
    <div className="flex gap-0 h-full -m-6">
      {/* ── Tree sidebar ── */}
      <aside className="w-64 shrink-0 flex flex-col h-full" style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--rule)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Processes</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openCreate(null)} title="New top-level process">
            <Plus size={14} />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {tree.length === 0
            ? <p className="text-xs px-2 py-4 text-center" style={{ color: 'var(--ink-4)' }}>No processes yet.</p>
            : tree.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} selectedId={selectedId}
                onSelect={setSelectedId} expanded={expanded} onToggle={toggleExpanded}
                onContextMenu={handleContextMenu} />
            ))}
        </nav>
      </aside>

      {/* ── Main panel ── */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {!selectedId ? (
          /* Welcome state */
          <div className="flex flex-col items-center justify-center h-full text-center p-12">
            <div className="p-5 rounded-full mb-4" style={{ background: 'var(--paper-3)' }}>
              <GitBranch size={28} style={{ color: 'var(--ink-4)' }} />
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>Select a process</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--ink-4)' }}>Click a process in the tree to view its details, canvas, documents and KPIs.</p>
            <Button size="sm" className="gap-1.5" onClick={() => openCreate(null)}>
              <Plus size={14} /> New process
            </Button>
          </div>
        ) : loadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--ink-4)' }}>Loading…</p>
          </div>
        ) : detail ? (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                {detail.parent && (
                  <button onClick={() => setSelectedId(detail.parent!.id)}
                    className="flex items-center gap-1 text-xs mb-1 transition-colors"
                    style={{ color: 'var(--ink-4)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nw-accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}>
                    <ChevronRight size={12} className="rotate-180" />{detail.parent.name}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{detail.name}</h1>
                  <Badge variant={statusVariant[detail.status] ?? 'default'} className="text-xs">{statusLabel[detail.status] ?? detail.status}</Badge>
                </div>
                {detail.owner && <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: 'var(--ink-3)' }}><Users size={12} />{detail.owner.name}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openCreate(selectedId)}><Plus size={13} className="mr-1" />Sub-process</Button>
                {tab === 'overview' && !editing && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil size={13} className="mr-1" />Edit</Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid var(--rule)' }}>
              <div className="flex gap-0">
                {tabs.map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className="px-4 py-2.5 text-sm border-b-2 transition-colors"
                    style={{
                      borderBottomColor: tab === t.key ? 'var(--nw-accent)' : 'transparent',
                      color: tab === t.key ? 'var(--nw-accent)' : 'var(--ink-4)',
                      fontWeight: tab === t.key ? '500' : '400',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Overview ── */}
            {tab === 'overview' && (
              editing ? (
                <Card><CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Name</Label>
                      <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Description</Label>
                      <Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Purpose <span className="font-normal" style={{ color: 'var(--ink-4)' }}>(Syfte)</span></Label>
                      <Textarea value={editForm.purpose} onChange={(e) => setEditForm((f) => ({ ...f, purpose: e.target.value }))} rows={3} placeholder="Why does this process exist?" />
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Scope <span className="font-normal" style={{ color: 'var(--ink-4)' }}>(Omfång)</span></Label>
                      <Textarea value={editForm.scope} onChange={(e) => setEditForm((f) => ({ ...f, scope: e.target.value }))} rows={2} placeholder="What is included and excluded?" />
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Status</Label>
                      <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full rounded-[2px] text-sm px-3 py-2 focus:outline-none"
                        style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}>
                        <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Owner</Label>
                      <select value={editForm.ownerId} onChange={(e) => setEditForm((f) => ({ ...f, ownerId: e.target.value }))}
                        className="w-full rounded-[2px] text-sm px-3 py-2 focus:outline-none"
                        style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}>
                        <option value="">No owner</option>
                        {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X size={13} className="mr-1" />Cancel</Button>
                    <Button size="sm" onClick={saveOverview} disabled={saving || !editForm.name}>
                      <Check size={13} className="mr-1" />{saving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2"><CardContent className="p-5 space-y-4">
                    {detail.description && <div><p className="mono-meta text-[10px] mb-1">Description</p><p className="text-sm" style={{ color: 'var(--ink)' }}>{detail.description}</p></div>}
                    {detail.purpose && <div><p className="mono-meta text-[10px] mb-1">Purpose</p><p className="text-sm" style={{ color: 'var(--ink)' }}>{detail.purpose}</p></div>}
                    {detail.scope && <div><p className="mono-meta text-[10px] mb-1">Scope</p><p className="text-sm" style={{ color: 'var(--ink)' }}>{detail.scope}</p></div>}
                    {!detail.description && !detail.purpose && !detail.scope && <p className="text-sm italic" style={{ color: 'var(--ink-4)' }}>No description yet. Click Edit to add details.</p>}
                  </CardContent></Card>
                  <div className="space-y-4">
                    <Card className=""><CardContent className="p-4 space-y-2.5">
                      {[
                        ['Status', <Badge key="s" variant={statusVariant[detail.status] ?? 'default'} className="text-xs">{statusLabel[detail.status] ?? detail.status}</Badge>],
                        detail.owner && ['Owner', <span key="o" className="font-medium" style={{ color: 'var(--ink)' }}>{detail.owner.name}</span>],
                        ['Documents', <span key="d" className="font-medium">{linkedDocs.length}</span>],
                        ['Workflows', <span key="w" className="font-medium">{linkedWorkflows.length}</span>],
                        ['KPIs', <span key="k" className="font-medium">{kpis.length}</span>],
                        detail.children.length > 0 && ['Sub-processes', <span key="c" className="font-medium">{detail.children.length}</span>],
                        ['Updated', <span key="u" className="text-xs" style={{ color: 'var(--ink-4)' }}>{formatDistanceToNow(new Date(detail.updatedAt), { addSuffix: true })}</span>],
                      ].filter(Boolean).map((row, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span style={{ color: 'var(--ink-3)' }}>{(row as [string, React.ReactNode])[0]}</span>
                          {(row as [string, React.ReactNode])[1]}
                        </div>
                      ))}
                    </CardContent></Card>
                    {detail.children.length > 0 && (
                      <Card><CardHeader className="pb-2 pt-4 px-4"><CardTitle className="mono-meta text-[10px]">Sub-processes</CardTitle></CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          {detail.children.map((c) => (
                            <button key={c.id} onClick={() => setSelectedId(c.id)}
                              className="w-full flex items-center gap-2 text-sm transition-colors py-0.5 text-left"
                              style={{ color: 'var(--ink-3)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nw-accent)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-3)')}>
                              <GitBranch size={12} className="shrink-0" style={{ color: 'var(--ink-4)' }} />{c.name}
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )
            )}

            {/* ── Canvas ── */}
            {tab === 'canvas' && (
              <CanvasPanel key={detail.id} processId={detail.id} initialNodes={detail.nodes} initialEdges={detail.edges} />
            )}

            {/* ── Documents ── */}
            {tab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{linkedDocs.length} linked document{linkedDocs.length !== 1 ? 's' : ''}</p>
                  <Button size="sm" variant="outline" onClick={() => { setPickerSearch(''); setShowDocPicker(true) }}><Link2 size={13} className="mr-1.5" />Link document</Button>
                </div>
                {linkedDocs.length === 0
                  ? <Card><CardContent className="py-12 text-center text-sm" style={{ color: 'var(--ink-4)' }}>No documents linked yet.</CardContent></Card>
                  : <div className="space-y-2">{linkedDocs.map((doc) => (
                    <Card key={doc.id}><CardContent className="p-4 flex items-center gap-3">
                      <FileText size={16} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{doc.title}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</p>
                      </div>
                      <Badge variant={docStatusVariant[doc.status] ?? 'default'} className="text-xs">{doc.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => unlinkDocument(doc.id)} title="Unlink"><Unlink size={13} /></Button>
                    </CardContent></Card>
                  ))}</div>
                }
              </div>
            )}

            {/* ── Workflows ── */}
            {tab === 'workflows' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{linkedWorkflows.length} linked workflow{linkedWorkflows.length !== 1 ? 's' : ''}</p>
                  <Button size="sm" variant="outline" onClick={() => { setPickerSearch(''); setShowWfPicker(true) }}><Link2 size={13} className="mr-1.5" />Link workflow</Button>
                </div>
                {linkedWorkflows.length === 0
                  ? <Card><CardContent className="py-12 text-center text-sm" style={{ color: 'var(--ink-4)' }}>No workflows linked yet.</CardContent></Card>
                  : <div className="space-y-2">{linkedWorkflows.map((wf) => (
                    <Card key={wf.id}><CardContent className="p-4 flex items-center gap-3">
                      <WorkflowIcon size={16} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{wf.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Updated {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}</p>
                      </div>
                      <Badge variant={statusVariant[wf.status] ?? 'default'} className="text-xs">{wf.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => unlinkWorkflow(wf.id)} title="Unlink"><Unlink size={13} /></Button>
                    </CardContent></Card>
                  ))}</div>
                }
              </div>
            )}

            {/* ── KPIs ── */}
            {tab === 'kpis' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{kpis.length} KPI{kpis.length !== 1 ? 's' : ''} defined</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditKpi(null); setKpiForm({ name: '', description: '', value: '', unit: '', target: '' }); setShowKpiForm(true) }}><Plus size={13} className="mr-1.5" />Add KPI</Button>
                </div>
                {kpis.length === 0
                  ? <Card><CardContent className="py-12 text-center text-sm" style={{ color: 'var(--ink-4)' }}>No KPIs defined yet.</CardContent></Card>
                  : <div className="space-y-2">{kpis.map((k) => (
                    <Card key={k.id}><CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{k.name}</p>
                        {k.description && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{k.description}</p>}
                      </div>
                      <div className="flex items-center gap-4 text-sm shrink-0">
                        {k.value && <div className="text-center"><p className="text-xs" style={{ color: 'var(--ink-4)' }}>Value</p><p className="font-semibold" style={{ color: 'var(--ink)' }}>{k.value}{k.unit && ` ${k.unit}`}</p></div>}
                        {k.target && <div className="text-center"><p className="text-xs" style={{ color: 'var(--ink-4)' }}>Target</p><p className="font-semibold" style={{ color: 'var(--ok)' }}>{k.target}{k.unit && ` ${k.unit}`}</p></div>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => { setEditKpi(k); setKpiForm({ name: k.name, description: k.description, value: k.value, unit: k.unit, target: k.target }); setShowKpiForm(true) }}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--ink-4)' }} onClick={() => saveKpis(kpis.filter((x) => x.id !== k.id))}><Trash2 size={13} /></Button>
                      </div>
                    </CardContent></Card>
                  ))}</div>
                }
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Context menu ── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 py-1 min-w-[180px] text-sm rounded-[2px]"
            style={{ top: contextMenu.y, left: contextMenu.x, background: 'var(--surface)', border: '1px solid var(--rule)', boxShadow: '0 8px 24px rgba(17,17,17,0.12)' }}>
            <div className="px-3 py-1.5 text-xs font-semibold mb-1 truncate" style={{ color: 'var(--ink-4)', borderBottom: '1px solid var(--rule)' }}>{contextMenu.process.name}</div>
            <button onClick={() => { setSelectedId(contextMenu.process.id); setContextMenu(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors" style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
              <ExternalLink size={13} style={{ color: 'var(--ink-4)' }} /> Open
            </button>
            <button onClick={() => { openCreate(contextMenu.process.id); setContextMenu(null) }} className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors" style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
              <FolderPlus size={13} style={{ color: 'var(--ink-4)' }} /> Add sub-process
            </button>
            <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--rule)' }}>
              <button onClick={() => handleDelete(contextMenu.process)} className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{createParentId ? 'New sub-process' : 'New process'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Process name"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
            </div>
            {createParentId && <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Sub-process of: <span className="font-medium" style={{ color: 'var(--ink-3)' }}>{processes.find((p) => p.id === createParentId)?.name}</span></p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate} disabled={creating || !newName.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document picker ── */}
      <Dialog open={showDocPicker} onOpenChange={(o) => !o && setShowDocPicker(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link document</DialogTitle></DialogHeader>
          <Input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search documents…" className="mb-3" />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {unlinkedDocs.length === 0 ? <p className="text-sm text-center py-6" style={{ color: 'var(--ink-4)' }}>No documents to link.</p>
              : unlinkedDocs.map((d) => (
                <button key={d.id} onClick={() => linkDocument(d.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[2px] hover:bg-[var(--paper-2)] text-left transition-colors">
                  <FileText size={14} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink)' }}>{d.title}</span>
                  <Badge variant={docStatusVariant[d.status] ?? 'default'} className="text-xs">{d.status}</Badge>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Workflow picker ── */}
      <Dialog open={showWfPicker} onOpenChange={(o) => !o && setShowWfPicker(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link workflow</DialogTitle></DialogHeader>
          <Input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search workflows…" className="mb-3" />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {unlinkedWfs.length === 0 ? <p className="text-sm text-center py-6" style={{ color: 'var(--ink-4)' }}>No workflows to link.</p>
              : unlinkedWfs.map((w) => (
                <button key={w.id} onClick={() => linkWorkflow(w.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[2px] hover:bg-[var(--paper-2)] text-left transition-colors">
                  <WorkflowIcon size={14} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--ink)' }}>{w.name}</span>
                  <Badge variant={statusVariant[w.status] ?? 'default'} className="text-xs">{w.status}</Badge>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── KPI form ── */}
      <Dialog open={showKpiForm} onOpenChange={(o) => !o && setShowKpiForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editKpi ? 'Edit KPI' : 'Add KPI'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={kpiForm.name} onChange={(e) => setKpiForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Customer satisfaction" /></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={kpiForm.description} onChange={(e) => setKpiForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs">Value</Label><Input value={kpiForm.value} onChange={(e) => setKpiForm((f) => ({ ...f, value: e.target.value }))} placeholder="85" /></div>
              <div className="space-y-1"><Label className="text-xs">Unit</Label><Input value={kpiForm.unit} onChange={(e) => setKpiForm((f) => ({ ...f, unit: e.target.value }))} placeholder="%" /></div>
              <div className="space-y-1"><Label className="text-xs">Target</Label><Input value={kpiForm.target} onChange={(e) => setKpiForm((f) => ({ ...f, target: e.target.value }))} placeholder="90" /></div>
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
