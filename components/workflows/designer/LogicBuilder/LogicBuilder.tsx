'use client'

import { useState } from 'react'
import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GitBranch, ChevronRight, Info } from 'lucide-react'

const OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '>=', label: 'greater than or equal' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less than or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

function parseCondition(expr: string): { field: string; operator: string; value: string } {
  if (!expr) return { field: '', operator: '==', value: '' }
  for (const op of ['>=', '<=', '!=', '>', '<', '==']) {
    const idx = expr.indexOf(op)
    if (idx !== -1) {
      return {
        field: expr.slice(0, idx).trim(),
        operator: op,
        value: expr.slice(idx + op.length).trim(),
      }
    }
  }
  if (expr.includes('contains')) {
    const parts = expr.split('contains')
    return { field: parts[0].trim(), operator: 'contains', value: parts[1]?.trim() ?? '' }
  }
  if (expr.includes('not_contains')) {
    const parts = expr.split('not_contains')
    return { field: parts[0].trim(), operator: 'not_contains', value: parts[1]?.trim() ?? '' }
  }
  if (expr.includes('is_not_empty')) {
    return { field: expr.replace('is_not_empty', '').trim(), operator: 'is_not_empty', value: '' }
  }
  if (expr.includes('is_empty')) {
    return { field: expr.replace('is_empty', '').trim(), operator: 'is_empty', value: '' }
  }
  return { field: expr, operator: '==', value: '' }
}

function buildCondition(field: string, operator: string, value: string): string {
  if (!field) return ''
  if (operator === 'is_empty' || operator === 'is_not_empty') return `${field} ${operator}`
  if (operator === 'contains' || operator === 'not_contains') return `${field} ${operator} ${value}`
  return `${field} ${operator} ${value}`
}

interface ConditionRowProps {
  edgeId: string
  label: string
  condition: string
  targetName: string
  isDefault: boolean
  onChange: (edgeId: string, label: string, condition: string) => void
}

function ConditionRow({ edgeId, label, condition, targetName, isDefault, onChange }: ConditionRowProps) {
  const parsed = parseCondition(condition)
  const noValueOp = parsed.operator === 'is_empty' || parsed.operator === 'is_not_empty'

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => onChange(edgeId, e.target.value, condition)}
              className="h-7 text-xs font-medium"
              placeholder="Branch label"
            />
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 truncate">{targetName}</span>
          </div>
        </div>
        {isDefault && (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium shrink-0">default</span>
        )}
      </div>

      {!isDefault && (
        <div className="space-y-2">
          <Label className="text-[10px] text-slate-500 uppercase tracking-wide">Condition</Label>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={parsed.field}
              onChange={(e) => onChange(edgeId, label, buildCondition(e.target.value, parsed.operator, parsed.value))}
              className="h-7 text-xs flex-1 min-w-[100px]"
              placeholder="variables.fieldName"
            />
            <select
              value={parsed.operator}
              onChange={(e) => onChange(edgeId, label, buildCondition(parsed.field, e.target.value, parsed.value))}
              className="h-7 text-xs rounded-md border border-slate-200 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {!noValueOp && (
              <Input
                value={parsed.value}
                onChange={(e) => onChange(edgeId, label, buildCondition(parsed.field, parsed.operator, e.target.value))}
                className="h-7 text-xs flex-1 min-w-[80px]"
                placeholder="value"
              />
            )}
          </div>
          {condition && (
            <p className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1 break-all">{condition}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function LogicBuilder() {
  const { rfNodes, rfEdges, setRfEdges } = useCanvas()
  const { markDirty } = useWorkflowDesignerStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const decisionNodes = rfNodes.filter((n) => n.type === 'decision')

  const selectedNode = selectedNodeId ? rfNodes.find((n) => n.id === selectedNodeId) : null
  const outgoingEdges = selectedNode
    ? rfEdges.filter((e) => e.source === selectedNode.id)
    : []

  const getNodeName = (nodeId: string) => {
    const n = rfNodes.find((x) => x.id === nodeId)
    return (n?.data as Record<string, unknown>)?.name as string || n?.type || nodeId
  }

  const handleEdgeChange = (edgeId: string, label: string, condition: string) => {
    setRfEdges((edges) =>
      edges.map((e) =>
        e.id === edgeId
          ? { ...e, label, data: { ...((e.data as object) ?? {}), condition } }
          : e
      )
    )
    markDirty()
  }

  if (decisionNodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="p-4 rounded-full bg-orange-50">
          <GitBranch size={24} className="text-orange-400" />
        </div>
        <div>
          <p className="font-medium text-slate-700 text-sm">No decision nodes</p>
          <p className="text-xs text-slate-400 mt-1">Add a Decision node to the canvas to configure branching logic.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left: decision node list */}
      <div className="w-56 border-r border-slate-200 bg-slate-50 overflow-y-auto shrink-0">
        <div className="p-3 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Decision Nodes</p>
        </div>
        <div className="p-2 space-y-1">
          {decisionNodes.map((node) => {
            const name = (node.data as Record<string, unknown>)?.name as string || 'Decision'
            const branchCount = rfEdges.filter((e) => e.source === node.id).length
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedNodeId === node.id
                    ? 'bg-orange-100 text-orange-800'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <p className="font-medium truncate">{name}</p>
                <p className="text-[10px] text-slate-400">{branchCount} branch{branchCount !== 1 ? 'es' : ''}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: branch conditions */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selectedNode ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select a decision node to configure its branches.
          </div>
        ) : (
          <div className="max-w-xl space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                {(selectedNode.data as Record<string, unknown>)?.name as string || 'Decision'} — Branches
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure conditions for each outgoing branch. Use <code className="font-mono bg-slate-100 px-1 rounded">variables.fieldName</code> to reference form data.
              </p>
            </div>

            {outgoingEdges.length === 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <Info size={14} className="shrink-0 mt-0.5" />
                No outgoing edges. Connect this node to other nodes on the canvas first.
              </div>
            )}

            <div className="space-y-3">
              {outgoingEdges.map((edge, idx) => (
                <ConditionRow
                  key={edge.id}
                  edgeId={edge.id}
                  label={(edge.label as string) ?? ''}
                  condition={(edge.data as Record<string, unknown>)?.condition as string ?? ''}
                  targetName={getNodeName(edge.target)}
                  isDefault={idx === outgoingEdges.length - 1 && outgoingEdges.length > 1}
                  onChange={handleEdgeChange}
                />
              ))}
            </div>

            {outgoingEdges.length > 0 && (
              <p className="text-[10px] text-slate-400">
                The last branch acts as the default if no conditions match.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
