'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { fieldMandatoryInPhase, type FieldAccess } from '@/lib/case-config/schema'
import { useEditor } from './EditorContext'

const NEXT: Record<FieldAccess | 'none', FieldAccess | 'none'> = { none: 'edit', edit: 'readOnly', readOnly: 'none', hidden: 'edit' }

export function MatrixTab() {
  const { config, update, focusId } = useEditor()
  const cells = useRef<Record<string, HTMLButtonElement | null>>({})

  const fields = config.fields
  const access = (fieldId: string, phaseIndex: number): FieldAccess | 'none' => {
    const pl = config.phases[phaseIndex].fields[fieldId]
    return !pl || pl.access === 'hidden' ? 'none' : pl.access
  }

  const set = (fieldId: string, phaseIndex: number, a: FieldAccess | 'none') =>
    update((d) => {
      const phase = d.phases[phaseIndex]
      if (a === 'none') delete phase.fields[fieldId]
      else phase.fields[fieldId] = { access: a, mandatory: a === 'edit' ? phase.fields[fieldId]?.mandatory ?? null : null, title: phase.fields[fieldId]?.title ?? null }
    })

  const toggleMandatory = (fieldId: string, phaseIndex: number) =>
    update((d) => {
      const phase = d.phases[phaseIndex]
      const field = d.fields.find((f) => f.id === fieldId)!
      const pl = phase.fields[fieldId]
      if (!pl || pl.access !== 'edit') return
      const now = fieldMandatoryInPhase(field, phase)
      // Back to inheriting when that gives the wanted value
      pl.mandatory = field.mandatory === !now ? null : !now
    })

  const focus = (row: number, col: number) => cells.current[`${row}:${col}`]?.focus()

  function onKey(e: React.KeyboardEvent, row: number, col: number, fieldId: string) {
    const k = e.key.toLowerCase()
    const moves: Record<string, [number, number]> = { arrowup: [-1, 0], arrowdown: [1, 0], arrowleft: [0, -1], arrowright: [0, 1] }
    if (moves[k]) {
      e.preventDefault()
      focus(Math.max(0, Math.min(fields.length - 1, row + moves[k][0])), Math.max(0, Math.min(config.phases.length - 1, col + moves[k][1])))
    } else if (k === 'e') set(fieldId, col, 'edit')
    else if (k === 'r') set(fieldId, col, 'readOnly')
    else if (k === 'h' || k === 'delete' || k === 'backspace') set(fieldId, col, 'none')
    else if (k === 'm') toggleMandatory(fieldId, col)
  }

  let lastSection: string | null = null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5"><Cell a="edit" mandatory /> Editable, mandatory</span>
        <span className="inline-flex items-center gap-1.5"><Cell a="edit" /> Editable</span>
        <span className="inline-flex items-center gap-1.5"><Cell a="readOnly" /> Read-only</span>
        <span className="inline-flex items-center gap-1.5"><Cell a="none" /> Not shown</span>
        <span className="text-ink-4">Click to cycle · arrows move · <kbd className="font-mono">E</kbd> <kbd className="font-mono">R</kbd> <kbd className="font-mono">H</kbd> set · <kbd className="font-mono">M</kbd> mandatory</span>
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-auto rounded-[2px] border border-rule bg-surface">
        <table className="border-separate border-spacing-0 text-sm" role="grid" aria-label="Fields per phase">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[280px] border-b border-r border-rule bg-surface px-4 py-2.5 text-left font-normal">
                <span className="mono-meta">Field</span>
              </th>
              {config.phases.map((p, i) => (
                <th key={p.id} className="sticky top-0 z-10 min-w-[120px] border-b border-rule bg-surface px-2 py-2.5 text-center font-normal">
                  <span className="block font-mono text-[10px] text-ink-4">{i + 1}</span>
                  <span className="block text-xs font-medium text-ink">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.flatMap((f, row) => {
              const header =
                f.section !== lastSection ? (
                  <tr key={`s-${f.id}`}>
                    <td colSpan={config.phases.length + 1} className="sticky left-0 border-b border-rule-soft bg-paper-2 px-4 py-1.5">
                      <span className="mono-meta text-[10px]">{f.section || 'No section'}</span>
                    </td>
                  </tr>
                ) : null
              lastSection = f.section
              return [
                header,
                <tr key={f.id} className={cn(focusId === f.id && 'bg-accent-tint')}>
                  <th scope="row" className="sticky left-0 z-[5] border-b border-r border-rule-soft bg-surface px-4 py-1.5 text-left font-normal">
                    <span className="block truncate text-[13px] text-ink">{f.name}</span>
                  </th>
                  {config.phases.map((p, col) => {
                    const a = access(f.id, col)
                    const mandatory = a === 'edit' && fieldMandatoryInPhase(f, p)
                    return (
                      <td key={p.id} className="border-b border-rule-soft px-2 py-1 text-center">
                        <button
                          ref={(el) => void (cells.current[`${row}:${col}`] = el)}
                          tabIndex={row === 0 && col === 0 ? 0 : -1}
                          aria-label={`${f.name} in ${p.name}: ${a === 'none' ? 'not shown' : a === 'readOnly' ? 'read-only' : mandatory ? 'editable, mandatory' : 'editable'}`}
                          onClick={() => set(f.id, col, NEXT[a])}
                          onKeyDown={(e) => onKey(e, row, col, f.id)}
                          onFocus={(e) => {
                            // Roving tab stop: the focused cell is the one Tab returns to
                            for (const el of Object.values(cells.current)) if (el) el.tabIndex = -1
                            e.currentTarget.tabIndex = 0
                          }}
                          className="rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
                        >
                          <Cell a={a} mandatory={mandatory} />
                        </button>
                      </td>
                    )
                  })}
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ a, mandatory }: { a: FieldAccess | 'none'; mandatory?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-10 items-center justify-center rounded-[2px] font-mono text-[11px] font-medium',
        a === 'edit' && 'bg-nw-accent text-on-fill',
        a === 'readOnly' && 'border border-rule bg-paper-2 text-ink-3',
        a === 'none' && 'text-ink-4'
      )}
    >
      {a === 'edit' ? (mandatory ? 'E *' : 'E') : a === 'readOnly' ? 'R' : '·'}
    </span>
  )
}
