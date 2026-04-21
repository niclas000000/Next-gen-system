'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function TaskNode({ id, data, selected }: NodeProps<TaskNodeData>) {
  return (
    <div className={cn(
      'relative rounded-[2px] border-2 bg-white px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-blue-500' : 'border-blue-300'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[2px] bg-blue-50 shrink-0">
          <ClipboardList size={14} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{data?.name || 'Task'}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Task</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  )
}
