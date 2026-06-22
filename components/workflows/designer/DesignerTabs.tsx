'use client'

import { useState } from 'react'
import { WorkflowCanvas } from './WorkflowCanvas'
import { NodeProperties } from './PropertiesPanel/NodeProperties'
import { WorkflowProperties } from './PropertiesPanel/WorkflowProperties'
import { ConnectionProperties } from './PropertiesPanel/ConnectionProperties'
import { FormBuilder } from './FormBuilder/FormBuilder'
import { LogicBuilder } from './LogicBuilder/LogicBuilder'
import { ActionBuilder } from './LogicBuilder/ActionBuilder'
import { RuleBuilder } from './LogicBuilder/RuleBuilder'
import { WorkflowSettingsTab } from './WorkflowSettingsTab'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'

const tabs = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'forms', label: 'Form Builder' },
  { id: 'logic', label: 'Logic' },
  { id: 'settings', label: 'Settings' },
]

const logicSubTabs = [
  { id: 'branching', label: 'Branching' },
  { id: 'automation', label: 'Automation' },
  { id: 'rules', label: 'Rules' },
]

export function DesignerTabs() {
  const [activeTab, setActiveTab] = useState('canvas')
  const [activeLogicTab, setActiveLogicTab] = useState('branching')
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

        {activeTab === 'logic' && (
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Logic sub-tab strip */}
            <div className="flex shrink-0 px-3" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
              {logicSubTabs.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveLogicTab(sub.id)}
                  className="px-3 py-2 text-xs font-medium border-b-2 transition-colors"
                  style={{
                    borderBottomColor: activeLogicTab === sub.id ? 'var(--nw-accent)' : 'transparent',
                    color: activeLogicTab === sub.id ? 'var(--nw-accent)' : 'var(--ink-4)',
                  }}
                  onMouseEnter={(e) => { if (activeLogicTab !== sub.id) e.currentTarget.style.color = 'var(--ink)' }}
                  onMouseLeave={(e) => { if (activeLogicTab !== sub.id) e.currentTarget.style.color = 'var(--ink-4)' }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            <div className="flex flex-1 overflow-hidden min-h-0">
              {activeLogicTab === 'branching' && <LogicBuilder />}
              {activeLogicTab === 'automation' && <ActionBuilder />}
              {activeLogicTab === 'rules' && <RuleBuilder />}
            </div>
          </div>
        )}

        {activeTab === 'settings' && <WorkflowSettingsTab />}
      </div>
    </div>
  )
}
