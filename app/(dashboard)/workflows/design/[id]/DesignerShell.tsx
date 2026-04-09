'use client'

import { useEffect, useRef } from 'react'
import { ReactFlowProvider, useNodesState, useEdgesState, useReactFlow, type Node, type Edge, MarkerType } from 'reactflow'
import { WorkflowToolbar } from '@/components/workflows/designer/WorkflowToolbar'
import { DesignerTabs } from '@/components/workflows/designer/DesignerTabs'
import { CanvasContext } from '@/components/workflows/designer/CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import type { WorkflowNode, WorkflowEdge, WorkflowSettings, WorkflowStatus } from '@/types/workflow'

interface Props {
  definition: {
    id: string
    name: string
    description: string
    status: WorkflowStatus
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    settings: WorkflowSettings
  }
}

function toRFEdge(e: WorkflowEdge): Edge {
  return {
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
  }
}

function DesignerShellInner({ definition }: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(definition.nodes as Node[])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(definition.edges.map(toRFEdge))

  const { initialize, isDirty, isSaving, workflowId, workflowName, workflowDescription, workflowSettings } = useWorkflowDesignerStore()
  const { fitView } = useReactFlow()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    initialize(definition)
    setRfNodes(definition.nodes as Node[])
    setRfEdges(definition.edges.map(toRFEdge))
    setTimeout(() => fitView({ padding: 0.4, duration: 200 }), 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.id])

  // Auto-save: debounced 2s after any dirty change
  useEffect(() => {
    if (!isDirty) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          description: workflowDescription,
          nodes: rfNodes,
          edges: rfEdges.map(e => ({
            id: e.id, source: e.source, target: e.target,
            sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, label: e.label,
          })),
          settings: workflowSettings,
        }),
      })
      useWorkflowDesignerStore.setState({ isDirty: false, isSaving: false, lastSavedAt: new Date() })
    }, 2000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])

  return (
    <CanvasContext.Provider value={{ rfNodes, rfEdges, setRfNodes, setRfEdges, onNodesChange, onEdgesChange }}>
      <div className="flex flex-col h-full">
        <WorkflowToolbar rfEdges={rfEdges} />
        <DesignerTabs />
      </div>
    </CanvasContext.Provider>
  )
}

export function DesignerShell({ definition }: Props) {
  return (
    <ReactFlowProvider>
      <DesignerShellInner definition={definition} />
    </ReactFlowProvider>
  )
}
