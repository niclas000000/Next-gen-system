export interface AST {
  type: string
  children?: AST[]
  value?: unknown
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface Completion {
  label: string
  kind: 'variable' | 'function' | 'constant'
  documentation?: string
  insertText: string
}

export interface ExpressionContext {
  fields: Record<string, unknown>
  variables: Record<string, unknown>
  user: {
    id: string
    name: string
    email: string
    roles: string[]
    groups: string[]
  }
  workflow: {
    id: string
    instanceId: string
    currentStep: string
  }
}
