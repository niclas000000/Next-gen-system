'use client'

import { useCallback } from 'react'
import { useReactFlow, type Node } from 'reactflow'
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

export const nodepalette: { type: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
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

const statusVariant: Record<string, 'default' | 'ok' | 'warn'> = {
  draft: 'default', published: 'ok', archived: 'warn',
}

export function WorkflowToolbar() {
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow()
  const {
    workflowName,
    workflowStatus,
    isDirty,
    isSaving,
    lastSavedAt,
    save,
    publish,
    updateWorkflowMeta,
    markDirty,
  } = useWorkflowDesignerStore()

  const { setRfNodes, rfNodes, rfEdges } = useCanvas()

  const onClickAdd = useCallback((type: NodeType) => {
    const { selectedNodeId, setSelectedNode } = useWorkflowDesignerStore.getState()
    const selectedNode = rfNodes.find((n) => n.id === selectedNodeId) as Node | undefined
    let position: { x: number; y: number }
    if (selectedNode) {
      position = { x: selectedNode.position.x + 200, y: selectedNode.position.y + 60 }
    } else if (rfNodes.length === 0) {
      const { x: vx, y: vy, zoom } = getViewport()
      position = { x: (-vx + window.innerWidth / 2) / zoom, y: (-vy + window.innerHeight / 2) / zoom }
    } else {
      const last = rfNodes[rfNodes.length - 1] as Node
      position = { x: last.position.x + 220, y: last.position.y }
    }
    const id = `${type}-${Date.now()}`
    setRfNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      { id, type, position, data: makeDefaultNodeData(type), selected: true },
    ])
    setSelectedNode(id)
    markDirty()
  }, [rfNodes, setRfNodes, markDirty, getViewport])

  const saveLabel = isSaving ? 'Saving…' : isDirty ? 'Unsaved' : lastSavedAt ? 'Saved' : 'Save'

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center gap-2 px-3 h-12 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>

        {/* Back button */}
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" asChild>
          <Link href="/workflows/design">
            <ChevronLeft size={16} />
          </Link>
        </Button>

        {/* Workflow name */}
        <input
          value={workflowName}
          onChange={(e) => updateWorkflowMeta({ name: e.target.value })}
          className="text-sm font-semibold bg-transparent border-none outline-none rounded-[2px] px-1 w-40 shrink-0"
          style={{ color: 'var(--ink)' }}
          placeholder="Workflow name"
        />

        {/* Status badge */}
        <Badge variant={statusVariant[workflowStatus] ?? 'default'} className="text-xs shrink-0">
          {workflowStatus}
        </Badge>

        <Separator orientation="vertical" className="h-6 shrink-0" />

        {/* Node palette */}
        <div className="flex items-center gap-1">
          {nodepalette.map((item) => (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => onClickAdd(item.type)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[2px] border bg-white text-xs cursor-pointer select-none transition-colors shrink-0 ${item.color}`}
            style={{ color: 'var(--ink-3)' }}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Click to add {item.label} node
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
              <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs">
                <Rocket size={13} />
                Publish
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish workflow</DialogTitle>
              </DialogHeader>
              <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                Publishing will save all changes and make this workflow available for new cases.
                The version number will be incremented.
              </p>
              <DialogFooter>
                <Button variant="outline" size="sm">Cancel</Button>
                <Button size="sm" onClick={() => publish(rfNodes, rfEdges)}>
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
