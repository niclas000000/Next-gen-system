'use client'

import { useEffect, useRef } from 'react'
import { ReactFlowProvider, useReactFlow, type Node, type Edge, MarkerType } from 'reactflow'
import { WorkflowToolbar } from '@/components/workflows/designer/WorkflowToolbar'
import { DesignerTabs } from '@/components/workflows/designer/DesignerTabs'
import { CanvasProvider, useCanvas } from '@/components/workflows/designer/CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import type { WorkflowEdge, WorkflowSettings, WorkflowStatus, WorkflowNode } from '@/types/workflow'

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

// Handles auto-save. Lives inside CanvasProvider so it can read rfNodes/rfEdges via useCanvas().
function AutoSave() {
  const { rfNodes, rfEdges } = useCanvas()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { isDirty, workflowId, workflowName, workflowDescription, workflowSettings } = useWorkflowDesignerStore()

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

  return null
}

// Handles initialization and fitView. Lives inside CanvasProvider and ReactFlowProvider.
function DesignerContent({ definition }: Props) {
  const { initialize } = useWorkflowDesignerStore()
  const { fitView } = useReactFlow()

  useEffect(() => {
    initialize(definition)
    setTimeout(() => fitView({ padding: 0.4, duration: 200 }), 150)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.id])

  return (
    <div className="-mx-6 -mb-6 flex flex-col h-[calc(100vh-88px)] min-h-0">
      <WorkflowToolbar />
      <DesignerTabs />
      <AutoSave />
    </div>
  )
}

function DesignerShellInner({ definition }: Props) {
  return (
    <CanvasProvider
      initialNodes={definition.nodes as Node[]}
      initialEdges={definition.edges.map(toRFEdge)}
    >
      <DesignerContent definition={definition} />
    </CanvasProvider>
  )
}

export function DesignerShell({ definition }: Props) {
  return (
    <ReactFlowProvider>
      <DesignerShellInner definition={definition} />
    </ReactFlowProvider>
  )
}
