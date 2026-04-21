'use client'

import { useState } from 'react'
import { WorkflowCanvas } from './WorkflowCanvas'
import { NodeProperties } from './PropertiesPanel/NodeProperties'
import { WorkflowProperties } from './PropertiesPanel/WorkflowProperties'
import { ConnectionProperties } from './PropertiesPanel/ConnectionProperties'
import { FormBuilder } from './FormBuilder/FormBuilder'
import { LogicBuilder } from './LogicBuilder/LogicBuilder'
import { WorkflowSettingsTab } from './WorkflowSettingsTab'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'forms', label: 'Form Builder' },
  { id: 'logic', label: 'Logic' },
  { id: 'settings', label: 'Settings' },
]

export function DesignerTabs() {
  const [activeTab, setActiveTab] = useState('canvas')
  const { selectedNodeId, selectedEdgeId } = useWorkflowDesignerStore()

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Tab strip */}
      <div className="flex shrink-0 px-3" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: activeTab === tab.id ? 'var(--nw-accent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--nw-accent)' : 'var(--ink-4)',
            }}
            onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--ink)' }}
            onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--ink-4)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {activeTab === 'canvas' && (
          <>
            <WorkflowCanvas />
            <div className="w-72 overflow-y-auto shrink-0" style={{ borderLeft: '1px solid var(--rule)', background: 'var(--surface)' }}>
              {selectedNodeId ? (
                <NodeProperties nodeId={selectedNodeId} />
              ) : selectedEdgeId ? (
                <ConnectionProperties edgeId={selectedEdgeId} />
              ) : (
                <WorkflowProperties />
              )}
            </div>
          </>
        )}

        {activeTab === 'forms' && <FormBuilder />}

        {activeTab === 'logic' && <LogicBuilder />}

        {activeTab === 'settings' && <WorkflowSettingsTab />}
      </div>
    </div>
  )
}
