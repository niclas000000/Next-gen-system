'use client'

import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { NodeType } from '@/types/workflow'

const nodeTypeLabels: Record<NodeType, string> = {
  start: 'Start', task: 'Task', decision: 'Decision', automation: 'Automation',
  notification: 'Notification', subprocess: 'Subprocess', delay: 'Delay',
  'parallel-split': 'Parallel Split', 'parallel-join': 'Parallel Join', end: 'End',
}

interface Props { nodeId: string }

export function NodeProperties({ nodeId }: Props) {
  const { rfNodes, setRfNodes } = useCanvas()
  const { clearSelection, markDirty } = useWorkflowDesignerStore()

  const node = rfNodes.find((n) => n.id === nodeId)
  if (!node) return null

  const data = node.data as Record<string, unknown>
  const type = node.type as NodeType

  const update = (field: string, value: unknown) => {
    setRfNodes((nds) => nds.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n
    ))
    markDirty()
  }

  const deleteNode = () => {
    setRfNodes((nds) => nds.filter((n) => n.id !== nodeId))
    markDirty()
    clearSelection()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-800">{nodeTypeLabels[type] ?? type} Properties</p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-[160px]">{nodeId}</p>
        </div>
        {type !== 'start' && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={deleteNode}>
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={(data.name as string) ?? ''} onChange={(e) => update('name', e.target.value)} className="h-8 text-sm" placeholder="Node name" />
        </div>

        {type === 'task' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <textarea value={(data.description as string) ?? ''} onChange={(e) => update('description', e.target.value)}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional description" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assignment</Label>
              <select value={((data.assignment as Record<string, unknown>)?.type as string) ?? 'initiator'}
                onChange={(e) => update('assignment', { ...(data.assignment as object), type: e.target.value })}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="initiator">Initiator</option>
                <option value="user">Specific user</option>
                <option value="role">Role</option>
                <option value="expression">Expression</option>
              </select>
            </div>
          </>
        )}

        {type === 'start' && (
          <div className="space-y-1">
            <Label className="text-xs">Trigger</Label>
            <select value={(data.trigger as string) ?? 'manual'} onChange={(e) => update('trigger', e.target.value)}
              className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="api">API</option>
              <option value="event">Event</option>
            </select>
          </div>
        )}

        {type === 'end' && (
          <div className="space-y-1">
            <Label className="text-xs">Completion Status</Label>
            <select value={(data.completionStatus as string) ?? 'completed'} onChange={(e) => update('completionStatus', e.target.value)}
              className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {type === 'delay' && (
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Duration</Label>
              <Input type="number" min={1} value={(data.duration as number) ?? 1}
                onChange={(e) => update('duration', parseInt(e.target.value, 10))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Unit</Label>
              <select value={(data.unit as string) ?? 'hours'} onChange={(e) => update('unit', e.target.value)}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}

        {type === 'automation' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select value={(data.type as string) ?? 'calculation'} onChange={(e) => update('type', e.target.value)}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="calculation">Calculation</option>
                <option value="webhook">Webhook</option>
                <option value="email">Email</option>
                <option value="database">Database</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">On Error</Label>
              <select value={(data.errorHandling as string) ?? 'fail'} onChange={(e) => update('errorHandling', e.target.value)}
                className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 h-8 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="fail">Fail</option>
                <option value="skip">Skip</option>
                <option value="retry">Retry</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
