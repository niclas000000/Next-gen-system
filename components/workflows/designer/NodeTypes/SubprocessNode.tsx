'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubprocessNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function SubprocessNode({ id, data, selected }: NodeProps<SubprocessNodeData>) {
  return (
    <div className={cn(
      'relative rounded-[2px] border-2 bg-white px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-indigo-500' : 'border-indigo-300'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[2px] bg-indigo-50 shrink-0">
          <Layers size={14} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{data?.name || 'Subprocess'}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Subprocess</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 border-b-2 border-indigo-300 rounded-b-[2px]" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3" />
    </div>
  )
}
