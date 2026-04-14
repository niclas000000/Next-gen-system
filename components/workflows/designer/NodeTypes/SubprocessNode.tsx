'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubprocessNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function SubprocessNode({ id, data, selected }: NodeProps<SubprocessNodeData>) {
  return (
    <div className={cn(
      'relative rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-indigo-500 shadow-indigo-100 shadow-lg' : 'border-indigo-300'
    )}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-indigo-50 shrink-0">
          <Layers size={14} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{data?.name || 'Subprocess'}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Subprocess</p>
        </div>
      </div>
      {/* Double bottom border to indicate subprocess */}
      <div className="absolute bottom-0 left-0 right-0 h-1 border-b-2 border-indigo-300 rounded-b-lg" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3" />
    </div>
  )
}
