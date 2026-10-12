'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Layers, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatDate } from './format'

export interface SubcaseItem {
  id: string
  number: string
  title: string
  status: string
  phaseName: string
  phaseDueAt: string | Date | null
}

export interface SubcaseInfo {
  items: SubcaseItem[]
  /** The case type the field creates */
  typeName: string
  target: { id: string; name: string; prefix: string } | null
  canCreate: boolean
  mustBeClosed: boolean
  onCreate: (title: string) => Promise<boolean>
}

const STATUS: Record<string, { label: string; variant: 'warn' | 'ok' | 'default' }> = {
  open: { label: 'Open', variant: 'warn' },
  closed: { label: 'Closed', variant: 'ok' },
  preClosed: { label: 'Closed early', variant: 'ok' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

/** Sub cases created from a sub case field, with "+ New" where the user may add one. */
export function SubcaseField({ name, info }: { name: string; info?: SubcaseInfo }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const items = info?.items ?? []
  const open = items.filter((i) => i.status === 'open').length

  async function create() {
    if (!info || !title.trim()) return
    setBusy(true)
    const ok = await info.onCreate(title.trim())
    setBusy(false)
    if (ok) {
      setTitle('')
      setAdding(false)
    }
  }

  return (
    <div className="rounded-[2px] border border-rule">
      <div className="flex items-center gap-2 border-b border-rule-soft bg-paper-2 px-3 py-2">
        <Layers size={14} className="shrink-0 text-ink-4" />
        <span className="flex-1 text-[13px] font-medium text-ink-2">{name}</span>
        {items.length > 0 && <span className="text-xs text-ink-4">{open ? `${open} open of ${items.length}` : `${items.length} closed`}</span>}
        {info?.canCreate && !adding && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus size={13} /> New {info.typeName}
          </Button>
        )}
      </div>

      {adding && info && (
        <form
          className="flex flex-wrap items-center gap-2 border-b border-rule-soft px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`What should the ${info.typeName} address?`}
            aria-label={`Title of the new ${info.typeName}`}
            className="h-8 min-w-[240px] flex-1"
          />
          <Button type="submit" size="sm" disabled={busy || !title.trim()}>Create {info.target?.prefix ?? info.typeName}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
        </form>
      )}

      {items.length > 0 ? (
        <ul className="divide-y divide-rule-soft">
          {items.map((c) => {
            const s = STATUS[c.status] ?? { label: c.status, variant: 'default' as const }
            const overdue = c.status === 'open' && c.phaseDueAt && new Date(c.phaseDueAt) < new Date()
            return (
              <li key={c.id}>
                <Link href={`/cases/${c.number}`} className="group flex items-center gap-3 px-3 py-2 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent">
                  <span className="w-14 shrink-0 font-mono text-xs text-nw-accent">{c.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{c.title}</span>
                    <span className={cn('text-xs', overdue ? 'text-risk-ink' : 'text-ink-4')}>
                      {c.status === 'open' ? c.phaseName : s.label}
                      {overdue && ` · overdue ${formatDate(c.phaseDueAt)}`}
                    </span>
                  </span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                  <ArrowRight size={13} className="text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        !adding && (
          <p className="px-3 py-2.5 text-xs text-ink-4">
            {info?.target ? `No ${info.typeName} sub cases yet` : `No case type “${info?.typeName ?? name}” is published for these sub cases`}
          </p>
        )
      )}

      {info?.mustBeClosed && open > 0 && (
        <p className="flex items-center gap-1.5 border-t border-rule-soft px-3 py-2 text-xs text-warn-ink">
          <AlertTriangle size={12} /> The case can move on when all {info.typeName} sub cases are closed
        </p>
      )}
    </div>
  )
}
