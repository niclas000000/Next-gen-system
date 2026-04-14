'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function NotificationNode({ id, data, selected }: NodeProps<NotificationNodeData>) {
  return (
    <div className={cn(
      'relative rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-sky-500 shadow-sky-100 shadow-lg' : 'border-sky-300'
    )}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-sky-50 shrink-0">
          <Bell size={14} className="text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{data?.name || 'Notification'}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Notification</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3" />
    </div>
  )
}
