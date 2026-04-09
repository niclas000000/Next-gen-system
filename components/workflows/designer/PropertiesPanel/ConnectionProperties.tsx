'use client'

import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Props { edgeId: string }

export function ConnectionProperties({ edgeId }: Props) {
  const { rfEdges, setRfEdges } = useCanvas()
  const { clearSelection, markDirty } = useWorkflowDesignerStore()

  const edge = rfEdges.find((e) => e.id === edgeId)
  if (!edge) return null

  const updateEdge = (field: string, value: unknown) => {
    setRfEdges((eds) => eds.map((e) => e.id === edgeId ? { ...e, [field]: value || undefined } : e))
    markDirty()
  }

  const deleteEdge = () => {
    setRfEdges((eds) => eds.filter((e) => e.id !== edgeId))
    markDirty()
    clearSelection()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-800">Connection Properties</p>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={deleteEdge}>
          <Trash2 size={14} />
        </Button>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={(edge.label as string) ?? ''} onChange={(e) => updateEdge('label', e.target.value)}
            className="h-8 text-sm" placeholder="e.g. Yes, Approved" />
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-mono">{edge.source} → {edge.target}</p>
      </div>
    </div>
  )
}
