'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Mail, PenLine, RotateCcw, ShieldAlert, XCircle, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fieldTitleInPhase } from '@/lib/case-config/schema'
import { fieldStates, firingRules, nextPhaseId, TRIGGER_FOR, visibleLayout, type CaseMove, type CaseValues } from '@/lib/case-config/runtime'
import { moveStates, permissionIn, phaseHolderRoleIds, restrictForActor, type CaseStatus } from '@/lib/cases/engine'
import { FieldControl } from '@/components/cases/FieldControl'
import { useEditor } from './EditorContext'
import { Chip } from './controls'

interface LogEntry {
  id: number
  kind: 'move' | 'email' | 'sign' | 'blocked' | 'info'
  text: string
}

let logId = 0

/** Runs the draft configuration with the same pure rules as the case page — nothing is saved. */
export function TryTab() {
  const { config, users } = useEditor()
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [status, setStatus] = useState<CaseStatus>('open')
  const [values, setValues] = useState<CaseValues>({})
  const phase = config.phases[Math.min(phaseIndex, config.phases.length - 1)]
  const [roleIds, setRoleIds] = useState<string[]>(() => (phase ? phaseHolderRoleIds(config, phase) : []))
  const [log, setLog] = useState<LogEntry[]>([])

  const perm = phase ? permissionIn(phase, roleIds) : { edit: false, forward: false, backward: false, preEnd: false }
  const states = useMemo(
    () => (phase ? restrictForActor(config, phase, fieldStates(config, phase, values), perm, roleIds, status) : new Map()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, phase, values, roleIds, status]
  )
  const moves = phase ? moveStates(config, phase, perm, status, values) : null

  if (!phase || !moves) return <p className="text-sm text-ink-4">Add a phase to try the case type.</p>

  const add = (entries: Omit<LogEntry, 'id'>[]) => setLog((l) => [...entries.map((e) => ({ ...e, id: ++logId })), ...l])
  const roleNames = (ids: string[]) => ids.map((id) => config.roles.find((r) => r.id === id)?.name ?? id).join(', ')

  function enterPhase(index: number) {
    setPhaseIndex(index)
    setRoleIds(phaseHolderRoleIds(config, config.phases[index]))
  }

  function doMove(m: CaseMove) {
    const state = moves![m]
    if (!state.allowed) return add([{ kind: 'blocked', text: `${labelFor(m)} blocked: ${state.reason}` }])
    const entries: Omit<LogEntry, 'id'>[] = []
    if (state.signature) entries.push({ kind: 'sign', text: `${labelFor(m)} asks for an electronic signature` })
    for (const r of firingRules(config, phase, TRIGGER_FOR[m], values))
      if (r.type === 'email') entries.push({ kind: 'email', text: `E-mail to ${roleNames(r.recipientRoleIds) || 'nobody'}${r.subject ? `: ${r.subject}` : ''}` })
    if (m === 'forward') {
      const next = nextPhaseId(config, phase, values)
      const idx = config.phases.findIndex((p) => p.id === next)
      if (idx < 0) {
        setStatus('closed')
        entries.push({ kind: 'move', text: `Case closed from ${phase.name}` })
      } else {
        enterPhase(idx)
        entries.push({ kind: 'move', text: `Sent to ${config.phases[idx].name} — now with ${roleNames(phaseHolderRoleIds(config, config.phases[idx]))}` })
      }
    } else if (m === 'backward') {
      enterPhase(phaseIndex - 1)
      entries.push({ kind: 'move', text: `Sent back to ${config.phases[phaseIndex - 1].name}` })
    } else {
      setStatus('preClosed')
      entries.push({ kind: 'move', text: `Closed early in ${phase.name}` })
    }
    add(entries.reverse())
  }

  function reset() {
    setValues({})
    setStatus('open')
    enterPhase(0)
    setLog([])
  }

  const fieldById = new Map(config.fields.map((f) => [f.id, f]))
  const rows = visibleLayout(config, phase, values)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-[2px] border border-rule bg-surface px-4 py-3">
          <ol className="flex flex-1 flex-wrap items-center gap-1 text-sm" aria-label="Phases">
            {config.phases.map((p, i) => (
              <li key={p.id} className="flex items-center gap-1">
                {i > 0 && <ArrowRight size={12} className="text-ink-4" />}
                <button
                  onClick={() => enterPhase(i)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs',
                    i === phaseIndex && status === 'open' ? 'bg-nw-accent text-on-fill' : i < phaseIndex || status !== 'open' ? 'bg-ok-tint text-ok-ink' : 'text-ink-4 hover:bg-paper-2'
                  )}
                  title="Jump to this phase"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ol>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw size={13} /> Start over</Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-[2px] border border-rule bg-surface px-4 py-3 text-sm">
          <span className="mr-1 text-xs text-ink-4">Acting as</span>
          {config.roles.map((r) => (
            <Chip key={r.id} on={roleIds.includes(r.id)} onClick={() => setRoleIds((ids) => (ids.includes(r.id) ? ids.filter((x) => x !== r.id) : [...ids, r.id]))}>
              {r.name}
            </Chip>
          ))}
        </div>

        <section className="rounded-[2px] border border-rule bg-surface">
          <header className="border-b border-rule px-5 py-3">
            <p className="mono-meta text-nw-accent">Try it · phase {phaseIndex + 1} of {config.phases.length}</p>
            <h2 className="font-display text-lg font-semibold text-ink">{status === 'open' ? phase.name : status === 'closed' ? 'Closed' : 'Closed early'}</h2>
          </header>
          <div className="space-y-4 px-5 py-5">
            {rows.map((r) => {
              if (r.type === 'header') return <h3 key={r.id} className="mono-meta pt-2">{r.title}</h3>
              if (r.type === 'divider') return <hr key={r.id} className="border-rule" />
              return (
                <div key={r.id} className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-3">
                  {r.cells.map((c) => {
                    const field = fieldById.get(c.fieldId)
                    const state = states.get(c.fieldId)
                    if (!field || !state) return null
                    return (
                      <div key={c.fieldId} className={cn(c.span === 3 ? 'md:col-span-3' : c.span === 2 ? 'md:col-span-2' : '')}>
                        <FieldControl
                          field={field}
                          title={fieldTitleInPhase(field, phase)}
                          state={state}
                          values={values}
                          config={config}
                          users={users}
                          attachments={[]}
                          caseId="try"
                          invalid={false}
                          onChange={(v) => setValues((cur) => ({ ...cur, [field.id]: v }))}
                          onButton={() => {
                            const mails = firingRules(config, phase, 'onButtonClick', values).filter((x) => x.type === 'email')
                            add([{ kind: 'info' as const, text: `${field.name} clicked` }, ...mails.map((m) => ({ kind: 'email' as const, text: `E-mail to ${roleNames(m.type === 'email' ? m.recipientRoleIds : [])}` }))].reverse())
                          }}
                          onUpload={async () => add([{ kind: 'info', text: 'Files are not stored in Try it' }])}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {!rows.length && <p className="text-sm text-ink-4">No fields in this phase.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule px-5 py-3">
            {!perm.edit && !perm.forward && status === 'open' && <span className="mr-auto text-xs text-ink-4">The selected roles cannot work in this phase.</span>}
            {perm.backward && <Button variant="outline" size="sm" onClick={() => doMove('backward')} title={moves.backward.reason}>Send back</Button>}
            {perm.preEnd && <Button variant="outline" size="sm" onClick={() => doMove('preEnd')} className={cn(!moves.preEnd.allowed && 'opacity-60')} title={moves.preEnd.reason}>Quick close</Button>}
            {perm.forward && (
              <Button size="sm" onClick={() => doMove('forward')} className={cn(!moves.forward.allowed && 'opacity-60')} title={moves.forward.reason}>
                {moves.forward.closes ? 'Close case' : 'Send forward'}
              </Button>
            )}
          </div>
        </section>
      </div>

      <aside className="rounded-[2px] border border-rule bg-surface xl:sticky xl:top-0 xl:self-start">
        <h2 className="border-b border-rule px-4 py-3 text-sm font-semibold text-ink">What happens</h2>
        <ol className="max-h-[560px] space-y-2.5 overflow-y-auto p-4">
          {log.map((e) => (
            <li key={e.id} className="flex gap-2.5 text-[13px] leading-snug">
              <span className={cn('mt-0.5 shrink-0', e.kind === 'blocked' ? 'text-risk' : e.kind === 'sign' ? 'text-nw-accent' : e.kind === 'email' ? 'text-ink-3' : 'text-ok')}>
                {e.kind === 'blocked' ? <ShieldAlert size={14} /> : e.kind === 'sign' ? <PenLine size={14} /> : e.kind === 'email' ? <Mail size={14} /> : e.kind === 'move' ? <Flag size={14} /> : <XCircle size={14} className="text-ink-4" />}
              </span>
              <span className={e.kind === 'blocked' ? 'text-risk-ink' : 'text-ink-2'}>{e.text}</span>
            </li>
          ))}
          {!log.length && <li className="text-sm text-ink-4">Fill in the form and move the case — blocked moves, e-mails and signatures show up here.</li>}
        </ol>
      </aside>
    </div>
  )
}

const labelFor = (m: CaseMove) => ({ forward: 'Send forward', backward: 'Send back', preEnd: 'Quick close' })[m]
