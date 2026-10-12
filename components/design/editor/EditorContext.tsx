'use client'

import { createContext, useContext } from 'react'
import type { CaseTypeConfig } from '@/lib/case-config/schema'
import type { ValidationIssue } from '@/lib/case-config/validate'
import type { RoleBindings } from '@/lib/cases/engine'

export type EditorTab = 'basics' | 'phases' | 'fields' | 'matrix' | 'permissions' | 'rules' | 'try'

export interface EditorApi {
  config: CaseTypeConfig
  /** Immutable update: the mutator gets a copy to change */
  update: (mutate: (draft: CaseTypeConfig) => void) => void
  bindings: RoleBindings
  setBindings: (b: RoleBindings) => void
  issues: ValidationIssue[]
  groups: { id: string; name: string; members: string[] }[]
  users: { id: string; name: string; email: string }[]
  goTo: (tab: EditorTab, targetId?: string) => void
  focusId: string | null
}

export const EditorContext = createContext<EditorApi | null>(null)

export function useEditor(): EditorApi {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside the case type editor')
  return ctx
}
