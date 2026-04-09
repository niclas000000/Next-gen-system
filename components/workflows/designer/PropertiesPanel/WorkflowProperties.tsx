'use client'

import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function WorkflowProperties() {
  const { rfNodes, rfEdges } = useCanvas()
  const { workflowName, workflowDescription, updateWorkflowMeta } = useWorkflowDesignerStore()

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs font-semibold text-slate-800">Workflow Properties</p>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={workflowName} onChange={(e) => updateWorkflowMeta({ name: e.target.value })} className="h-8 text-sm" placeholder="Workflow name" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <textarea value={workflowDescription} onChange={(e) => updateWorkflowMeta({ description: e.target.value })}
            className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional description" />
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100 space-y-1">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Canvas info</p>
        <p className="text-xs text-slate-500">{rfNodes.length} nodes · {rfEdges.length} connections</p>
        <p className="text-[10px] text-slate-400">Click a node or connection to edit its properties.</p>
      </div>
    </div>
  )
}
