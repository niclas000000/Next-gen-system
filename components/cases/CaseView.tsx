'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, Check, ChevronDown, CircleSlash, Inbox, Lock, PenLine,
  RotateCcw, Save, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { fieldStates, missingMandatory, visibleLayout, type CaseMove, type CaseValues } from '@/lib/case-config/runtime'
import { homePhaseIndex } from '@/lib/case-config/layout'
import { fieldTitleInPhase, type LayoutRow } from '@/lib/case-config/schema'
import { moveStates, restrictForActor, type CaseStatus } from '@/lib/cases/engine'
import type { CaseDetail } from '@/lib/cases/service'
import { FieldControl } from './FieldControl'
import { SignDialog } from './SignDialog'
import { CaseSidePanel } from './CaseSidePanel'
import { formatDate } from './format'
import { pushRecent } from '@/lib/recent'

const STATUS: Record<string, { label: string; variant: 'warn' | 'ok' | 'default' | 'risk' }> = {
  open: { label: 'Open', variant: 'warn' },
  closed: { label: 'Closed', variant: 'ok' },
  preClosed: { label: 'Closed early', variant: 'ok' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

const MOVE_LABEL: Record<CaseMove, string> = { forward: 'Send forward', backward: 'Send back', preEnd: 'Quick close' }
const DEFAULT_MEANING: Record<CaseMove, string> = {
  forward: 'I approve the work in this phase and send the case forward',
  backward: 'I send the case back for completion',
  preEnd: 'I approve closing the case early',
}

export function CaseView({ detail }: { detail: CaseDetail }) {
  const router = useRouter()
  const toast = useToast()
  const { config, case: c } = detail
  const phase = config.phases[detail.phaseIndex]
  const status = c.status as CaseStatus

  const [values, setValues] = useState<CaseValues>(c.values)
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [signing, setSigning] = useState<CaseMove | null>(null)

  // A new revision from the server replaces local state
  useEffect(() => {
    setValues(c.values)
    setDirty(new Set())
    setInvalid(new Set())
  }, [c.revision, c.values])

  useEffect(() => {
    pushRecent({ label: `${c.number} · ${c.title}`, sub: c.status === 'open' ? phase.name : 'Closed', href: `/cases/${c.number}`, kind: 'case' })
  }, [c.number, c.title, c.status, phase.name])

  useEffect(() => {
    if (!dirty.size) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty.size])

  // Live state while typing — same pure rules as the server
  const states = useMemo(
    () => restrictForActor(config, phase, fieldStates(config, phase, values), detail.permission, detail.myRoleIds, status),
    [config, phase, values, detail.permission, detail.myRoleIds, status]
  )
  const moves = useMemo(() => moveStates(config, phase, detail.permission, status, values), [config, phase, detail.permission, status, values])

  const fieldById = useMemo(() => new Map(config.fields.map((f) => [f.id, f])), [config.fields])
  const home = useMemo(() => new Map(config.fields.map((f) => [f.id, homePhaseIndex(config, f.id)])), [config])

  // History shows what was recorded; empty read-only fields are noise there
  const hasValue = (fieldId: string) => {
    const f = fieldById.get(fieldId)
    if (!f || f.type === 'button' || f.type === 'subcase' || f.type === 'collapsiblePanel') return false
    if (f.type === 'staticText' || f.type === 'delimiter') return true
    const v = values[fieldId]
    return Array.isArray(v) ? v.length > 0 : !!v
  }

  // Fields carried read-only from earlier phases are shown as history, the rest is "this phase"
  const isHistory = (fieldId: string) => (home.get(fieldId) ?? 0) < detail.phaseIndex && states.get(fieldId)?.readOnly
  const mainRows = useMemo(() => {
    if (status !== 'open') return []
    return clean(
      visibleLayout(config, phase, values).map((r) =>
        r.type === 'fields' ? { ...r, cells: r.cells.filter((cell) => !isHistory(cell.fieldId)) } : r
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, phase, values, states, status])

  const historyPhases = useMemo(() => {
    const upTo = status === 'open' ? detail.phaseIndex : detail.phaseIndex + 1
    return config.phases.slice(0, upTo).map((p, i) => ({
      phase: p,
      rows: clean(
        visibleLayout(config, phase, values).map((r) =>
          r.type === 'fields'
            ? {
                ...r,
                cells: r.cells.filter(
                  (cell) => home.get(cell.fieldId) === i && (status !== 'open' || isHistory(cell.fieldId)) && hasValue(cell.fieldId)
                ),
              }
            : r
        )
      ),
    })).filter((h) => h.rows.some((r) => r.type === 'fields'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, phase, values, states, status, detail.phaseIndex])

  const patch = (): CaseValues => Object.fromEntries([...dirty].map((id) => [id, values[id] ?? '']))

  const change = (fieldId: string, value: string | string[]) => {
    setValues((v) => ({ ...v, [fieldId]: value }))
    setDirty((d) => new Set(d).add(fieldId))
    setInvalid((s) => {
      const next = new Set(s)
      next.delete(fieldId)
      return next
    })
  }

  async function call(url: string, init: RequestInit, success: string) {
    setBusy(true)
    try {
      const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init.headers } })
      const json = await res.json().catch(() => ({}))
      if (res.status === 409) {
        toast.show(json.error ?? 'The case has changed', { kind: 'error', action: { label: 'Reload', onClick: () => router.refresh() } })
        return null
      }
      if (!res.ok) {
        toast.error(json.error ?? 'Something went wrong')
        return { error: res.status }
      }
      toast.ok(success)
      router.refresh()
      return json
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    call(`/api/cases/${c.id}`, { method: 'PATCH', body: JSON.stringify({ values: patch(), revision: c.revision }) }, 'Saved')

  function move(m: CaseMove, signature?: { password: string; meaning: string }) {
    const state = moves[m]
    if (!state.allowed) {
      if (m !== 'backward') setInvalid(new Set(missingMandatory(config, phase, values).map((f) => f.id)))
      toast.error(state.reason ?? 'Not possible right now')
      return
    }
    if (state.signature && !signature) {
      setSigning(m)
      return
    }
    const target =
      m === 'forward'
        ? state.closes
          ? 'Case closed'
          : `Sent to ${config.phases[detail.phaseIndex + 1]?.name ?? 'the next phase'}`
        : m === 'backward'
          ? `Sent back to ${config.phases[detail.phaseIndex - 1]?.name}`
          : 'Case closed early'
    return call(
      `/api/cases/${c.id}/actions`,
      { method: 'POST', body: JSON.stringify({ action: m, revision: c.revision, values: patch(), signature }) },
      target
    ).then((r) => {
      if (r && !('error' in r)) setSigning(null)
    })
  }

  const take = () =>
    call(`/api/cases/${c.id}/actions`, { method: 'POST', body: JSON.stringify({ action: 'take', revision: c.revision }) }, 'The case is yours')

  const pressButton = (fieldId: string) =>
    call(
      `/api/cases/${c.id}/actions`,
      { method: 'POST', body: JSON.stringify({ action: 'button', revision: c.revision, values: patch() }) },
      `${fieldById.get(fieldId)?.name ?? 'Done'} — saved`
    )

  async function upload(fieldId: string, file: File) {
    const form = new FormData()
    form.append('file', file)
    form.append('fieldId', fieldId)
    const res = await fetch(`/api/cases/${c.id}/attachments`, { method: 'POST', body: form })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json.error ?? 'Upload failed')
      return
    }
    const current = values[fieldId]
    const ids = [...(Array.isArray(current) ? current : current ? [current] : []), json.attachment.id]
    await call(
      `/api/cases/${c.id}`,
      { method: 'PATCH', body: JSON.stringify({ values: { ...patch(), [fieldId]: ids }, revision: c.revision }) },
      `${file.name} attached`
    )
  }

  const renderRows = (rows: LayoutRow[], ph = phase) => (
    <div className="space-y-4">
      {rows.map((r) => {
        if (r.type === 'header') return <h3 key={r.id} className="mono-meta pt-3 first:pt-0">{r.title}</h3>
        if (r.type === 'divider') return <hr key={r.id} className="border-rule" />
        return (
          <div key={r.id} className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
            {r.cells.map((cell) => {
              const field = fieldById.get(cell.fieldId)
              const state = states.get(cell.fieldId)
              if (!field || !state) return null
              return (
                <div key={cell.fieldId} className={cn(cell.span === 3 ? 'md:col-span-3' : cell.span === 2 ? 'md:col-span-2' : '')}>
                  <FieldControl
                    field={field}
                    title={fieldTitleInPhase(field, ph)}
                    state={state}
                    values={values}
                    config={config}
                    users={detail.users}
                    attachments={detail.attachments}
                    caseId={c.id}
                    invalid={invalid.has(field.id)}
                    onChange={(v) => change(field.id, v)}
                    onButton={pressButton}
                    onUpload={upload}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  const overdue = status === 'open' && c.phaseDueAt && new Date(c.phaseDueAt) < new Date()
  const canAnything = moves.forward.allowed || detail.permission.forward || detail.permission.backward || detail.permission.preEnd || detail.actions.save.allowed
  const groupInbox = detail.actions.take.allowed
  const holderText = detail.holders.flatMap((h) => h.userIds.map((id) => detail.users.find((u) => u.id === id)?.name ?? '')).filter(Boolean)

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <div className="mb-5">
        <Link href="/cases" className="inline-flex items-center gap-1 text-xs text-ink-4 hover:text-ink mb-3 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent">
          <ArrowLeft size={13} /> All cases
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mono-meta">
              <span className="text-nw-accent">{c.number}</span> · {c.caseType.name} · v{c.version}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-ink font-display leading-tight">{c.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-4">
              <Badge variant={STATUS[status]?.variant ?? 'default'}>{STATUS[status]?.label ?? status}</Badge>
              {overdue && (
                <Badge variant="risk">
                  <AlertTriangle size={11} /> Overdue since {formatDate(c.phaseDueAt)}
                </Badge>
              )}
              {status === 'open' && c.phaseDueAt && !overdue && (
                <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> Phase due {formatDate(c.phaseDueAt)}</span>
              )}
              <span>Created {formatDate(c.createdAt, true)}</span>
              {c.closedAt && <span>· Closed {formatDate(c.closedAt, true)}</span>}
            </div>
          </div>
        </div>
      </div>

      <PhaseStepper phases={config.phases.map((p) => p.name)} index={detail.phaseIndex} status={status} />

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="min-w-0 space-y-4">
          {groupInbox && (
            <div className="flex flex-wrap items-center gap-3 rounded-[2px] border border-nw-accent bg-accent-tint px-4 py-3">
              <Inbox size={16} className="text-nw-accent shrink-0" />
              <p className="flex-1 text-sm text-ink">
                This case is waiting in your group&apos;s inbox. Take it to become <strong>{detail.holders[0]?.name ?? 'responsible'}</strong>.
              </p>
              <Button size="sm" onClick={take} disabled={busy}>Take case</Button>
            </div>
          )}

          {status === 'open' && !canAnything && !groupInbox && (
            <div className="flex items-center gap-3 rounded-[2px] border border-rule bg-paper-2 px-4 py-3 text-sm text-ink-3">
              <Lock size={15} className="text-ink-4 shrink-0" />
              You can view this case. It is with {holderText.length ? holderText.join(', ') : detail.holders.map((h) => h.name).join(', ')}.
            </div>
          )}

          {status === 'open' && (
            <section className="rounded-[2px] border border-rule bg-surface">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-3.5">
                <div>
                  <p className="mono-meta text-nw-accent">Phase {detail.phaseIndex + 1} of {config.phases.length}</p>
                  <h2 className="text-lg font-semibold text-ink font-display">{phase.name}</h2>
                </div>
                {phase.description && <p className="text-xs text-ink-4 max-w-xl">{phase.description}</p>}
              </header>
              <div className="px-5 py-5">
                {mainRows.length ? renderRows(mainRows) : <p className="text-sm text-ink-4">Nothing to fill in for you in this phase.</p>}
              </div>

              {(detail.permission.edit || detail.permission.forward || detail.permission.backward || detail.permission.preEnd) && (
                <ActionBar
                  dirty={dirty.size > 0}
                  busy={busy}
                  canSave={detail.actions.save.allowed}
                  permission={detail.permission}
                  moves={moves}
                  nextName={config.phases[detail.phaseIndex + 1]?.name}
                  prevName={config.phases[detail.phaseIndex - 1]?.name}
                  onSave={save}
                  onMove={move}
                />
              )}
            </section>
          )}

          {status !== 'open' && (
            <div className="flex items-center gap-3 rounded-[2px] border border-ok-line bg-ok-tint px-4 py-3 text-sm text-ok-ink">
              {status === 'cancelled' ? <XCircle size={16} /> : <Check size={16} />}
              {status === 'cancelled' ? 'This case was cancelled.' : status === 'preClosed' ? `Closed early in ${phase.name}.` : 'The case went through all phases and is closed.'}
            </div>
          )}

          {historyPhases.length > 0 && (
            <div className="space-y-2">
              {historyPhases
                .slice()
                .reverse()
                .map((h, i) => (
                  <HistorySection
                    key={h.phase.id}
                    name={h.phase.name}
                    label={status === 'open' ? 'Earlier phase' : `Phase ${config.phases.indexOf(h.phase) + 1}`}
                    defaultOpen={status !== 'open' || i === 0}
                  >
                    {renderRows(h.rows, h.phase)}
                  </HistorySection>
                ))}
            </div>
          )}
        </div>

        <CaseSidePanel detail={detail} />
      </div>

      <SignDialog
        open={signing !== null}
        action={signing ? MOVE_LABEL[signing] : ''}
        caseNumber={c.number}
        defaultMeaning={signing ? DEFAULT_MEANING[signing] : ''}
        busy={busy}
        onCancel={() => setSigning(null)}
        onSign={(sig) => signing && move(signing, sig)}
      />
    </div>
  )
}

/** Drops headers and dividers that no longer have fields after them. */
function clean(rows: LayoutRow[]): LayoutRow[] {
  const withCells = rows.filter((r) => r.type !== 'fields' || r.cells.length > 0)
  return withCells.filter((r, i) => {
    if (r.type === 'fields') return true
    const next = withCells.slice(i + 1).find((x) => x.type !== 'divider')
    return next?.type === 'fields'
  })
}

function PhaseStepper({ phases, index, status }: { phases: string[]; index: number; status: CaseStatus }) {
  return (
    <ol className="flex w-full overflow-x-auto rounded-[2px] border border-rule bg-surface" aria-label="Phases">
      {phases.map((name, i) => {
        const done = i < index || status === 'closed'
        const current = i === index && status === 'open'
        const skipped = status === 'preClosed' && i > index
        const endedHere = status === 'preClosed' && i === index
        return (
          <li
            key={name}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'relative flex min-w-[150px] flex-1 items-center gap-2.5 px-4 py-3 text-sm',
              i > 0 && 'border-l border-rule',
              current ? 'bg-accent-tint' : ''
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-mono',
                done || endedHere ? 'border-ok bg-ok text-on-fill' : current ? 'border-nw-accent bg-nw-accent text-on-fill' : 'border-rule text-ink-4'
              )}
            >
              {done || endedHere ? <Check size={12} /> : skipped ? <CircleSlash size={11} /> : i + 1}
            </span>
            <span className={cn('truncate', current ? 'font-medium text-nw-accent' : done || endedHere ? 'text-ink' : 'text-ink-4', skipped && 'line-through')}>
              {name}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ActionBar({
  dirty, busy, canSave, permission, moves, nextName, prevName, onSave, onMove,
}: {
  dirty: boolean
  busy: boolean
  canSave: boolean
  permission: CaseDetail['permission']
  moves: ReturnType<typeof moveStates>
  nextName?: string
  prevName?: string
  onSave: () => void
  onMove: (m: CaseMove) => void
}) {
  const fwd = moves.forward
  const blocked = permission.forward && !fwd.allowed ? fwd.reason : null
  return (
    <div className="sticky bottom-0 z-10 border-t border-rule bg-surface px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[160px] text-xs">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 text-warn-ink"><PenLine size={12} /> Unsaved changes</span>
          ) : blocked ? (
            <span className="inline-flex items-center gap-1.5 text-ink-4"><AlertTriangle size={12} /> {blocked}</span>
          ) : (
            <span className="text-ink-4">All changes saved</span>
          )}
        </div>
        {canSave && (
          <Button variant="outline" size="sm" onClick={onSave} disabled={busy || !dirty}>
            <Save size={13} /> Save
          </Button>
        )}
        {permission.backward && prevName && (
          <Button variant="outline" size="sm" onClick={() => onMove('backward')} disabled={busy} title={moves.backward.reason}>
            <RotateCcw size={13} /> Send back
          </Button>
        )}
        {permission.preEnd && (
          <Button variant="outline" size="sm" onClick={() => onMove('preEnd')} disabled={busy} title={moves.preEnd.reason} aria-disabled={!moves.preEnd.allowed} className={cn(!moves.preEnd.allowed && 'opacity-60')}>
            <XCircle size={13} /> Quick close
          </Button>
        )}
        {permission.forward && (
          <Button size="sm" onClick={() => onMove('forward')} disabled={busy} title={fwd.reason} aria-disabled={!fwd.allowed} className={cn(!fwd.allowed && 'opacity-60')}>
            {fwd.closes ? 'Close case' : `Send to ${nextName ?? 'next phase'}`}
            {!fwd.closes && <ArrowRight size={13} />}
          </Button>
        )}
      </div>
    </div>
  )
}

function HistorySection({ name, label, defaultOpen, children }: { name: string; label: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-[2px] border border-rule bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent"
      >
        <Check size={14} className="text-ok" />
        <span className="flex-1 text-sm font-medium text-ink">{name}</span>
        <span className="mono-meta">{label}</span>
        <ChevronDown size={14} className={cn('text-ink-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-rule px-5 py-5">{children}</div>}
    </section>
  )
}
