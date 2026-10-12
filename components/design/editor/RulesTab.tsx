'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LAYOUT_FIELD_TYPES,
  PHASE_EVENT_LABELS,
  RULE_TYPE_LABELS,
  RuleOperators,
  RuleTriggers,
  ruleTitle,
  type CaseTypeConfig,
  type FieldCondition,
  type PhaseEvent,
  type PhaseRule,
  type RuleTrigger,
  type RuleType,
} from '@/lib/case-config/schema'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useEditor } from './EditorContext'
import { Chip, RowActions, Select, TextInput, move } from './controls'

const TRIGGER_LABELS: Record<RuleTrigger, string> = {
  onForward: 'on forward',
  onBackward: 'on send back',
  onSave: 'on save',
  onPreEnd: 'on quick close',
  onAnonymousReporting: 'on anonymous report',
  onButtonClick: 'on button click',
  afterSave: 'live (after save)',
}

const OPERATOR_LABELS: Record<FieldCondition['operator'], string> = { eq: 'is', neq: 'is not', empty: 'is empty', notEmpty: 'is filled in' }

/** Rule types the runtime acts on; the others are kept from Blueprint/CANEA as documentation. */
const EDITABLE_TYPES: RuleType[] = ['mandatory', 'fieldAccess', 'direction', 'flowChange', 'eSignature', 'email']

const DEFAULT_TRIGGERS: Record<RuleType, RuleTrigger[]> = {
  email: ['onForward'],
  sms: ['onForward'],
  mandatory: ['onForward'],
  computed: ['afterSave'],
  webService: ['onSave'],
  fieldAccess: ['afterSave'],
  saveCheckIn: ['onButtonClick'],
  alarm: [],
  flowChange: ['onForward'],
  eSignature: ['onForward'],
  direction: ['onForward'],
}

function newRule(type: RuleType, id: string): PhaseRule {
  const base = { id, name: '', triggers: DEFAULT_TRIGGERS[type], when: null, condition: '', comments: '' }
  switch (type) {
    case 'email':
      return { ...base, type, recipientRoleIds: [], recipientText: '', subject: '', message: '' }
    case 'mandatory':
      return { ...base, type, fieldIds: [] }
    case 'fieldAccess':
      return { ...base, type, fieldIds: [], access: 'hidden' }
    case 'flowChange':
      return { ...base, type, toPhaseId: '' }
    case 'direction':
      return { ...base, type, allowed: 'forward', message: '' }
    default:
      return { ...base, type } as PhaseRule
  }
}

