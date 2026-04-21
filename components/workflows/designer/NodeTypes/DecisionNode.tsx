'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DecisionNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function DecisionNode({ id, data, selected }: NodeProps<DecisionNodeData>) {
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" style={{ top: 0 }} />

      <div className={cn(
        'w-28 h-28 rotate-45 border-2 bg-white',
        selected ? 'border-orange-500' : 'border-orange-400'
      )} style={{ boxShadow: selected ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none' }}>
        <div className="-rotate-45 h-full flex flex-col items-center justify-center gap-1">
          <GitBranch size={14} className="text-orange-500" />
          <p className="text-[11px] font-semibold text-center leading-tight max-w-[80px] truncate" style={{ color: 'var(--ink)' }}>
            {data?.name || 'Decision'}
          </p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Decision</p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-orange-500 !w-3 !h-3" style={{ bottom: 0 }} />
      <Handle type="source" position={Position.Right} id="no" className="!bg-orange-400 !w-3 !h-3" style={{ right: 0 }} />
    </div>
  )
}
