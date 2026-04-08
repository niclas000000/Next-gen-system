'use client'

import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Props {
  edgeId: string
}

export function ConnectionProperties({ edgeId }: Props) {
  const { edges, updateEdge, setEdges, clearSelection } = useWorkflowDesignerStore()
  const edge = edges.find((e) => e.id === edgeId)
  if (!edge) return null

  const deleteEdge = () => {
    setEdges(edges.filter((e) => e.id !== edgeId))
    clearSelection()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-800">Connection Properties</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-red-500"
          onClick={deleteEdge}
          title="Delete connection"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={edge.label ?? ''}
            onChange={(e) => updateEdge(edgeId, { label: e.target.value || undefined })}
            className="h-8 text-sm"
            placeholder="e.g. Yes, Approved"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Condition expression</Label>
          <Input
            value={edge.condition ?? ''}
            onChange={(e) => updateEdge(edgeId, { condition: e.target.value || undefined })}
            className="h-8 text-sm font-mono"
            placeholder="e.g. amount > 1000"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-1">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Connection info</p>
        <p className="text-[10px] text-slate-400 font-mono">{edge.source} → {edge.target}</p>
      </div>
    </div>
  )
}
