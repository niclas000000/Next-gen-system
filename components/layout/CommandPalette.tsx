'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, CornerDownLeft, FilePlus2, FileText, FolderPlus, Layers, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { readRecent } from '@/lib/recent'
import { useShell } from './AppShell'
import { ADMIN_LINKS, CONFIG_MODULES, DESIGN_LINKS, WORK_MODULES } from './nav'

interface Item {
  id: string
  label: string
  sub?: string
  group: string
  icon: React.ReactNode
  run: () => void
  keywords?: string
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { isAdmin, openNewCase } = useShell()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [remote, setRemote] = useState<Item[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const go = (href: string) => () => router.push(href)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  // Cases and documents from the server
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return setRemote([])
    const ctrl = new AbortController()
    Promise.all([
      fetch(`/api/cases?status=all&pageSize=6&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { cases: [] }))
        .then((d: { cases: { number: string; title: string; phaseName: string; status: string }[] }) =>
          d.cases.map<Item>((c) => ({
            id: `case-${c.number}`,
            label: `${c.number} · ${c.title}`,
            sub: c.status === 'open' ? c.phaseName : 'Closed',
            group: 'Cases',
            icon: <Layers size={15} />,
            run: go(`/cases/${c.number}`),
          }))
        ),
      fetch(`/api/documents?q=${encodeURIComponent(q)}&limit=5`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { documents: [] }))
        .then((d: { documents: { id: string; title: string; documentType?: { prefix: string } | null }[] }) =>
          (d.documents ?? []).slice(0, 5).map<Item>((doc) => ({
            id: `doc-${doc.id}`,
            label: doc.title,
            sub: doc.documentType?.prefix,
            group: 'Documents',
            icon: <FileText size={15} />,
            run: go(`/documents/${doc.id}`),
          }))
        ),
    ])
      .then(([cases, docs]) => setRemote([...cases, ...docs]))
      .catch(() => {})
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const items = useMemo(() => {
    const actions: Item[] = [
      { id: 'new-case', label: 'New case', group: 'Actions', icon: <FolderPlus size={15} />, run: openNewCase, keywords: 'create register deviation' },
      { id: 'new-doc', label: 'New document', group: 'Actions', icon: <FilePlus2 size={15} />, run: go('/documents?new=1'), keywords: 'create' },
    ]
    const nav: Item[] = [
      ...WORK_MODULES.map((m) => ({ id: `nav-${m.id}`, label: m.label, group: 'Go to', icon: <m.icon size={15} />, run: go(m.href), keywords: m.id === 'work' ? 'tasks inbox' : '' })),
      ...(isAdmin
        ? [...DESIGN_LINKS.map((l) => ({ ...l, label: `Design: ${l.label}` })), ...ADMIN_LINKS.map((l) => ({ ...l, label: `Admin: ${l.label}` }))].map((l) => ({
            id: `nav-${l.href}`,
            label: l.label,
            group: 'Go to',
            icon: <l.icon size={15} />,
            run: go(l.href),
          }))
        : []),
    ]
    const recent: Item[] = readRecent().map((r) => ({
      id: `recent-${r.href}`,
      label: r.label,
      sub: r.sub,
      group: 'Recent',
      icon: <Clock size={15} />,
      run: go(r.href),
    }))
    const q = query.trim().toLowerCase()
    if (!q) return [...recent, ...actions, ...nav.slice(0, WORK_MODULES.length + (isAdmin ? CONFIG_MODULES.length : 0))]
    const match = (i: Item) => `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q)
    return [...remote, ...actions.filter(match), ...nav.filter(match), ...recent.filter(match)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, remote, isAdmin, open])

  useEffect(() => setActive(0), [query, remote.length])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const run = (i: Item) => {
    onClose()
    i.run()
  }

  const groups = items.reduce<Record<string, { item: Item; index: number }[]>>((acc, item, index) => {
    ;(acc[item.group] ??= []).push({ item, index })
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        className="w-full max-w-xl overflow-hidden rounded-[2px] border border-rule bg-surface shadow-[0_24px_64px_-24px_rgba(0,0,0,0.4)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-rule px-4">
          <Search size={16} className="text-ink-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && items[active]) run(items[active])
            }}
            placeholder="Search cases by number or title, documents, pages…"
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `palette-${active}` : undefined}
          />
          <kbd className="rounded-[2px] bg-paper-3 px-1.5 font-mono text-[10px] text-ink-4">Esc</kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {Object.entries(groups).map(([group, entries]) => (
            <div key={group} className="pb-1">
              <p className="mono-meta px-2.5 pb-1 pt-2 text-[10px]">{group}</p>
              {entries.map(({ item, index }) => (
                <button
                  key={item.id}
                  id={`palette-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[2px] px-2.5 py-2 text-left text-sm',
                    index === active ? 'bg-accent-tint text-ink' : 'text-ink-3'
                  )}
                >
                  <span className={index === active ? 'text-nw-accent' : 'text-ink-4'}>{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.sub && <span className="text-xs text-ink-4">{item.sub}</span>}
                  {index === active && <ArrowRight size={13} className="text-nw-accent" />}
                </button>
              ))}
            </div>
          ))}
          {!items.length && <p className="px-3 py-6 text-center text-sm text-ink-4">Nothing found for “{query}”</p>}
        </div>
        <div className="flex items-center gap-4 border-t border-rule px-4 py-2 text-[11px] text-ink-4">
          <span className="inline-flex items-center gap-1"><CornerDownLeft size={11} /> open</span>
          <span>↑↓ move</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  )
}
