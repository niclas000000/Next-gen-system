'use client'

import { useState, useCallback } from 'react'
import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ExpressionEditor } from './ExpressionEditor'
import { GitBranch, ChevronRight, Info, Code2, Plus, X, ChevronDown } from 'lucide-react'
import type { ConditionTree, ConditionLeaf, ConditionGroup } from '@/types/workflow'

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Compile ConditionTree → expression string (for engine)
// ---------------------------------------------------------------------------
export function buildExpressionFromTree(tree: ConditionTree): string {
  if (tree.type === 'leaf') {
    const { field, operator, value } = tree
    if (!field) return ''
    if (operator === 'is_empty' || operator === 'is_not_empty') return `${field} ${operator}`
    if (operator === 'contains' || operator === 'not_contains') return `${field} ${operator} ${value}`
    return `${field} ${operator} ${value}`
  }
  // group
  const parts = tree.conditions
    .map((c) => buildExpressionFromTree(c))
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  const joined = parts.map((p) => (p.includes(' OR ') || p.includes(' AND ') ? `(${p})` : p)).join(` ${tree.logic} `)
  return joined
}

// ---------------------------------------------------------------------------
// Parse a simple expression string back to a ConditionLeaf (best-effort)
// ---------------------------------------------------------------------------
function parseToLeaf(expr: string): ConditionLeaf {
  if (!expr) return { type: 'leaf', field: '', operator: '==', value: '' }
  for (const op of ['>=', '<=', '!=', '>', '<', '==']) {
    const idx = expr.indexOf(op)
    if (idx !== -1) {
      return { type: 'leaf', field: expr.slice(0, idx).trim(), operator: op, value: expr.slice(idx + op.length).trim() }
    }
  }
  for (const op of ['not_contains', 'contains', 'is_not_empty', 'is_empty']) {
    if (expr.includes(op)) {
      const [f, ...rest] = expr.split(op)
      return { type: 'leaf', field: f.trim(), operator: op, value: rest.join(op).trim() }
    }
  }
  return { type: 'leaf', field: expr, operator: '==', value: '' }
}

function defaultLeaf(): ConditionLeaf {
  return { type: 'leaf', field: 'variables.', operator: '==', value: '' }
}

