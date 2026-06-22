'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { ExpressionEditor } from './ExpressionEditor'
import { ActionConfigForm } from './ActionConfigForm'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import type { AutomationConfig } from '@/types/workflow'

interface WorkflowRule {
  id: string
  nodeId: string | null
  type: string
  trigger: string
  expression: string
  actions: AutomationConfig[]
  priority: number
  active: boolean
}

const TRIGGER_LABELS: Record<string, string> = {
  on_start: 'Instance started',
  on_step_complete: 'Step completed',
  on_instance_complete: 'Instance completed',
}

const DEFAULT_ACTION: AutomationConfig = { type: 'set_variable', variableName: '', expression: '' }

export function RuleBuilder() {
  const { rfNodes } = useCanvas()
  const { workflowId } = useWorkflowDesignerStore()
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const taskNodes = rfNodes.filter((n) => n.type === 'task')

  const fetchRules = useCallback(async () => {
    if (!workflowId) return
    try {
      const res = await fetch(`/api/workflows/${workflowId}/rules`)
      const data = await res.json() as { rules: WorkflowRule[] }
      setRules(data.rules ?? [])
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const selected = selectedId ? rules.find((r) => r.id === selectedId) : null

  const updateSelected = (patch: Partial<WorkflowRule>) => {
    setRules((prev) => prev.map((r) => r.id === selectedId ? { ...r, ...patch } : r))
  }

  const createRule = async () => {
    if (!workflowId) return
    const res = await fetch(`/api/workflows/${workflowId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'on_step_complete', expression: '', actions: [DEFAULT_ACTION], priority: 0, active: true }),
    })
    const data = await res.json() as { rule: WorkflowRule }
    setRules((prev) => [data.rule, ...prev])
    setSelectedId(data.rule.id)
  }

  const saveRule = async () => {
    if (!selected || !workflowId) return
    setSaving(true)
    try {
      await fetch(`/api/workflows/${workflowId}/rules/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selected.nodeId,
          trigger: selected.trigger,
          expression: selected.expression,
          actions: selected.actions,
          priority: selected.priority,
          active: selected.active,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async () => {
    if (!selected || !workflowId) return
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/workflows/${workflowId}/rules/${selected.id}`, { method: 'DELETE' })
    setRules((prev) => prev.filter((r) => r.id !== selected.id))
    setSelectedId(null)
  }

  const toggleActive = async (rule: WorkflowRule) => {
    const next = !rule.active
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, active: next } : r))
    await fetch(`/api/workflows/${workflowId}/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    })
  }

  const addAction = () => updateSelected({ actions: [...(selected?.actions ?? []), { ...DEFAULT_ACTION }] })
  const removeAction = (i: number) => updateSelected({ actions: (selected?.actions ?? []).filter((_, idx) => idx !== i) })
  const updateAction = (i: number, cfg: AutomationConfig) => {
    const next = [...(selected?.actions ?? [])]
    next[i] = cfg
    updateSelected({ actions: next })
  }

  const selectStyle = { border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--ink-4)' }}>
        Loading rules…
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left: rule list */}
      <div className="w-56 shrink-0 overflow-y-auto flex flex-col" style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--rule)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Rules</p>
          <button
            onClick={createRule}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] transition-colors"
            style={{ border: '1px solid var(--rule)', color: 'var(--ink-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nw-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
          >
            <Plus size={10} /> New
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <Shield size={20} style={{ color: 'var(--ink-4)' }} />
            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>No rules yet. Create one to automate actions on workflow events.</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {rules.map((rule) => {
              const active = selectedId === rule.id
              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-1 rounded-[2px] transition-colors"
                  style={{
                    background: active ? 'var(--accent-tint)' : 'transparent',
                    borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
                  }}
                >
                  <button
                    onClick={() => setSelectedId(rule.id)}
                    className="flex-1 text-left px-2 py-2 min-w-0"
                    onMouseEnter={(e) => { if (!active) (e.currentTarget.parentElement!.style.background = 'var(--paper-3)') }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget.parentElement!.style.background = 'transparent') }}
                  >
                    <p className="text-xs font-medium truncate" style={{ color: active ? 'var(--nw-accent)' : 'var(--ink-3)' }}>
                      {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--ink-4)' }}>
                      {rule.expression || 'Always fires'}
                    </p>
                  </button>
                  <button
                    onClick={() => toggleActive(rule)}
                    className="p-1 shrink-0"
                    title={rule.active ? 'Disable rule' : 'Enable rule'}
                    style={{ color: rule.active ? 'var(--ok)' : 'var(--ink-4)' }}
                  >
                    {rule.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: rule editor */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--ink-4)' }}>
            {rules.length === 0 ? 'Create a rule to get started.' : 'Select a rule to edit it.'}
          </div>
        ) : (
          <div className="max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Edit Rule</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>Fires when the trigger event occurs and the condition is met.</p>
              </div>
              <button onClick={deleteRule} className="p-1.5 rounded transition-colors" style={{ color: 'var(--ink-4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}>
                <Trash2 size={15} />
              </button>
            </div>

            {/* Trigger */}
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Trigger event</Label>
              <select
                value={selected.trigger}
                onChange={(e) => updateSelected({ trigger: e.target.value, nodeId: null })}
                className="w-full rounded-[2px] text-sm px-3 h-8 focus:outline-none"
                style={selectStyle}
              >
                <option value="on_start">Instance started</option>
                <option value="on_step_complete">Step completed</option>
                <option value="on_instance_complete">Instance completed</option>
              </select>
            </div>

            {/* Node scope (only for on_step_complete) */}
            {selected.trigger === 'on_step_complete' && taskNodes.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Scope (optional — any step if blank)</Label>
                <select
                  value={selected.nodeId ?? ''}
                  onChange={(e) => updateSelected({ nodeId: e.target.value || null })}
                  className="w-full rounded-[2px] text-sm px-3 h-8 focus:outline-none"
                  style={selectStyle}
                >
                  <option value="">Any task step</option>
                  {taskNodes.map((n) => (
                    <option key={n.id} value={n.id}>{(n.data as Record<string, unknown>)?.name as string ?? n.id}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Condition */}
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Condition</Label>
              <ExpressionEditor
                value={selected.expression}
                onChange={(v) => updateSelected({ expression: v })}
                placeholder="Leave blank to always fire — or e.g. variables.priority == &quot;high&quot;"
              />
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Priority (higher = evaluated first)</Label>
              <Input
                type="number"
                value={selected.priority}
                onChange={(e) => updateSelected({ priority: parseInt(e.target.value, 10) || 0 })}
                className="h-8 text-sm w-24"
              />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Actions</Label>
                <button
                  onClick={addAction}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[2px] transition-colors"
                  style={{ border: '1px solid var(--rule)', color: 'var(--ink-3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nw-accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
                >
                  <Plus size={10} /> Add action
                </button>
              </div>

              {(selected.actions ?? []).map((action, i) => (
                <div key={i} className="p-3 rounded-[2px] space-y-3" style={{ border: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>
                      Action {i + 1}
                    </span>
                    <button onClick={() => removeAction(i)} style={{ color: 'var(--ink-4)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <ActionConfigForm config={action} onChange={(cfg) => updateAction(i, cfg)} />
                </div>
              ))}

              {(selected.actions ?? []).length === 0 && (
                <p className="text-xs" style={{ color: 'var(--ink-4)' }}>No actions. Add one above.</p>
              )}
            </div>

            {/* Save */}
            <Button onClick={saveRule} disabled={saving} size="sm">
              {saving ? 'Saving…' : 'Save rule'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