export function RulesTab() {
  const { config, update, focusId } = useEditor()
  const [phaseId, setPhaseId] = useState(() => (focusId && config.phases.some((p) => p.id === focusId) ? focusId : config.phases[0]?.id))
  const pi = Math.max(0, config.phases.findIndex((p) => p.id === phaseId))
  const phase = config.phases[pi]
  if (!phase) return <p className="text-sm text-ink-4">Add a phase first.</p>

  const edit = (ri: number, mutate: (r: PhaseRule) => void) => update((d) => mutate(d.phases[pi].rules[ri]))

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Phases" className="space-y-1">
        {config.phases.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setPhaseId(p.id)}
            aria-current={p.id === phase.id ? 'true' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-[2px] px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
              p.id === phase.id ? 'bg-accent-tint font-medium text-nw-accent' : 'text-ink-3 hover:bg-paper-2'
            )}
          >
            <span className="font-mono text-[11px] text-ink-4">{i + 1}</span>
            <span className="flex-1 truncate">{p.name}</span>
            <span className="rounded-full bg-paper-3 px-1.5 text-[10px] text-ink-3">{p.rules.length}</span>
          </button>
        ))}
      </nav>

      <div className="space-y-3">
        {phase.rules.map((rule, ri) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            config={config}
            index={ri}
            count={phase.rules.length}
            onChange={(m) => edit(ri, m)}
            onMove={(to) => update((d) => move(d.phases[pi].rules, ri, to))}
            onDelete={() => update((d) => void d.phases[pi].rules.splice(ri, 1))}
            onReplace={(r) => update((d) => void (d.phases[pi].rules[ri] = r))}
          />
        ))}
        {!phase.rules.length && <p className="rounded-[2px] border border-dashed border-rule px-4 py-6 text-center text-sm text-ink-4">No rules in {phase.name} yet.</p>}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-[2px] border border-dashed border-rule px-3 py-1.5 text-sm text-ink-3 hover:border-nw-accent hover:text-nw-accent">
              <Plus size={14} /> Add rule
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-[2px] border-rule bg-surface">
            {EDITABLE_TYPES.map((t) => (
              <DropdownMenuItem key={t} onSelect={() => update((d) => void d.phases[pi].rules.push(newRule(t, `rule-${Date.now().toString(36)}`)))}>
                {RULE_TYPE_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function RuleCard({
  rule, config, index, count, onChange, onMove, onDelete, onReplace,
}: {
  rule: PhaseRule
  config: CaseTypeConfig
  index: number
  count: number
  onChange: (mutate: (r: PhaseRule) => void) => void
  onMove: (to: number) => void
  onDelete: () => void
  onReplace: (r: PhaseRule) => void
}) {
  const dataFields = config.fields.filter((f) => !LAYOUT_FIELD_TYPES.includes(f.type))
  const condField = config.fields.find((f) => f.id === rule.when?.fieldId)
  const condRegistry = config.registries.find((r) => r.id === condField?.registryId)
  const valueOptions = condField?.type === 'checkbox' ? ['Yes', 'No'] : condRegistry && condRegistry.id !== 'r-users' ? condRegistry.values : null
  const editable = EDITABLE_TYPES.includes(rule.type)

  return (
    <article className="rounded-[2px] border border-rule bg-surface">
      <header className="flex items-start gap-3 border-b border-rule-soft px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="mono-meta text-[10px]">{RULE_TYPE_LABELS[rule.type]}</p>
          <h3 className="text-sm font-medium text-ink">{ruleTitle(rule, config)}</h3>
        </div>
        <RowActions index={index} count={count} label="rule" onMove={onMove} onDelete={onDelete} />
      </header>

      <div className="space-y-3 px-4 py-3 text-sm">
        {!editable && <p className="text-xs text-ink-4">Kept from the source configuration — Nexus does not run this rule type yet.</p>}

        {/* Condition */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-xs text-ink-4">When</span>
          {rule.when ? (
            <>
              <Select
                value={rule.when.fieldId}
                aria-label="Condition field"
                className="h-8 w-56"
                onChange={(v) => onChange((r) => void (r.when = { fieldId: v, operator: r.when!.operator, value: '' }))}
                options={dataFields.map((f) => ({ value: f.id, label: f.name }))}
              />
              <Select
                value={rule.when.operator}
                aria-label="Operator"
                className="h-8 w-32"
                onChange={(v) => onChange((r) => void (r.when!.operator = v as FieldCondition['operator']))}
                options={RuleOperators.map((o) => ({ value: o, label: OPERATOR_LABELS[o] }))}
              />
              {(rule.when.operator === 'eq' || rule.when.operator === 'neq') &&
                (valueOptions ? (
                  <Select value={rule.when.value} aria-label="Value" className="h-8 w-48" placeholder="— value —" onChange={(v) => onChange((r) => void (r.when!.value = v))} options={valueOptions.map((v) => ({ value: v, label: v }))} />
                ) : (
                  <TextInput value={rule.when.value} aria-label="Value" className="h-8 w-48" onChange={(e) => onChange((r) => void (r.when!.value = e.target.value))} />
                ))}
              <button className="text-xs text-ink-4 hover:text-risk-ink" onClick={() => onChange((r) => void (r.when = null))}>remove condition</button>
            </>
          ) : (
            <>
              <span className="text-ink-3">{rule.condition ? <em>“{rule.condition}” (free text — not evaluated)</em> : 'always'}</span>
              <button
                className="text-xs text-nw-accent hover:underline"
                onClick={() => onChange((r) => void ((r.when = { fieldId: dataFields[0]?.id ?? '', operator: 'eq', value: '' }), (r.condition = '')))}
              >
                + condition
              </button>
            </>
          )}
        </div>

        {/* Type specific */}
        {(rule.type === 'mandatory' || rule.type === 'fieldAccess') && (
          <div className="flex flex-wrap items-start gap-2">
            <span className="w-16 pt-1 text-xs text-ink-4">Then</span>
            <div className="flex-1 space-y-2">
              {rule.type === 'fieldAccess' && (
                <div className="flex gap-1.5">
                  {(['hidden', 'readOnly'] as const).map((a) => (
                    <Chip key={a} on={rule.access === a} onClick={() => onChange((r) => void ((r as typeof rule).access = a))}>
                      {a === 'hidden' ? 'hide' : 'make read-only'}
                    </Chip>
                  ))}
                </div>
              )}
              <FieldPicker
                selected={rule.fieldIds}
                fields={config.fields}
                onChange={(ids) => onChange((r) => void ((r as typeof rule).fieldIds = ids))}
                verb={rule.type === 'mandatory' ? 'mandatory' : rule.access === 'hidden' ? 'hidden' : 'read-only'}
              />
            </div>
          </div>
        )}

        {rule.type === 'direction' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-xs text-ink-4">Then</span>
            <span className="text-ink-3">the case may only</span>
            <Select
              value={rule.allowed}
              aria-label="Allowed direction"
              className="h-8 w-48"
              onChange={(v) => onChange((r) => void ((r as typeof rule).allowed = v as PhaseEvent))}
              options={(Object.keys(PHASE_EVENT_LABELS) as PhaseEvent[]).map((e) => ({ value: e, label: PHASE_EVENT_LABELS[e].toLowerCase() }))}
            />
            <TextInput value={rule.message} placeholder="Message to the user" className="h-8 min-w-[240px] flex-1" onChange={(e) => onChange((r) => void ((r as typeof rule).message = e.target.value))} />
          </div>
        )}

        {rule.type === 'flowChange' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-xs text-ink-4">Then</span>
            <span className="text-ink-3">send forward to</span>
            <Select
              value={rule.toPhaseId}
              placeholder="— phase —"
              aria-label="Target phase"
              className="h-8 w-56"
              onChange={(v) => onChange((r) => void ((r as typeof rule).toPhaseId = v))}
              options={config.phases.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
        )}

        {rule.type === 'email' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-xs text-ink-4">Notify</span>
              {config.roles.map((role) => (
                <Chip
                  key={role.id}
                  on={rule.recipientRoleIds.includes(role.id)}
                  onClick={() =>
                    onChange((r) => {
                      const e = r as typeof rule
                      e.recipientRoleIds = e.recipientRoleIds.includes(role.id) ? e.recipientRoleIds.filter((x) => x !== role.id) : [...e.recipientRoleIds, role.id]
                    })
                  }
                >
                  {role.name}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-[72px]">
              <TextInput value={rule.subject} placeholder="Subject — [ID] and [Title] are replaced" className="h-8 min-w-[260px] flex-1" onChange={(e) => onChange((r) => void ((r as typeof rule).subject = e.target.value))} />
            </div>
          </div>
        )}

        {rule.type === 'eSignature' && <p className="pl-[72px] text-xs text-ink-3">The user signs with password and meaning before the case moves.</p>}

        {/* Triggers */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-xs text-ink-4">Runs</span>
          {RuleTriggers.filter((t) => t !== 'onAnonymousReporting').map((t) => (
            <Chip
              key={t}
              on={rule.triggers.includes(t)}
              onClick={() => onChange((r) => void (r.triggers = r.triggers.includes(t) ? r.triggers.filter((x) => x !== t) : [...r.triggers, t]))}
            >
              {TRIGGER_LABELS[t]}
            </Chip>
          ))}
          {(rule.type === 'mandatory' || rule.type === 'fieldAccess') && (
            <span className="text-[11px] text-ink-4">· field rules apply live in the form whatever the trigger</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-ink-4">Name</span>
          <TextInput value={rule.name} placeholder="Generated from the rule" className="h-8 max-w-md" onChange={(e) => onChange((r) => void (r.name = e.target.value))} />
          {editable && rule.type !== 'eSignature' && (
            <Select
              value=""
              placeholder="Change type…"
              className="h-8 w-40 text-xs"
              onChange={(v) => v && onReplace({ ...newRule(v as RuleType, rule.id), when: rule.when, triggers: rule.triggers })}
              options={EDITABLE_TYPES.filter((t) => t !== rule.type).map((t) => ({ value: t, label: RULE_TYPE_LABELS[t] }))}
            />
          )}
        </div>
      </div>
    </article>
  )
}

function FieldPicker({ selected, fields, onChange, verb }: { selected: string[]; fields: { id: string; name: string }[]; onChange: (ids: string[]) => void; verb: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((id) => (
        <Chip key={id} on onClick={() => onChange(selected.filter((x) => x !== id))} title="Remove">
          {fields.find((f) => f.id === id)?.name ?? id} ×
        </Chip>
      ))}
      <Select
        value=""
        placeholder={selected.length ? '+ field' : `Choose fields to make ${verb}…`}
        className="h-7 w-56 text-xs"
        onChange={(v) => v && onChange([...selected, v])}
        options={fields.filter((f) => !selected.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
      />
    </div>
  )
}
