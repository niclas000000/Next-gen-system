'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { GitMerge } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParallelNodeData } from '@/types/workflow'

export function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
  const isSplit = data?.type === 'split'
  return (
    <div className={cn(
      'rounded-lg border-2 bg-white shadow-md px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-teal-500 shadow-teal-100 shadow-lg' : 'border-teal-300'
    )}>
      {!isSplit && <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3" />}
      {isSplit && (
        <>
          <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3" />
        </>
      )}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-teal-50 shrink-0">
          <GitMerge size={14} className="text-teal-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{data?.name || (isSplit ? 'Parallel Split' : 'Parallel Join')}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{isSplit ? 'Split' : 'Join'}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3" />
    </div>
  )
}
