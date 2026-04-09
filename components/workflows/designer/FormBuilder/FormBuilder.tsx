'use client'

import { useEffect, useState } from 'react'
import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { useCanvas } from '../CanvasContext'
import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { FieldPalette } from './FieldPalette'
import { FieldList } from './FieldList'
import { FieldProperties } from './FieldProperties'
import { FormPreview } from './FormPreview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Save, Eye, EyeOff } from 'lucide-react'

export function FormBuilder() {
  const { rfNodes } = useCanvas()
  const { selectedNodeId } = useWorkflowDesignerStore()
  const { loadForm, fields, isDirty } = useFormBuilderStore()
  const store = useFormBuilderStore()
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const { workflowId: wfId } = useWorkflowDesignerStore()

  const taskNodes = rfNodes.filter((n) => n.type === 'task')
  const activeNodeId = selectedNodeId && rfNodes.find((n) => n.id === selectedNodeId && n.type === 'task')
    ? selectedNodeId
    : taskNodes[0]?.id ?? null
  const activeNode = rfNodes.find((n) => n.id === activeNodeId)

  useEffect(() => {
    if (!activeNodeId) return
    const nodeData = activeNode?.data as Record<string, unknown> | undefined
    const savedFields = (nodeData?.formFields as typeof fields) ?? []
    loadForm(activeNodeId, savedFields)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId])

  const save = async () => {
    if (!activeNodeId || !wfId) return
    setSaving(true)
    try {
      await fetch(`/api/workflows/${wfId}/forms/${activeNodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: store.fields, settings: store.settings }),
      })
      useFormBuilderStore.setState({ isDirty: false })
    } finally {
      setSaving(false)
    }
  }

  if (taskNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <p className="text-slate-500 text-sm font-medium">No Task nodes yet</p>
          <p className="text-slate-400 text-xs mt-1">Add a Task node to the canvas to build its form.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left: node selector + field palette */}
      <div className="w-52 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-slate-200">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Task node</p>
          <div className="space-y-1">
            {taskNodes.map((n) => {
              const d = n.data as Record<string, unknown>
              return (
                <button
                  key={n.id}
                  onClick={() => useWorkflowDesignerStore.setState({ selectedNodeId: n.id })}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                    n.id === activeNodeId ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {(d.name as string) || 'Task'}
                </button>
              )
            })}
          </div>
        </div>
        <FieldPalette />
      </div>

      {/* Center: field list or preview */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
          <p className="text-sm font-semibold text-slate-800 flex-1">
            {(activeNode?.data as Record<string, unknown>)?.name as string || 'Task'} — Form
          </p>
          <Badge variant="outline" className="text-xs text-slate-500">
            {fields.length} field{fields.length !== 1 ? 's' : ''}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={save} disabled={!isDirty || saving}>
            <Save size={12} />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {showPreview ? <FormPreview /> : <FieldList />}
        </div>
      </div>

      {/* Right: field properties */}
      <div className="w-64 border-l border-slate-200 bg-white overflow-y-auto shrink-0">
        <FieldProperties />
      </div>
    </div>
  )
}
