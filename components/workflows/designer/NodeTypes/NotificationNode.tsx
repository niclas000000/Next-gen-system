'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function NotificationNode({ id, data, selected }: NodeProps<NotificationNodeData>) {
  return (
    <div className={cn(
      'relative rounded-[2px] border-2 bg-white px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-sky-500' : 'border-sky-300'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(14,165,233,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[2px] bg-sky-50 shrink-0">
          <Bell size={14} className="text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{data?.name || 'Notification'}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Notification</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3" />
    </div>
  )
}
