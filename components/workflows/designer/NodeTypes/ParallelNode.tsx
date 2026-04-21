'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { GitMerge } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParallelNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function ParallelNode({ id, data, selected }: NodeProps<ParallelNodeData>) {
  const isSplit = data?.type === 'split'
  return (
    <div className={cn(
      'relative rounded-[2px] border-2 bg-white px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-teal-500' : 'border-teal-300'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(20,184,166,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[2px] bg-teal-50 shrink-0">
          <GitMerge size={14} className="text-teal-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{data?.name || (isSplit ? 'Parallel Split' : 'Parallel Join')}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>{isSplit ? 'Split' : 'Join'}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3" />
    </div>
  )
}