// ---------------------------------------------------------------------------
// ConditionLeafRow
// ---------------------------------------------------------------------------
function LeafRow({
  leaf,
  onChange,
  onRemove,
  showRemove,
}: {
  leaf: ConditionLeaf
  onChange: (l: ConditionLeaf) => void
  onRemove?: () => void
  showRemove: boolean
}) {
  const noVal = leaf.operator === 'is_empty' || leaf.operator === 'is_not_empty'
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Input
        value={leaf.field}
        onChange={(e) => onChange({ ...leaf, field: e.target.value })}
        className="h-7 text-xs w-36 min-w-0 font-mono"
        placeholder="variables.field"
      />
      <select
        value={leaf.operator}
        onChange={(e) => onChange({ ...leaf, operator: e.target.value, value: '' })}
        className="h-7 text-xs rounded-[2px] px-1.5 focus:outline-none"
        style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      {!noVal && (
        <Input
          value={leaf.value}
          onChange={(e) => onChange({ ...leaf, value: e.target.value })}
          className="h-7 text-xs w-28 min-w-0"
          placeholder="value"
        />
      )}
      {showRemove && onRemove && (
        <button onClick={onRemove} className="p-0.5 rounded transition-colors" style={{ color: 'var(--ink-4)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}>
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConditionTreeEditor (recursive)
// ---------------------------------------------------------------------------
function TreeEditor({
  tree,
  onChange,
  onRemove,
  depth = 0,
}: {
  tree: ConditionTree
  onChange: (t: ConditionTree) => void
  onRemove?: () => void
  depth?: number
}) {
  if (tree.type === 'leaf') {
    return (
      <div className="flex items-start gap-2">
        <LeafRow
          leaf={tree}
          onChange={(l) => onChange(l)}
          onRemove={onRemove}
          showRemove={!!onRemove}
        />
        <button
          onClick={() => onChange({ type: 'group', logic: 'AND', conditions: [tree, defaultLeaf()] })}
          className="h-7 flex items-center gap-1 text-[10px] px-1.5 rounded-[2px] transition-colors shrink-0"
          style={{ border: '1px solid var(--rule)', color: 'var(--ink-3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nw-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
          title="Add AND/OR group"
        >
          <Plus size={9} /> Group
        </button>
      </div>
    )
  }

  // group
  const { logic, conditions } = tree

  const updateChild = (i: number, child: ConditionTree) => {
    const next = [...conditions]
    next[i] = child
    onChange({ ...tree, conditions: next })
  }

  const removeChild = (i: number) => {
    const next = conditions.filter((_, idx) => idx !== i)
    if (next.length === 1) {
      onChange(next[0]) // collapse group back to single leaf
    } else {
      onChange({ ...tree, conditions: next })
    }
  }

  const addLeaf = () => onChange({ ...tree, conditions: [...conditions, defaultLeaf()] })
  const addGroup = () => onChange({ ...tree, conditions: [...conditions, { type: 'group', logic: 'AND', conditions: [defaultLeaf()] }] })

  const logicColor = logic === 'AND' ? 'var(--nw-accent)' : 'var(--warn)'

  return (
    <div
      className="space-y-2 p-2 rounded-[2px]"
      style={{ border: `1px solid var(--rule)`, background: depth % 2 === 0 ? 'var(--paper-2)' : 'var(--surface)', marginLeft: depth > 0 ? '8px' : 0 }}
    >
      {/* Logic toggle + remove group */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-[2px] overflow-hidden" style={{ border: '1px solid var(--rule)' }}>
          {(['AND', 'OR'] as const).map((l) => (
            <button
              key={l}
              onClick={() => onChange({ ...tree, logic: l })}
              className="px-2 py-0.5 text-[10px] font-semibold transition-colors"
              style={{
                background: logic === l ? logicColor : 'transparent',
                color: logic === l ? '#fff' : 'var(--ink-4)',
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>Match {logic === 'AND' ? 'all' : 'any'} of:</span>
        {onRemove && (
          <button onClick={onRemove} className="ml-auto p-0.5 rounded" style={{ color: 'var(--ink-4)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--risk)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Children */}
      {conditions.map((child, i) => (
        <TreeEditor
          key={i}
          tree={child}
          onChange={(c) => updateChild(i, c)}
          onRemove={conditions.length > 1 ? () => removeChild(i) : undefined}
          depth={depth + 1}
        />
      ))}

      {/* Add buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={addLeaf}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-[2px] transition-colors"
          style={{ border: '1px solid var(--rule)', color: 'var(--ink-3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nw-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
        >
          <Plus size={9} /> Condition
        </button>
        {depth < 2 && (
          <button
            onClick={addGroup}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-[2px] transition-colors"
            style={{ border: '1px solid var(--rule)', color: 'var(--ink-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nw-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
          >
            <Plus size={9} /> Group
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EdgeConditionEditor — one edge's condition
// ---------------------------------------------------------------------------
interface EdgeConditionEditorProps {
  edgeId: string
  label: string
  conditionTree: ConditionTree
  conditionExpr: string
  conditionMode: 'builder' | 'expression'
  targetName: string
  isDefault: boolean
  onChange: (edgeId: string, label: string, tree: ConditionTree, expr: string, mode: 'builder' | 'expression') => void
}

function EdgeConditionEditor({
  edgeId, label, conditionTree, conditionExpr, conditionMode, targetName, isDefault, onChange,
}: EdgeConditionEditorProps) {
  const isExpr = conditionMode === 'expression'

  const handleTreeChange = (tree: ConditionTree) => {
    onChange(edgeId, label, tree, buildExpressionFromTree(tree), 'builder')
  }

  const handleExprChange = (expr: string) => {
    onChange(edgeId, label, conditionTree, expr, 'expression')
  }

  return (
    <div className="rounded-[2px] p-3 space-y-3" style={{ border: '1px solid var(--rule)', background: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--warn)' }} />
        <Input
          value={label}
          onChange={(e) => onChange(edgeId, e.target.value, conditionTree, conditionExpr, conditionMode)}
          className="h-7 text-xs font-medium flex-1"
          placeholder="Branch label"
        />
        <ChevronRight size={12} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
        <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--ink-3)' }}>{targetName}</span>
        {isDefault && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
            style={{ background: 'var(--paper-3)', color: 'var(--ink-4)' }}>default</span>
        )}
      </div>

      {/* Condition section (hidden for default branch) */}
      {!isDefault && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Condition</Label>
            <button
              onClick={() => onChange(edgeId, label, conditionTree, conditionExpr, isExpr ? 'builder' : 'expression')}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: isExpr ? 'var(--accent-tint)' : 'transparent',
                color: isExpr ? 'var(--nw-accent)' : 'var(--ink-4)',
                border: `1px solid ${isExpr ? 'var(--nw-accent)' : 'var(--rule)'}`,
              }}
            >
              <Code2 size={10} /> Expression
            </button>
          </div>

          {isExpr ? (
            <ExpressionEditor
              value={conditionExpr}
              onChange={handleExprChange}
              placeholder="variables.amount > 1000 AND variables.type == 'urgent'"
            />
          ) : (
            <TreeEditor tree={conditionTree} onChange={handleTreeChange} />
          )}

          {conditionExpr && (
            <p className="text-[10px] font-mono px-2 py-1 rounded-[2px] break-all"
              style={{ background: 'var(--paper-2)', color: 'var(--ink-4)' }}>
              {conditionExpr}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LogicBuilder — main component
// ---------------------------------------------------------------------------
export function LogicBuilder() {
  const { rfNodes, rfEdges, setRfEdges } = useCanvas()
  const { markDirty } = useWorkflowDesignerStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const decisionNodes = rfNodes.filter((n) => n.type === 'decision')
  const selectedNode = selectedNodeId ? rfNodes.find((n) => n.id === selectedNodeId) : null
  const outgoingEdges = selectedNode ? rfEdges.filter((e) => e.source === selectedNode.id) : []

  const getNodeName = (nodeId: string) => {
    const n = rfNodes.find((x) => x.id === nodeId)
    return (n?.data as Record<string, unknown>)?.name as string || n?.type || nodeId
  }

  // Rehydrate tree from edge data
  const getEdgeTree = useCallback((edge: (typeof rfEdges)[number]): ConditionTree => {
    const data = edge.data as Record<string, unknown> | undefined
    const config = data?.conditionConfig as ConditionTree | undefined
    const mode = data?.conditionMode as string | undefined
    if (config && mode === 'builder') return config
    // Fall back: parse the string expression to a single leaf
    const expr = (data?.condition as string) ?? ''
    return parseToLeaf(expr)
  }, [rfEdges])

  const getEdgeMode = (edge: (typeof rfEdges)[number]): 'builder' | 'expression' => {
    const data = edge.data as Record<string, unknown> | undefined
    return (data?.conditionMode as 'builder' | 'expression') ?? 'builder'
  }

  const handleEdgeChange = (
    edgeId: string,
    label: string,
    tree: ConditionTree,
    expr: string,
    mode: 'builder' | 'expression'
  ) => {
    setRfEdges((edges) =>
      edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              label,
              data: {
                ...((e.data as object) ?? {}),
                condition: expr,
                conditionConfig: mode === 'builder' ? tree : undefined,
                conditionMode: mode,
              },
            }
          : e
      )
    )
    markDirty()
  }

  if (decisionNodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="p-3 rounded-[2px]" style={{ background: 'var(--paper-2)' }}>
          <GitBranch size={22} style={{ color: 'var(--ink-4)' }} />
        </div>
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--ink-3)' }}>No decision nodes</p>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
            Add a Decision node to the canvas to configure branching logic.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left: decision node list */}
      <div className="w-52 shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--rule)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Decision Nodes</p>
        </div>
        <div className="p-2 space-y-0.5">
          {decisionNodes.map((node) => {
            const name = (node.data as Record<string, unknown>)?.name as string || 'Decision'
            const branchCount = rfEdges.filter((e) => e.source === node.id).length
            const active = selectedNodeId === node.id
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className="w-full text-left px-3 py-2 rounded-[2px] text-sm transition-colors"
                style={{
                  background: active ? 'var(--accent-tint)' : 'transparent',
                  color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
                  borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <p className="font-medium truncate">{name}</p>
                <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>{branchCount} branch{branchCount !== 1 ? 'es' : ''}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: branch conditions */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selectedNode ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--ink-4)' }}>
            Select a decision node to configure its branches.
          </div>
        ) : (
          <div className="max-w-xl space-y-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                {(selectedNode.data as Record<string, unknown>)?.name as string || 'Decision'} — Branches
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                Configure conditions for each outgoing branch. Use{' '}
                <code className="font-mono px-1 rounded-[2px]" style={{ background: 'var(--paper-2)' }}>
                  variables.fieldName
                </code>{' '}
                to reference workflow variables.
              </p>
            </div>

            {outgoingEdges.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-[2px] text-xs" style={{ background: 'var(--accent-tint)', border: '1px solid var(--nw-accent)', color: 'var(--nw-accent)' }}>
                <Info size={14} className="shrink-0 mt-0.5" />
                No outgoing edges. Connect this node to other nodes on the canvas first.
              </div>
            )}

            <div className="space-y-3">
              {outgoingEdges.map((edge, idx) => {
                const isDefault = idx === outgoingEdges.length - 1 && outgoingEdges.length > 1
                return (
                  <EdgeConditionEditor
                    key={edge.id}
                    edgeId={edge.id}
                    label={(edge.label as string) ?? ''}
                    conditionTree={getEdgeTree(edge)}
                    conditionExpr={(edge.data as Record<string, unknown>)?.condition as string ?? ''}
                    conditionMode={getEdgeMode(edge)}
                    targetName={getNodeName(edge.target)}
                    isDefault={isDefault}
                    onChange={handleEdgeChange}
                  />
                )
              })}
            </div>

            {outgoingEdges.length > 1 && (
              <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                The last branch acts as the default if no conditions match.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
