'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, ArrowLeft, Check, CircleDot, Redo2, Rocket, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { CaseTypeConfig } from '@/lib/case-config/schema'
import { hasBlockingIssues, validateCaseType, type ValidationIssue } from '@/lib/case-config/validate'
import type { RoleBindings } from '@/lib/cases/engine'
import { formatDate } from '@/components/cases/format'
import { EditorContext, type EditorApi, type EditorTab } from './EditorContext'
import { BasicsTab } from './BasicsTab'
import { PhasesTab } from './PhasesTab'
import { FieldsTab } from './FieldsTab'
import { MatrixTab } from './MatrixTab'
import { PermissionsTab } from './PermissionsTab'
import { RulesTab } from './RulesTab'
import { TryTab } from './TryTab'

export interface EditorProps {
  caseType: { id: string; status: string; caseCount: number }
  draft: CaseTypeConfig
  bindings: RoleBindings
  published: { version: number; publishedAt: string | Date; config: CaseTypeConfig } | null
  groups: EditorApi['groups']
  users: EditorApi['users']
  caseTypeNames: string[]
}

const TABS: { id: EditorTab; label: string; section?: ValidationIssue['section'][] }[] = [
  { id: 'basics', label: 'Basics', section: ['basics'] },
  { id: 'phases', label: 'Phases', section: ['phases'] },
  { id: 'fields', label: 'Fields', section: ['fields'] },
  { id: 'matrix', label: 'Field matrix', section: ['matrix'] },
  { id: 'permissions', label: 'Permissions', section: ['permissions'] },
  { id: 'rules', label: 'Rules', section: ['rules'] },
  { id: 'try', label: 'Try it' },
]

const SECTION_TAB: Record<ValidationIssue['section'], EditorTab> = {
  basics: 'basics',
  phases: 'phases',
  fields: 'fields',
  matrix: 'matrix',
  permissions: 'permissions',
  rules: 'rules',
}

type SaveState = 'saved' | 'pending' | 'saving' | 'error'

