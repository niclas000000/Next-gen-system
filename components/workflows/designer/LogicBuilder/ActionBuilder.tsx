'use client'

import { useState } from 'react'
import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { ActionConfigForm } from './ActionConfigForm'
import { Calculator, Bell, Mail, Zap } from 'lucide-react'
import type { AutomationConfig, AutomationNodeData } from '@/types/workflow'

const TYPE_ICON: Record<string, React.ReactNode> = {
  set_variable: <Calculator size={14} style={{ color: 'var(--nw-accent)' }} />,
  send_notification: <Bell size={14} style={{ color: 'var(--warn)' }} />,
  send_email: <Mail size={14} style={{ color: 'var(--ok)' }} />,
}

const TYPE_LABEL: Record<string, string> = {
  set_variable: 'Set variable',
  send_notification: 'Send notification',
  send_email: 'Send email',
}

const DEFAULT_CONFIG: AutomationConfig = { type: 'set_variable', variableName: '', expression: '' }

export function ActionBuilder() {
  const { rfNodes, setRfNodes } = useCanvas()
  const { markDirty } = useWorkflowDesignerStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const automationNodes = rfNodes.filter((n) => n.type === 'automation' || n.type === 'notification')

  const selectedNode = selectedNodeId ? rfNodes.find((n) => n.id === selectedNodeId) : null
  const nodeData = selectedNode ? (selectedNode.data as Record<string, unknown>) : null
  const config: AutomationConfig = (nodeData?.config as AutomationConfig) ?? DEFAULT_CONFIG

  const updateConfig = (newConfig: AutomationConfig) => {
    if (!selectedNodeId) return
    setRfNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...n.data, config: newConfig } }
          : n
      )
    )
    markDirty()
  }

  if (automationNodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="p-3 rounded-[2px]" style={{ background: 'var(--paper-2)' }}>
          <Zap size={22} style={{ color: 'var(--ink-4)' }} />
        </div>
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--ink-3)' }}>No automation nodes</p>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>
            Add an Automation node to the canvas to configure actions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left: automation node list */}
      <div className="w-52 shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--rule)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Automation Nodes</p>
        </div>
        <div className="p-2 space-y-0.5">
          {automationNodes.map((node) => {
            const name = (node.data as Record<string, unknown>)?.name as string || 'Automation'
            const cfg = (node.data as Record<string, unknown>)?.config as AutomationConfig | undefined
            const active = selectedNodeId === node.id
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className="w-full text-left px-3 py-2 rounded-[2px] text-sm transition-colors"
                style={{
                  background: active ? 'var(--accent-tint)' : 'transparent',
                  color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
                  borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="flex items-center gap-2">
                  {TYPE_ICON[cfg?.type ?? ''] ?? <Zap size={14} style={{ color: 'var(--ink-4)' }} />}
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>{TYPE_LABEL[cfg?.type ?? ''] ?? 'Not configured'}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: config form */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selectedNode ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--ink-4)' }}>
            Select an automation node to configure its action.
          </div>
        ) : (
          <div className="max-w-sm space-y-4">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                {(nodeData?.name as string) || 'Automation'} — Action
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                Executes automatically when the workflow reaches this node.
              </p>
            </div>
            <ActionConfigForm config={config} onChange={updateConfig} />
          </div>
        )}
      </div>
    </div>
  )
}
