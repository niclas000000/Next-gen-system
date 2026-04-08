'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationNodeData } from '@/types/workflow'

export function AutomationNode({ data, selected }: NodeProps<AutomationNodeData>) {
  return (
    <div className={cn(
      'rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-purple-500 shadow-purple-100 shadow-lg' : 'border-purple-300'
    )}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-purple-50 shrink-0">
          <Zap size={14} className="text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{data?.name || 'Automation'}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Automation</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}