export function CaseTypeEditor({ caseType, draft, bindings: initialBindings, published, groups, users, caseTypeNames }: EditorProps) {
  const router = useRouter()
  const toast = useToast()
  const [config, setConfig] = useState(draft)
  const [bindings, setBindingsState] = useState(initialBindings)
  const [past, setPast] = useState<CaseTypeConfig[]>([])
  const [future, setFuture] = useState<CaseTypeConfig[]>([])
  const [tab, setTab] = useState<EditorTab>('basics')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [save, setSave] = useState<SaveState>('saved')
  const [publishing, setPublishing] = useState(false)
  const pending = useRef<{ draft?: CaseTypeConfig; roleBindings?: RoleBindings }>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const issues = useMemo(() => validateCaseType(config), [config])
  const errors = issues.filter((i) => i.severity === 'error')
  const unpublished = !published || JSON.stringify(published.config) !== JSON.stringify(config)

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    const body = pending.current
    if (!body.draft && !body.roleBindings) return true
    pending.current = {}
    setSave('saving')
    const res = await fetch(`/api/case-types/${caseType.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      setSave('error')
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Saving failed')
      return false
    }
    setSave(timer.current && Object.keys(pending.current).length ? 'pending' : 'saved')
    return true
  }, [caseType.id, toast])

  const schedule = useCallback(
    (part: { draft?: CaseTypeConfig; roleBindings?: RoleBindings }) => {
      pending.current = { ...pending.current, ...part }
      setSave('pending')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        flush()
      }, 2000)
    },
    [flush]
  )

  const apply = useCallback(
    (next: CaseTypeConfig, record = true) => {
      if (record) {
        setPast((p) => [...p.slice(-49), config])
        setFuture([])
      }
      setConfig(next)
      schedule({ draft: next })
    },
    [config, schedule]
  )

  const update = useCallback(
    (mutate: (d: CaseTypeConfig) => void) => {
      const next = structuredClone(config)
      mutate(next)
      apply(next)
    },
    [config, apply]
  )

  const undo = useCallback(() => {
    if (!past.length) return
    setFuture((f) => [config, ...f])
    const prev = past[past.length - 1]
    setPast((p) => p.slice(0, -1))
    apply(prev, false)
  }, [past, config, apply])

  const redo = useCallback(() => {
    if (!future.length) return
    setPast((p) => [...p, config])
    const [next, ...rest] = future
    setFuture(rest)
    apply(next, false)
  }, [future, config, apply])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // Leaving with unsaved changes: save right away, and warn if it is still in flight
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save === 'pending' || save === 'saving') {
        flush()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [save, flush])

  async function publish() {
    setPublishing(true)
    const saved = await flush()
    if (!saved) return setPublishing(false)
    const res = await fetch(`/api/case-types/${caseType.id}/publish`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    setPublishing(false)
    if (!res.ok) return toast.error(json.error ?? 'Publishing failed')
    toast.ok(`Version ${json.version} published — new cases use it, running cases keep theirs`)
    router.refresh()
  }

  const api: EditorApi = {
    config,
    update,
    bindings,
    setBindings: (b) => {
      setBindingsState(b)
      schedule({ roleBindings: b })
    },
    issues,
    groups,
    users,
    caseTypeNames,
    goTo: (t, id) => {
      setTab(t)
      setFocusId(id ?? null)
    },
    focusId,
  }

  const issueCount = (t: (typeof TABS)[number]) => issues.filter((i) => t.section?.includes(i.section))

  return (
    <EditorContext.Provider value={api}>
      <div className="-m-6 flex min-h-[calc(100%+3rem)] flex-col">
        <header className="border-b border-rule bg-paper px-6 pb-0 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href="/design/case-types" className="mb-1 inline-flex items-center gap-1 text-xs text-ink-4 hover:text-ink">
                <ArrowLeft size={13} /> Case types
              </Link>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl font-semibold text-ink">{config.caseTypeName}</h1>
                <span className="font-mono text-xs text-nw-accent">{config.prefix || '—'}</span>
                {published ? (
                  <Badge variant={unpublished ? 'warn' : 'ok'}>
                    {unpublished ? `Draft · v${published.version} is live` : `v${published.version} live`}
                  </Badge>
                ) : (
                  <Badge>Never published</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-4">
                {published ? `v${published.version} published ${formatDate(published.publishedAt, true)} · ` : ''}
                {caseType.caseCount} case{caseType.caseCount === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <SaveIndicator state={save} />
              <div className="flex">
                <button onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo (Ctrl+Z)" className="rounded-[2px] p-2 text-ink-3 hover:bg-paper-2 disabled:opacity-30">
                  <Undo2 size={15} />
                </button>
                <button onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className="rounded-[2px] p-2 text-ink-3 hover:bg-paper-2 disabled:opacity-30">
                  <Redo2 size={15} />
                </button>
              </div>
              <IssuesButton issues={issues} onPick={(i) => api.goTo(SECTION_TAB[i.section], i.targetId)} />
              <Button onClick={publish} disabled={publishing || hasBlockingIssues(issues) || (!unpublished && !!published)} title={errors.length ? 'Fix the errors first' : undefined}>
                <Rocket size={14} /> {publishing ? 'Publishing…' : published ? 'Publish changes' : 'Publish'}
              </Button>
            </div>
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map((t) => {
              const tabIssues = issueCount(t)
              const err = tabIssues.some((i) => i.severity === 'error')
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => api.goTo(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-accent',
                    tab === t.id ? 'border-nw-accent font-medium text-nw-accent' : 'border-transparent text-ink-3 hover:text-ink'
                  )}
                >
                  {t.label}
                  {tabIssues.length > 0 && (
                    <span className={cn('h-1.5 w-1.5 rounded-full', err ? 'bg-risk' : 'bg-warn')} aria-label={`${tabIssues.length} issues`} />
                  )}
                </button>
              )
            })}
          </nav>
        </header>

        <div className="flex-1 bg-paper p-6">
          {tab === 'basics' && <BasicsTab />}
          {tab === 'phases' && <PhasesTab />}
          {tab === 'fields' && <FieldsTab />}
          {tab === 'matrix' && <MatrixTab />}
          {tab === 'permissions' && <PermissionsTab />}
          {tab === 'rules' && <RulesTab />}
          {tab === 'try' && <TryTab />}
        </div>
      </div>
    </EditorContext.Provider>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = { saved: 'Saved', pending: 'Unsaved changes', saving: 'Saving…', error: 'Not saved' }[state]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', state === 'error' ? 'text-risk-ink' : 'text-ink-4')} aria-live="polite">
      {state === 'saved' ? <Check size={12} className="text-ok" /> : <CircleDot size={12} className={state === 'error' ? '' : 'text-warn'} />}
      {text}
    </span>
  )
}

function IssuesButton({ issues, onPick }: { issues: ValidationIssue[]; onPick: (i: ValidationIssue) => void }) {
  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.length - errors
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex h-[34px] items-center gap-1.5 rounded-[2px] border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
            errors ? 'border-risk-line bg-risk-tint text-risk-ink' : warnings ? 'border-warn-line bg-warn-tint text-warn-ink' : 'border-ok-line bg-ok-tint text-ok-ink'
          )}
        >
          {errors ? <AlertCircle size={14} /> : warnings ? <AlertTriangle size={14} /> : <Check size={14} />}
          {errors ? `${errors} error${errors > 1 ? 's' : ''}` : warnings ? `${warnings} warning${warnings > 1 ? 's' : ''}` : 'Ready'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 rounded-[2px] border-rule bg-surface p-1">
        {issues.length ? (
          <ul className="max-h-80 overflow-y-auto">
            {issues.map((i) => (
              <li key={i.id}>
                <button onClick={() => onPick(i)} className="flex w-full items-start gap-2 rounded-[2px] px-2.5 py-2 text-left text-sm hover:bg-paper-2">
                  {i.severity === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0 text-risk" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />}
                  <span className="text-ink">{i.message}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-3 text-sm text-ink-3">No problems found — the case type can be published.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
