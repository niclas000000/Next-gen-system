'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Loader2, Edit2, GitBranch } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Phase {
  id: string
  name: string
  role: string
  rule: 'any' | 'all'
  deadlineDays: number
  order: number
}

interface FlowData {
  id: string
  name: string
  phases: Phase[]
  usedBy: number
  updatedAt: string
}

interface Props {
  initialFlows: FlowData[]
}

const ROLES = ['Author', 'Reviewer', 'Approver', 'Owner']

function PhaseCard({
  phase,
  onUpdate,
  onRemove,
}: {
  phase: Phase
  onUpdate: (updates: Partial<Phase>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-[2px]" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
      <div className="mt-1 cursor-grab shrink-0" style={{ color: 'var(--ink-4)' }}>
        <GripVertical size={16} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Phase name</Label>
            <Input
              value={phase.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="h-7 text-xs"
              placeholder="e.g. Review"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Role</Label>
            <select
              value={phase.role}
              onChange={(e) => onUpdate({ role: e.target.value })}
              className="w-full h-7 px-2 text-xs rounded-[2px] focus:outline-none focus:ring-1"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Approval rule</Label>
            <div className="flex gap-1">
              {(['any', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdate({ rule: r })}
                  className="flex-1 py-1 text-xs font-medium rounded-[2px] transition-colors"
                  style={{
                    border: `1px solid ${phase.rule === r ? 'var(--nw-accent)' : 'var(--rule)'}`,
                    background: phase.rule === r ? 'var(--accent-tint)' : 'var(--surface)',
                    color: phase.rule === r ? 'var(--nw-accent)' : 'var(--ink-3)',
                  }}
                >
                  {r === 'any' ? 'Any one' : 'All must'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Deadline (days)</Label>
            <Input
              type="number"
              min={0}
              value={phase.deadlineDays}
              onChange={(e) => onUpdate({ deadlineDays: Number(e.target.value) })}
              className="h-7 text-xs"
              placeholder="0 = no deadline"
            />
          </div>
        </div>
      </div>
      <button onClick={onRemove} className="mt-1 transition-colors shrink-0" style={{ color: 'var(--ink-4)' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function FlowEditor({
  flow,
  onSaved,
  onClose,
}: {
  flow: FlowData | null
  onSaved: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(flow?.name ?? '')
  const [phases, setPhases] = useState<Phase[]>(
    flow?.phases ?? [
      { id: 'p1', name: 'Review', role: 'Reviewer', rule: 'any', deadlineDays: 5, order: 0 },
      { id: 'p2', name: 'Approve', role: 'Approver', rule: 'all', deadlineDays: 3, order: 1 },
    ]
  )
  const [saving, setSaving] = useState(false)

  const addPhase = () => {
    const newPhase: Phase = {
      id: `p-${Date.now()}`,
      name: 'New Phase',
      role: 'Reviewer',
      rule: 'any',
      deadlineDays: 3,
      order: phases.length,
    }
    setPhases([...phases, newPhase])
  }

  const updatePhase = (id: string, updates: Partial<Phase>) => {
    setPhases(phases.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const removePhase = (id: string) => {
    setPhases(phases.filter((p) => p.id !== id))
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const orderedPhases = phases.map((p, i) => ({ ...p, order: i }))
      if (flow) {
        await fetch(`/api/approval-flows/${flow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phases: orderedPhases }),
        })
      } else {
        await fetch('/api/approval-flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phases: orderedPhases }),
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Flow name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard Review Flow"
          className="h-9 text-sm"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Phases</Label>
          <button onClick={addPhase} className="text-xs flex items-center gap-1" style={{ color: 'var(--nw-accent)' }}>
            <Plus size={12} /> Add phase
          </button>
        </div>

        {phases.length === 0 ? (
          <div className="py-6 text-center text-xs rounded-[2px]" style={{ border: '1px dashed var(--rule)', color: 'var(--ink-4)' }}>
            No phases yet. Add at least one phase.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {phases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                onUpdate={(updates) => updatePhase(phase.id, updates)}
                onRemove={() => removePhase(phase.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={save}
          disabled={!name.trim() || phases.length === 0 || saving}
        >
          {saving && <Loader2 size={14} className="animate-spin mr-1" />}
          {flow ? 'Save changes' : 'Create flow'}
        </Button>
      </div>
    </div>
  )
}

export function ApprovalFlowsClient({ initialFlows }: Props) {
  const router = useRouter()
  const [flows, setFlows] = useState<FlowData[]>(initialFlows)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<FlowData | null | 'new'>('new' as never)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (flow: FlowData) => {
    setEditing(flow)
    setDialogOpen(true)
  }

  const handleSaved = () => {
    setDialogOpen(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this approval flow?')) return
    setDeleting(id)
    try {
      await fetch(`/api/approval-flows/${id}`, { method: 'DELETE' })
      setFlows(flows.filter((f) => f.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} />
          New flow
        </Button>
      </div>

      {flows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-[2px]" style={{ border: '1px dashed var(--rule)', background: 'var(--paper-2)' }}>
          <GitBranch size={28} className="mb-3" style={{ color: 'var(--ink-4)' }} />
          <p className="font-medium text-sm" style={{ color: 'var(--ink-3)' }}>No approval flows yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--ink-4)' }}>Create a flow with Review and Approve phases to use in document types.</p>
          <Button onClick={openNew} className="gap-2">
            <Plus size={14} /> New flow
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {flows.map((flow) => (
          <Card key={flow.id}>
            <CardHeader
              className="cursor-pointer select-none pb-3 pt-4"
              onClick={() => setExpanded(expanded === flow.id ? null : flow.id)}
            >
              <div className="flex items-center gap-3">
                {expanded === flow.id ? (
                  <ChevronDown size={16} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                ) : (
                  <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                )}
                <CardTitle className="text-sm font-semibold flex-1">{flow.name}</CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {flow.phases.length} phase{flow.phases.length !== 1 ? 's' : ''}
                  </Badge>
                  {flow.usedBy > 0 && (
                    <Badge variant="default" className="text-xs">
                      {flow.usedBy} type{flow.usedBy !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                    {formatDistanceToNow(new Date(flow.updatedAt), { addSuffix: true })}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(flow) }}
                    className="p-1 transition-colors"
                    style={{ color: 'var(--ink-4)' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(flow.id) }}
                    disabled={deleting === flow.id}
                    className="p-1 transition-colors"
                  >
                    {deleting === flow.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </CardHeader>

            {expanded === flow.id && (
              <CardContent className="pt-0 pb-4">
                {flow.phases.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No phases configured.</p>
                ) : (
                  <div className="flex items-start gap-2 flex-wrap">
                    {flow.phases
                      .sort((a, b) => a.order - b.order)
                      .map((phase, i) => (
                        <div key={phase.id} className="flex items-center gap-2">
                          <div className="px-3 py-2 rounded-[2px] text-xs min-w-[120px]" style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
                            <p className="font-semibold" style={{ color: 'var(--ink-3)' }}>{phase.name}</p>
                            <p className="mt-0.5" style={{ color: 'var(--ink-4)' }}>{phase.role}</p>
                            <p className="mt-0.5" style={{ color: 'var(--ink-4)' }}>
                              {phase.rule === 'any' ? 'Any one approves' : 'All must approve'}
                              {phase.deadlineDays > 0 && ` · ${phase.deadlineDays}d`}
                            </p>
                          </div>
                          {i < flow.phases.length - 1 && (
                            <div className="text-lg font-light" style={{ color: 'var(--rule)' }}>→</div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit approval flow' : 'New approval flow'}</DialogTitle>
          </DialogHeader>
          <FlowEditor
            flow={typeof editing === 'object' ? editing : null}
            onSaved={handleSaved}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
