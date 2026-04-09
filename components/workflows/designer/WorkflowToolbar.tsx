'use client'

import { useCallback } from 'react'
import { useReactFlow } from 'reactflow'
import {
  Play, ClipboardList, GitBranch, Zap, Bell, Layers, Clock, GitMerge, Square,
  Save, Rocket, ZoomIn, ZoomOut, Maximize2, ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { useCanvas } from './CanvasContext'
import { makeDefaultNodeData } from '@/lib/workflow-defaults'
import type { NodeType } from '@/types/workflow'

const nodepalette: { type: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'start',          label: 'Start',          icon: <Play size={13} className="fill-green-500 text-green-500" />,  color: 'border-green-300 hover:border-green-500 hover:bg-green-50' },
  { type: 'task',           label: 'Task',           icon: <ClipboardList size={13} className="text-blue-500" />,         color: 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' },
  { type: 'decision',       label: 'Decision',       icon: <GitBranch size={13} className="text-orange-500" />,           color: 'border-orange-300 hover:border-orange-500 hover:bg-orange-50' },
  { type: 'automation',     label: 'Automation',     icon: <Zap size={13} className="text-purple-500" />,                 color: 'border-purple-300 hover:border-purple-500 hover:bg-purple-50' },
  { type: 'notification',   label: 'Notification',   icon: <Bell size={13} className="text-sky-500" />,                   color: 'border-sky-300 hover:border-sky-500 hover:bg-sky-50' },
  { type: 'subprocess',     label: 'Subprocess',     icon: <Layers size={13} className="text-indigo-500" />,              color: 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50' },
  { type: 'delay',          label: 'Delay',          icon: <Clock size={13} className="text-amber-500" />,                color: 'border-amber-300 hover:border-amber-500 hover:bg-amber-50' },
  { type: 'parallel-split', label: 'Parallel',       icon: <GitMerge size={13} className="text-teal-500" />,              color: 'border-teal-300 hover:border-teal-500 hover:bg-teal-50' },
  { type: 'end',            label: 'End',            icon: <Square size={12} className="fill-red-500 text-red-500" />,    color: 'border-red-300 hover:border-red-500 hover:bg-red-50' },
]

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  archived: 'bg-orange-100 text-orange-700 border-orange-200',
}

interface ToolbarProps {
  rfEdges: unknown[]
}

export function WorkflowToolbar({ rfEdges }: ToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const {
    workflowName,
    workflowStatus,
    isDirty,
    isSaving,
    lastSavedAt,
    save,
    publish,
    updateWorkflowMeta,
  } = useWorkflowDesignerStore()

  const { setRfNodes, rfNodes } = useCanvas()
  const { markDirty } = useWorkflowDesignerStore()

  const onDragStart = useCallback((e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/nexus-node-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const onClickAdd = useCallback((type: NodeType) => {
    // Place new node offset from the last node, or at a default position
    const last = rfNodes[rfNodes.length - 1]
    const position = last
      ? { x: (last as { position: { x: number; y: number } }).position.x + 220, y: (last as { position: { x: number; y: number } }).position.y }
      : { x: 250, y: 250 }
    const id = `${type}-${Date.now()}`
    setRfNodes((nds) => [...nds, { id, type, position, data: makeDefaultNodeData(type) }])
    markDirty()
  }, [rfNodes, setRfNodes, markDirty])

  const saveLabel = isSaving ? 'Saving…' : isDirty ? 'Unsaved' : lastSavedAt ? 'Saved' : 'Save'

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center gap-2 px-3 h-12 border-b border-slate-200 bg-white shrink-0 overflow-x-auto">

        {/* Back button */}
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-slate-500" asChild>
          <Link href="/workflows/design">
            <ChevronLeft size={16} />
          </Link>
        </Button>

        {/* Workflow name */}
        <input
          value={workflowName}
          onChange={(e) => updateWorkflowMeta({ name: e.target.value })}
          className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 w-40 shrink-0"
          placeholder="Workflow name"
        />

        {/* Status badge */}
        <Badge variant="outline" className={`text-xs shrink-0 ${statusColors[workflowStatus] ?? ''}`}>
          {workflowStatus}
        </Badge>

        <Separator orientation="vertical" className="h-6 shrink-0" />

        {/* Node palette */}
        <div className="flex items-center gap-1">
          {nodepalette.map((item) => (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type)}
                  onClick={() => onClickAdd(item.type)}
                  className={`flex items-center gap-1 px-2 py-1 rounded border bg-white text-xs text-slate-600 cursor-pointer select-none transition-colors shrink-0 ${item.color}`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Click or drag to add {item.label} node
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 shrink-0" />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
                <ZoomIn size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Zoom in</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
                <ZoomOut size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Zoom out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fitView({ padding: 0.3 })}>
                <Maximize2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Fit view</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 shrink-0" />

        {/* Save */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={() => save(rfNodes, rfEdges)}
          disabled={isSaving || !isDirty}
        >
          <Save size={13} />
          {saveLabel}
        </Button>

        {/* Publish */}
        {workflowStatus !== 'published' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
                <Rocket size={13} />
                Publish
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish workflow</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-600">
                Publishing will save all changes and make this workflow available for new cases.
                The version number will be incremented.
              </p>
              <DialogFooter>
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => publish(rfNodes, rfEdges)}>
                  Publish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}
