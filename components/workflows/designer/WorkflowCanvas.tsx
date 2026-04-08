'use client'

import 'reactflow/dist/style.css'

import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  MarkerType,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow'
import { nodeTypes } from './NodeTypes'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import type { WorkflowEdge, NodeType } from '@/types/workflow'

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    addEdge: storeAddEdge,
    setSelectedNode,
    setSelectedEdge,
    clearSelection,
  } = useWorkflowDesignerStore()

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter((c) => c.type !== 'remove')
      setNodes(applyNodeChanges(filtered, nodes) as typeof nodes)
    },
    [nodes, setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const filtered = changes.filter((c) => c.type !== 'remove')
      setEdges(applyEdgeChanges(filtered, edges as Edge[]) as unknown as typeof edges)
    },
    [edges, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      let label: string | undefined
      if (sourceNode?.type === 'decision') {
        label = connection.sourceHandle === 'yes' ? 'Yes' : connection.sourceHandle === 'no' ? 'No' : undefined
      }
      const newEdge: WorkflowEdge = {
        id: `e-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        label,
      }
      storeAddEdge(newEdge)
    },
    [nodes, storeAddEdge]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/nexus-node-type') as NodeType
      if (!type) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode]
  )

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id)
    },
    [setSelectedEdge]
  )

  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const rfEdges: Edge[] = (edges as WorkflowEdge[]).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    label: e.label,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: '#64748b', fontWeight: 500 },
    labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
    labelBgPadding: [4, 3] as [number, number],
    labelBgBorderRadius: 3,
  }))

  return (
    <div ref={reactFlowWrapper} className="flex-1 w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        elevateNodesOnSelect
        className="bg-slate-50"
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
