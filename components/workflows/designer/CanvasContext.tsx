'use client'

import { createContext, useContext } from 'react'
import type { Node, Edge, OnNodesChange, OnEdgesChange } from 'reactflow'

interface CanvasContextValue {
  rfNodes: Node[]
  rfEdges: Edge[]
  setRfNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setRfEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
}

export const CanvasContext = createContext<CanvasContextValue | null>(null)

export function useCanvas() {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('useCanvas must be used inside CanvasContext.Provider')
  return ctx
}
