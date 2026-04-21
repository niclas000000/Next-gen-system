'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StartNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function StartNode({ id, data, selected }: NodeProps<StartNodeData>) {
  return (
    <div className={cn(
      'relative rounded-full border-2 bg-white px-5 py-3 min-w-[130px] flex items-center gap-2',
      selected ? 'border-green-500' : 'border-green-400'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(34,197,94,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <div className="p-1.5 rounded-full bg-green-50 shrink-0">
        <Play size={13} className="text-green-500 fill-green-500" />
      </div>
      <div>
        <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{data?.name || 'Start'}</p>
        <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Start</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  )
}
