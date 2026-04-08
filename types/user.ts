export type UserRole = 'admin' | 'manager' | 'user'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  groups: string[]
  active: boolean
  createdAt: Date
}

export interface Group {
  id: string
  name: string
  description?: string
  members: string[]
}

export interface Permission {
  resource: string
  actions: ('read' | 'write' | 'delete' | 'admin')[]
}
