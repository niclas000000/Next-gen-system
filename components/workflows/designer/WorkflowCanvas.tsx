'use client'

import 'reactflow/dist/style.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  ConnectionLineType,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  type OnConnectStartParams,
} from 'reactflow'
import { Trash2 } from 'lucide-react'
import { nodeTypes } from './NodeTypes'
import { useCanvas } from './CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import type { NodeType } from '@/types/workflow'
import { makeDefaultNodeData } from '@/lib/workflow-defaults'
import { nodepalette } from './WorkflowToolbar'

type PopoverState = {
  visible: boolean
  x: number
  y: number
  flowX: number
  flowY: number
}

type QuickAddState = PopoverState & {
  fromNodeId: string
  fromHandleId: string | null
}

type NodeMenuState = {
  visible: boolean
  x: number
  y: number
  nodeId: string
}

const MENU_WIDTH = 208

export function WorkflowCanvas() {
  const { rfNodes, rfEdges, setRfNodes, setRfEdges, onNodesChange, onEdgesChange } = useCanvas()
  const { setSelectedNode, setSelectedEdge, clearSelection, markDirty } = useWorkflowDesignerStore()
  const { screenToFlowPosition } = useReactFlow()

  const canvasRef = useRef<HTMLDivElement>(null)

  const [contextMenu, setContextMenu] = useState<PopoverState>({
    visible: false, x: 0, y: 0, flowX: 0, flowY: 0,
  })
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    visible: false, x: 0, y: 0, flowX: 0, flowY: 0, fromNodeId: '', fromHandleId: null,
  })
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState>({
    visible: false, x: 0, y: 0, nodeId: '',
  })

  // Refs for edge quick-add detection
  const connectingNodeRef = useRef<{ nodeId: string; handleId: string | null } | null>(null)
  const connectionMadeRef = useRef(false)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const computePopoverX = useCallback((offsetX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect && offsetX + MENU_WIDTH > rect.width ? offsetX - MENU_WIDTH : offsetX
  }, [])

  const closeAll = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setQuickAdd((prev) => ({ ...prev, visible: false }))
    setNodeMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  /** Creates a node at the given flow position and auto-selects it */
  const addNodeAt = useCallback((type: NodeType, flowX: number, flowY: number) => {
    const id = `${type}-${Date.now()}`
    setRfNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      { id, type, position: { x: flowX, y: flowY }, data: makeDefaultNodeData(type), selected: true },
    ])
    setSelectedNode(id)
    markDirty()
  }, [setRfNodes, setSelectedNode, markDirty])

  // ── Context menu ───────────────────────────────────────────────────────────

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const rect = canvasRef.current?.getBoundingClientRect()
      const offsetX = rect ? e.clientX - rect.left : e.clientX
      const offsetY = rect ? e.clientY - rect.top : e.clientY
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setContextMenu({
        visible: true,
        x: computePopoverX(offsetX),
        y: offsetY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      })
      setQuickAdd((prev) => ({ ...prev, visible: false }))
    },
    [screenToFlowPosition, computePopoverX]
  )

  const addNodeFromContextMenu = useCallback((type: NodeType) => {
    addNodeAt(type, contextMenu.flowX, contextMenu.flowY)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [addNodeAt, contextMenu.flowX, contextMenu.flowY])

  // ── Node context menu ──────────────────────────────────────────────────────

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    setNodeMenu({
      visible: true,
      x: rect ? e.clientX - rect.left : e.clientX,
      y: rect ? e.clientY - rect.top : e.clientY,
      nodeId: node.id,
    })
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setQuickAdd((prev) => ({ ...prev, visible: false }))
  }, [])

  const deleteNodeById = useCallback((nodeId: string) => {
    setRfNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setRfEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    clearSelection()
    markDirty()
    setNodeMenu((prev) => ({ ...prev, visible: false }))
  }, [setRfNodes, setRfEdges, clearSelection, markDirty])

  // ── Edge quick-add ─────────────────────────────────────────────────────────

  const onConnectStart = useCallback((_: unknown, { nodeId, handleId }: OnConnectStartParams) => {
    connectingNodeRef.current = nodeId ? { nodeId, handleId } : null
    connectionMadeRef.current = false
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      connectionMadeRef.current = true
      const sourceNode = rfNodes.find((n) => n.id === connection.source)
      let label: string | undefined
      if (sourceNode?.type === 'decision') {
        label = connection.sourceHandle === 'yes' ? 'Yes' : connection.sourceHandle === 'no' ? 'No' : undefined
      }
      const newEdge: Edge = {
        id: `e-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        labelStyle: { fontSize: 11, fill: '#64748b', fontWeight: 500 },
        labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
        labelBgPadding: [4, 3] as [number, number],
        labelBgBorderRadius: 3,
      }
      setRfEdges((eds) => [...eds, newEdge])
      markDirty()
    },
    [rfNodes, setRfEdges, markDirty]
  )

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (connectionMadeRef.current || !connectingNodeRef.current) {
        connectingNodeRef.current = null
        return
      }
      const from = connectingNodeRef.current
      connectingNodeRef.current = null
      const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
      const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY
      const rect = canvasRef.current?.getBoundingClientRect()
      const offsetX = rect ? clientX - rect.left : clientX
      const offsetY = rect ? clientY - rect.top : clientY
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY })
      setQuickAdd({
        visible: true,
        x: computePopoverX(offsetX),
        y: offsetY,
        flowX: flowPos.x,
        flowY: flowPos.y,
        fromNodeId: from.nodeId,
        fromHandleId: from.handleId,
      })
      setContextMenu((prev) => ({ ...prev, visible: false }))
    },
    [screenToFlowPosition, computePopoverX]
  )

  const addNodeFromQuickAdd = useCallback((type: NodeType) => {
    const id = `${type}-${Date.now()}`
    setRfNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      { id, type, position: { x: quickAdd.flowX, y: quickAdd.flowY }, data: makeDefaultNodeData(type), selected: true },
    ])
    // Auto-connect from source handle
    const sourceNode = rfNodes.find((n) => n.id === quickAdd.fromNodeId)
    let label: string | undefined
    if (sourceNode?.type === 'decision') {
      label = quickAdd.fromHandleId === 'yes' ? 'Yes' : quickAdd.fromHandleId === 'no' ? 'No' : undefined
    }
    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: quickAdd.fromNodeId,
      target: id,
      sourceHandle: quickAdd.fromHandleId,
      targetHandle: null,
      label,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      labelStyle: { fontSize: 11, fill: '#64748b', fontWeight: 500 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
      labelBgPadding: [4, 3] as [number, number],
      labelBgBorderRadius: 3,
    }
    setRfEdges((eds) => [...eds, newEdge])
    setSelectedNode(id)
    markDirty()
    setQuickAdd((prev) => ({ ...prev, visible: false }))
  }, [quickAdd, rfNodes, setRfNodes, setRfEdges, setSelectedNode, markDirty])

  // ── Escape key dismissal ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeAll])

  // ── Node picker shared JSX ─────────────────────────────────────────────────

  const NodePickerGrid = ({ onPick }: { onPick: (type: NodeType) => void }) => (
    <div className="grid grid-cols-3 gap-1">
      {nodepalette.map((item) => (
        <button
          key={item.type}
          onClick={() => onPick(item.type)}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded border bg-white text-[10px] text-slate-600 cursor-pointer transition-colors ${item.color}`}
        >
          {item.icon}
          <span className="leading-none">{item.label}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div
      ref={canvasRef}
      className="flex-1 w-full h-full relative"
    >
      {/* Right-click context menu */}
      {contextMenu.visible && (
        <div
          className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-52"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 px-1">
            Add node
          </p>
          <NodePickerGrid onPick={addNodeFromContextMenu} />
        </div>
      )}

      {/* Node right-click menu */}
      {nodeMenu.visible && (
        <div
          className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36"
          style={{ left: nodeMenu.x, top: nodeMenu.y }}
        >
          <button
            onClick={() => deleteNodeById(nodeMenu.nodeId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
            Delete node
          </button>
        </div>
      )}

      {/* Edge quick-add popover */}
      {quickAdd.visible && (
        <div
          className="absolute z-50 bg-white border border-blue-200 rounded-lg shadow-lg p-2 w-48"
          style={{ left: quickAdd.x, top: quickAdd.y }}
        >
          <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1.5 px-1">
            Connect to...
          </p>
          <NodePickerGrid onPick={addNodeFromQuickAdd} />
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={(_e, node) => { closeAll(); setSelectedNode(node.id) }}
        onEdgeClick={(_e, edge) => { closeAll(); setSelectedEdge(edge.id) }}
        onPaneClick={() => { clearSelection(); closeAll() }}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={2}
        elevateNodesOnSelect
        className="bg-slate-50 w-full h-full"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls className="!shadow-sm !border !border-slate-200 !rounded-lg overflow-hidden" />
        <MiniMap
          className="!shadow-sm !border !border-slate-200 !rounded-lg"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              start: '#22c55e', task: '#3b82f6', decision: '#f97316',
              automation: '#a855f7', notification: '#0ea5e9', subprocess: '#6366f1',
              delay: '#f59e0b', 'parallel-split': '#14b8a6', 'parallel-join': '#14b8a6', end: '#ef4444',
            }
            return colors[node.type ?? ''] ?? '#94a3b8'
          }}
          maskColor="rgba(248,250,252,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
