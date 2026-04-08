'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StartNodeData } from '@/types/workflow'

export function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  return (
    <div className={cn(
      'rounded-full border-2 bg-white shadow-md px-5 py-3 min-w-[130px] flex items-center gap-2',
      selected ? 'border-green-500 shadow-green-100 shadow-lg' : 'border-green-400'
    )}>
      <div className="p-1.5 rounded-full bg-green-50 shrink-0">
        <Play size={13} className="text-green-500 fill-green-500" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-700 leading-tight">{data?.name || 'Start'}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Start</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  )
}
