'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DelayNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function DelayNode({ id, data, selected }: NodeProps<DelayNodeData>) {
  return (
    <div className={cn(
      'relative rounded-[2px] border-2 bg-white px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-amber-500' : 'border-amber-300'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(245,158,11,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[2px] bg-amber-50 shrink-0">
          <Clock size={14} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{data?.name || 'Delay'}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>
            {data?.duration ? `${data.duration} ${data.unit}` : 'Delay'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  )
}
