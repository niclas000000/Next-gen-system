'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationNodeData } from '@/types/workflow'
import { NodeDeleteButton } from './NodeDeleteButton'

export function AutomationNode({ id, data, selected }: NodeProps<AutomationNodeData>) {
  return (
    <div className={cn(
      'relative rounded-[2px] border-2 bg-white px-4 py-3 min-w-[160px] max-w-[220px]',
      selected ? 'border-purple-500' : 'border-purple-300'
    )} style={{ boxShadow: selected ? '0 0 0 3px rgba(168,85,247,0.15)' : 'none' }}>
      {selected && <NodeDeleteButton id={id} />}
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[2px] bg-purple-50 shrink-0">
          <Zap size={14} className="text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{data?.name || 'Automation'}</p>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Automation</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}
