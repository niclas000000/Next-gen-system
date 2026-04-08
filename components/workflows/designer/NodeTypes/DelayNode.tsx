'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DelayNodeData } from '@/types/workflow'

export function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  return (
    <div className={cn(
      'rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-amber-500 shadow-amber-100 shadow-lg' : 'border-amber-300'
    )}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-amber-50 shrink-0">
          <Clock size={14} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{data?.name || 'Delay'}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">
            {data?.duration ? `${data.duration} ${data.unit}` : 'Delay'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  )
}
