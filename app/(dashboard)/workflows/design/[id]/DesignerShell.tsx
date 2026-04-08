'use client'

import { useEffect, useRef } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { WorkflowToolbar } from '@/components/workflows/designer/WorkflowToolbar'
import { DesignerTabs } from '@/components/workflows/designer/DesignerTabs'
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

function DesignerShellInner({ definition }: Props) {
  const { initialize, isDirty, save } = useWorkflowDesignerStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    initialize(definition)
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.id])

  // Auto-save: debounced 2s after any dirty change
  useEffect(() => {
    if (!isDirty) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      save()
    }, 2000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [isDirty, save])

  return (
    <div className="flex flex-col h-full">
      <WorkflowToolbar />
      <DesignerTabs />
    </div>
  )
}

export function DesignerShell({ definition }: Props) {
  return (
    <ReactFlowProvider>
      <DesignerShellInner definition={definition} />
    </ReactFlowProvider>
  )
}
