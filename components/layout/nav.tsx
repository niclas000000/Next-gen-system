import {
  Archive, Bell, Bookmark, CheckCircle, Clock, FileInput, FileText, FileType, FileX, Filter, GitBranch, Home, Inbox,
  Layers, LayoutList, Library, List, PenTool, Settings, Shield, Star, Table2, Tag, User, Users, Database, Palette,
  Server, AlertCircle, Search, ClipboardList, BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Icons that system views can pick (SystemView.icon). */
export const VIEW_ICONS: Record<string, LucideIcon> = {
  List, Clock, CheckCircle, User, GitBranch, FileText, Archive, FileInput, Library, Star, Bookmark, FileX, Layers,
  Filter, Shield, Bell, Tag, Search, AlertCircle, LayoutList,
}

export type ModuleId = 'home' | 'work' | 'cases' | 'documents' | 'processes' | 'reports' | 'design' | 'admin'

export interface ModuleDef {
  id: ModuleId
  label: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

export const WORK_MODULES: ModuleDef[] = [
  { id: 'home', label: 'Home', href: '/', icon: Home },
  { id: 'work', label: 'My work', href: '/tasks', icon: Inbox },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Layers },
  { id: 'documents', label: 'Documents', href: '/documents', icon: FileText },
  { id: 'processes', label: 'Processes', href: '/processes', icon: GitBranch },
  { id: 'reports', label: 'Reports', href: '/reports', icon: BarChart3 },
]

export const CONFIG_MODULES: ModuleDef[] = [
  { id: 'design', label: 'Design', href: '/design/case-types', icon: PenTool, adminOnly: true },
  { id: 'admin', label: 'Admin', href: '/admin/users', icon: Settings, adminOnly: true },
]

export interface NavLink {
  label: string
  href: string
  icon: LucideIcon
}

export const DESIGN_LINKS: NavLink[] = [
  { label: 'Case types', href: '/design/case-types', icon: ClipboardList },
  { label: 'Document types', href: '/design/document-types', icon: FileType },
  { label: 'Approval flows', href: '/design/approval-flows', icon: CheckCircle },
  { label: 'Views', href: '/design/views', icon: LayoutList },
]

export const ADMIN_LINKS: NavLink[] = [
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Groups', href: '/admin/settings', icon: Users },
  { label: 'Roles', href: '/admin/roles', icon: Shield },
  { label: 'Labels', href: '/admin/register', icon: Database },
  { label: 'Lookup tables', href: '/admin/lookup-tables', icon: Table2 },
  { label: 'Appearance', href: '/admin/appearance', icon: Palette },
  { label: 'System', href: '/admin/system', icon: Server },
]

export function moduleFor(pathname: string): ModuleId {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/tasks')) return 'work'
  if (pathname.startsWith('/cases')) return 'cases'
  if (pathname.startsWith('/documents')) return 'documents'
  if (pathname.startsWith('/processes') || pathname.startsWith('/design/processes')) return 'processes'
  if (pathname.startsWith('/reports')) return 'reports'
  if (pathname.startsWith('/design')) return 'design'
  if (pathname.startsWith('/admin')) return 'admin'
  return 'home'
}

/** A link is active when the path matches and every query param in the link matches the URL. */
export function linkActive(href: string, pathname: string, search: URLSearchParams): boolean {
  const url = new URL(href, 'http://x')
  if (url.pathname === '/') return pathname === '/'
  if (pathname !== url.pathname && !pathname.startsWith(`${url.pathname}/`)) return false
  if (pathname !== url.pathname) return url.searchParams.size === 0
  for (const [k, v] of url.searchParams.entries()) if (search.get(k) !== v) return false
  // A link without params is only active when no other filter is applied
  if (url.searchParams.size === 0) return [...search.keys()].every((k) => k === 'page' || k === 'q')
  return [...search.keys()].every((k) => url.searchParams.has(k) || k === 'page' || k === 'q')
}
