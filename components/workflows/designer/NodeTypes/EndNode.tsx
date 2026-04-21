'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EndNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function EndNode({ id, data, selected }: NodeProps<EndNodeData>) {
  return (
    <div className={cn(
      'relative rounded-full border-2 bg-white px-5 py-3 min-w-[130px] flex items-center gap-2',
      selected ? 'border-red-500' : 'border-red-400'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3" />
      <div className="p-1.5 rounded-full bg-red-50 shrink-0">
        <Square size={12} className="text-red-500 fill-red-500" />
      </div>
      <div>
        <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{data?.name || 'End'}</p>
        <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>End</p>
      </div>
    </div>
  )
}
