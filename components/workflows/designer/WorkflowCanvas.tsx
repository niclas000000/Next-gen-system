'use client'

import 'reactflow/dist/style.css'

import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  ConnectionLineType,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow'
import { nodeTypes } from './NodeTypes'
import { useCanvas } from './CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import type { NodeType } from '@/types/workflow'
import { makeDefaultNodeData } from '@/lib/workflow-defaults'

const DATA_TYPE = 'application/nexus-node-type'

export function WorkflowCanvas() {
  const { rfNodes, rfEdges, setRfNodes, setRfEdges, onNodesChange, onEdgesChange } = useCanvas()
  const { setSelectedNode, setSelectedEdge, clearSelection, markDirty } = useWorkflowDesignerStore()
  const { screenToFlowPosition } = useReactFlow()

  // Document-level dragover so cursor shows "copy" anywhere over the page during drag
  useEffect(() => {
    const handler = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes(DATA_TYPE)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
    document.addEventListener('dragover', handler)
    return () => document.removeEventListener('dragover', handler)
  }, [])

  // onDrop on the wrapper div — fires when user releases over the canvas area
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const type = e.dataTransfer.getData(DATA_TYPE) as NodeType
      if (!type) return
      // screenToFlowPosition is from useReactFlow() — always live, never stale
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const id = `${type}-${Date.now()}`
      setRfNodes((nds) => [...nds, { id, type, position, data: makeDefaultNodeData(type) }])
      markDirty()
    },
    [screenToFlowPosition, setRfNodes, markDirty]
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
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

  return (
    <div
      className="flex-1 w-full h-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_e, node) => setSelectedNode(node.id)}
        onEdgeClick={(_e, edge) => setSelectedEdge(edge.id)}
        onPaneClick={clearSelection}
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
