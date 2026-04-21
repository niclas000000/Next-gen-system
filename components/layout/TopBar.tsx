'use client'

import { Search, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  documents: 'Documents',
  processes: 'Processes',
  cases: 'Cases',
  workflows: 'Workflows',
  design: 'Design',
  instances: 'Cases',
  forms: 'Forms',
  'document-types': 'Document Types',
  'approval-flows': 'Approval Flows',
  'lookup-tables': 'Lookup Tables',
  admin: 'Admin',
  users: 'Users',
  settings: 'Settings',
  register: 'Labels',
  system: 'System',
  appearance: 'Appearance',
  groups: 'Groups',
}

function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return (
      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
        Dashboard
      </span>
    )
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isId = !routeLabels[seg] && seg.length > 20
        const label = isId ? '…' : (routeLabels[seg] ?? seg)
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={12} style={{ color: 'var(--ink-4)' }} />
            )}
            <span
              style={{
                color: isLast ? 'var(--ink)' : 'var(--ink-4)',
                fontWeight: isLast ? '500' : '400',
                fontFamily: isId ? 'var(--font-mono)' : undefined,
              }}
            >
              {label}
            </span>
          </span>
        )
      })}
    </nav>
  )
}

export function TopBar() {
  return (
    <header
      className="h-14 flex items-center gap-4 px-5 shrink-0"
      style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex-1 min-w-0">
        <Breadcrumb />
      </div>

      {/* Search hint */}
      <button
        className="hidden md:flex items-center gap-2 px-3 h-8 rounded text-sm transition-colors"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          color: 'var(--ink-4)',
          minWidth: '200px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink-4)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
      >
        <Search size={13} />
        <span className="flex-1 text-left text-sm">Search…</span>
        <kbd
          className="text-[10px] px-1 rounded"
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'var(--paper-3)',
            color: 'var(--ink-4)',
          }}
        >
          Ctrl+K
        </kbd>
      </button>
    </header>
  )
}
