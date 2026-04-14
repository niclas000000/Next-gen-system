'use client'

import { createContext, useContext } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge, type OnNodesChange, type OnEdgesChange } from 'reactflow'

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
  if (!ctx) throw new Error('useCanvas must be used inside CanvasProvider')
  return ctx
}

// Owns useNodesState/useEdgesState in isolation — no Zustand, no other subscriptions.
// This ensures setRfNodes updates propagate cleanly without interference from store re-renders.
export function CanvasProvider({
  initialNodes,
  initialEdges,
  children,
}: {
  initialNodes: Node[]
  initialEdges: Edge[]
  children: React.ReactNode
}) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <CanvasContext.Provider value={{ rfNodes, rfEdges, setRfNodes, setRfEdges, onNodesChange, onEdgesChange }}>
      {children}
    </CanvasContext.Provider>
  )
}
