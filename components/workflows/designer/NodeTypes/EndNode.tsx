'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EndNodeData } from '@/types/workflow'

export function EndNode({ data, selected }: NodeProps<EndNodeData>) {
  return (
    <div className={cn(
      'rounded-full border-2 bg-white shadow-md px-5 py-3 min-w-[130px] flex items-center gap-2',
      selected ? 'border-red-500 shadow-red-100 shadow-lg' : 'border-red-400'
    )}>
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3" />
      <div className="p-1.5 rounded-full bg-red-50 shrink-0">
        <Square size={12} className="text-red-500 fill-red-500" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-700 leading-tight">{data?.name || 'End'}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">End</p>
      </div>
    </div>
  )
}
