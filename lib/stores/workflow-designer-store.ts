'use client'

import { create } from 'zustand'
import type { NodeType, WorkflowNode, WorkflowEdge, WorkflowStatus, WorkflowSettings } from '@/types/workflow'
import { makeDefaultNodeData } from '@/lib/workflow-defaults'

interface WorkflowDesignerState {
  workflowId: string
  workflowName: string
  workflowDescription: string
  workflowStatus: WorkflowStatus
  workflowSettings: WorkflowSettings

  nodes: WorkflowNode[]
  edges: WorkflowEdge[]

  selectedNodeId: string | null
  selectedEdgeId: string | null

  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  saveError: string | null

  initialize: (def: {
    id: string
    name: string
    description?: string
    status: WorkflowStatus
    settings: WorkflowSettings
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
  }) => void

  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: WorkflowEdge[]) => void

  addNode: (type: NodeType, position: { x: number; y: number }) => void
  updateNodeData: (id: string, data: Partial<Record<string, unknown>>) => void

  addEdge: (edge: WorkflowEdge) => void
  updateEdge: (id: string, updates: Partial<WorkflowEdge>) => void

  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void
  clearSelection: () => void

  updateWorkflowMeta: (meta: Partial<{ name: string; description: string; settings: WorkflowSettings }>) => void

  markDirty: () => void
  save: (nodes?: unknown, edges?: unknown) => Promise<void>
  publish: (nodes?: unknown, edges?: unknown) => Promise<void>
}

let nodeCounter = 1

export const useWorkflowDesignerStore = create<WorkflowDesignerState>((set, get) => ({
  workflowId: '',
  workflowName: '',
  workflowDescription: '',
  workflowStatus: 'draft',
  workflowSettings: {} as WorkflowSettings,

  nodes: [],
  edges: [],

  selectedNodeId: null,
  selectedEdgeId: null,

  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  saveError: null,

  initialize: (def) => {
    set({
      workflowId: def.id,
      workflowName: def.name,
      workflowDescription: def.description ?? '',
      workflowStatus: def.status,
      workflowSettings: def.settings,
      nodes: def.nodes,
      edges: def.edges,
      isDirty: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      saveError: null,
    })
  },

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  addNode: (type, position) => {
    const id = `${type}-${Date.now()}-${nodeCounter++}`
    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data: makeDefaultNodeData(type) as unknown as WorkflowNode['data'],
    }
    set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }))
  },

  updateNodeData: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as WorkflowNode['data'] } : n
      ),
      isDirty: true,
    }))
  },

  addEdge: (edge) => {
    set((s) => ({ edges: [...s.edges, edge], isDirty: true }))
  },

  updateEdge: (id, updates) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      isDirty: true,
    }))
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  updateWorkflowMeta: (meta) => {
    set((s) => ({
      workflowName: meta.name ?? s.workflowName,
      workflowDescription: meta.description ?? s.workflowDescription,
      workflowSettings: meta.settings ?? s.workflowSettings,
      isDirty: true,
    }))
  },

  markDirty: () => set({ isDirty: true }),

  save: async (nodes?: unknown, edges?: unknown) => {
    const s = get()
    if (!s.workflowId) return
    set({ isSaving: true, saveError: null })
    try {
      const res = await fetch(`/api/workflows/${s.workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.workflowName,
          description: s.workflowDescription,
          nodes: nodes ?? s.nodes,
          edges: edges ?? s.edges,
          settings: s.workflowSettings,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      set({ isDirty: false, isSaving: false, lastSavedAt: new Date() })
    } catch (err) {
      set({ isSaving: false, saveError: err instanceof Error ? err.message : 'Save failed' })
    }
  },

  publish: async (nodes?: unknown, edges?: unknown) => {
    const s = get()
    if (!s.workflowId) return
    await get().save(nodes, edges)
    set({ isSaving: true })
    try {
      const res = await fetch(`/api/workflows/${s.workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      if (!res.ok) throw new Error('Publish failed')
      set({ workflowStatus: 'published', isSaving: false })
    } catch (err) {
      set({ isSaving: false, saveError: err instanceof Error ? err.message : 'Publish failed' })
    }
  },
}))
