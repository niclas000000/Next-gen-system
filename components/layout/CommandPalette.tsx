'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Layers, GitBranch, Workflow, Settings, ArrowRight } from 'lucide-react'

interface Result {
  id: string
  label: string
  sub?: string
  href: string
  icon: React.ReactNode
  group: string
}

const STATIC_RESULTS: Result[] = [
  { id: 'lib',       label: 'Document Library',    href: '/documents',                icon: <FileText size={15} />,  group: 'Navigation' },
  { id: 'drafts',    label: 'Drafts',               href: '/documents?status=draft',   icon: <FileText size={15} />,  group: 'Navigation' },
  { id: 'pending',   label: 'Pending Approval',     href: '/documents?status=pending', icon: <FileText size={15} />,  group: 'Navigation' },
  { id: 'cases',     label: 'All Cases',            href: '/cases',                    icon: <Layers size={15} />,    group: 'Navigation' },
  { id: 'processes', label: 'Processes',            href: '/processes',                icon: <GitBranch size={15} />, group: 'Navigation' },
  { id: 'workflows', label: 'Workflow Designer',    href: '/design/workflows',         icon: <Workflow size={15} />,  group: 'Navigation' },
  { id: 'users',     label: 'Users',                href: '/admin/users',              icon: <Settings size={15} />,  group: 'Admin' },
  { id: 'lookup',    label: 'Lookup Tables',        href: '/admin/lookup-tables',      icon: <Settings size={15} />,  group: 'Admin' },
  { id: 'appear',    label: 'Appearance',           href: '/admin/appearance',         icon: <Settings size={15} />,  group: 'Admin' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [docResults, setDocResults] = useState<Result[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Fetch document results when query changes
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setDocResults([]); return }
    const ctrl = new AbortController()
    fetch(`/api/documents?q=${encodeURIComponent(query)}&limit=5`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { documents: { id: string; title: string; status: string; documentType?: { prefix: string } }[] }) => {
        setDocResults((d.documents ?? []).map((doc) => ({
          id: doc.id,
          label: doc.title,
          sub: doc.documentType?.prefix,
          href: `/documents/${doc.id}`,
          icon: <FileText size={15} />,
          group: 'Documents',
        })))
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [query])

  const filtered = query.trim()
    ? [
        ...docResults,
        ...STATIC_RESULTS.filter(
          (r) =>
            r.label.toLowerCase().includes(query.toLowerCase()) ||
            r.group.toLowerCase().includes(query.toLowerCase())
        ),
      ]
    : STATIC_RESULTS

  const grouped = filtered.reduce<Record<string, Result[]>>((acc, r) => {
    acc[r.group] = [...(acc[r.group] ?? []), r]
    return acc
  }, {})

  const flat = Object.values(grouped).flat()

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setDocResults([])
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const navigate = useCallback((href: string) => {
    onClose()
    router.push(href)
  }, [onClose, router])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); if (flat[active]) navigate(flat[active].href) }
      if (e.key === 'Escape')    { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, flat, active, navigate, onClose])

  if (!open) return null

  let idx = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(17,17,17,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-[2px] overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          boxShadow: '0 20px 60px rgba(17,17,17,0.18)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--rule)' }}>
          <Search size={16} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to anything…"
            className="flex-1 outline-none bg-transparent text-sm"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-inter)' }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded-[2px]"
            style={{ fontFamily: 'var(--font-mono)', background: 'var(--paper-3)', color: 'var(--ink-4)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {flat.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--ink-4)' }}>No results for &ldquo;{query}&rdquo;</p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1.5">
                  <span className="mono-meta text-[10px]">{group}</span>
                </div>
                {items.map((item) => {
                  idx++
                  const i = idx
                  const isActive = active === i
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                      style={{
                        background: isActive ? 'var(--accent-tint)' : '',
                        color: isActive ? 'var(--nw-accent)' : 'var(--ink-3)',
                      }}
                    >
                      <span style={{ color: isActive ? 'var(--nw-accent)' : 'var(--ink-4)', flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-sm" style={{ color: isActive ? 'var(--nw-accent)' : 'var(--ink)' }}>
                        {item.sub && (
                          <span className="mr-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-4)' }}>
                            {item.sub}
                          </span>
                        )}
                        {item.label}
                      </span>
                      {isActive && <ArrowRight size={13} style={{ color: 'var(--nw-accent)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-3 px-4 py-2 text-[11px]"
          style={{ borderTop: '1px solid var(--rule)', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Ctrl+K toggle</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  )
}
