'use client'

import { useCallback } from 'react'
import { X } from 'lucide-react'
import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'

export function NodeDeleteButton({ id }: { id: string }) {
  const { setRfNodes, setRfEdges } = useCanvas()
  const { clearSelection, markDirty } = useWorkflowDesignerStore()

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setRfNodes((nds) => nds.filter((n) => n.id !== id))
    setRfEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    clearSelection()
    markDirty()
  }, [id, setRfNodes, setRfEdges, clearSelection, markDirty])

  return (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onDelete}
      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm z-10 transition-colors"
    >
      <X size={10} strokeWidth={3} />
    </button>
  )
}
