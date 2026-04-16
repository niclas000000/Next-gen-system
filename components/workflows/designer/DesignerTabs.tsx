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
      <div className="flex border-b border-slate-200 bg-white shrink-0 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
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
            <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto shrink-0">
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
