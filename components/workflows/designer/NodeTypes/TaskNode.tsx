'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskNodeData } from '@/types/workflow'

export function TaskNode({ data, selected }: NodeProps<TaskNodeData>) {
  return (
    <div className={cn(
      'rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-blue-500 shadow-blue-100 shadow-lg' : 'border-blue-300'
    )}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-blue-50 shrink-0">
          <ClipboardList size={14} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{data?.name || 'Task'}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Task</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  )
}
