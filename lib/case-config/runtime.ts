import { effectiveLayout } from './layout'
import {
  fieldMandatoryInPhase,
  type CaseTypeConfig,
  type Field,
  type LayoutRow,
  type Phase,
  type PhaseEvent,
  type PhasePermission,
  type PhaseRule,
  type RuleTrigger,
} from './schema'

/**
 * What a configuration says about a case with given values: field states, mandatory fields,
 * where the case goes next and what happens on a move. Pure functions, ported from
 * Workshop-tool shared/src/formTrial.ts so Blueprint's "Try the form" and Nexus agree.
 *
 * Only structured conditions (`when`) are evaluated; rules with free-text conditions are ignored.
 */

/** fieldId → value. Checkbox: "Yes"/"No". Multi-choice registry and attachments: list. Users: user id(s). */
export type CaseValues = Record<string, string | string[]>

export interface FieldState {
  visible: boolean
  readOnly: boolean
  mandatory: boolean
}

const norm = (s: string) => s.trim().toLowerCase()

function valueOf(field: Field | undefined, values: CaseValues): string[] {
  const v = field ? values[field.id] : undefined
  if (Array.isArray(v)) return v.filter((x) => x.trim() !== '')
  if (field?.type === 'checkbox') return [v === 'Yes' ? 'Yes' : 'No']
  return v && v.trim() !== '' ? [v] : []
}

export function isEmptyValue(field: Field, values: CaseValues): boolean {
  if (field.type === 'checkbox') return values[field.id] !== 'Yes'
  return valueOf(field, values).length === 0
}

/** No condition = always holds; a free-text-only condition cannot be decided and never holds. */
export function conditionHolds(
  rule: Pick<PhaseRule, 'when' | 'condition'>,
  fields: Field[],
  values: CaseValues
): boolean {
  if (!rule.when) return rule.condition.trim() === ''
  const field = fields.find((f) => f.id === rule.when!.fieldId)
  const current = valueOf(field, values).map(norm)
  const wanted = norm(rule.when.value)
  switch (rule.when.operator) {
    case 'eq':
      return current.includes(wanted)
    case 'neq':
      return !current.includes(wanted)
    case 'empty':
      return current.length === 0
    case 'notEmpty':
      return current.length > 0
  }
}

/** Field state in the phase given the values: placement, conditional field access and conditional mandatory rules. */
export function fieldStates(
  config: Pick<CaseTypeConfig, 'fields'>,
  phase: Phase,
  values: CaseValues
): Map<string, FieldState> {
  const out = new Map<string, FieldState>()
  for (const f of config.fields) {
    const placement = phase.fields[f.id]
    out.set(f.id, {
      visible: !!placement && placement.access !== 'hidden',
      readOnly: placement?.access === 'readOnly',
      mandatory: fieldMandatoryInPhase(f, phase),
    })
  }
  for (const rule of phase.rules) {
    if ((rule.type !== 'fieldAccess' && rule.type !== 'mandatory') || !conditionHolds(rule, config.fields, values)) continue
    for (const id of rule.fieldIds) {
      const s = out.get(id)
      if (!s) continue
      if (rule.type === 'mandatory') s.mandatory = s.visible && !s.readOnly
      else if (rule.access === 'hidden') s.visible = false
      else s.readOnly = true
    }
  }
  for (const s of out.values()) if (!s.visible || s.readOnly) s.mandatory = false
  return out
}

/** Mandatory fields in the phase that are empty — the case cannot be sent on until they are filled in. */
export function missingMandatory(
  config: Pick<CaseTypeConfig, 'fields'>,
  phase: Phase,
  values: CaseValues
): Field[] {
  const states = fieldStates(config, phase, values)
  return config.fields.filter((f) => states.get(f.id)?.mandatory && isEmptyValue(f, values))
}

/** Next phase on forward: first flow change whose condition holds, else the next in order. null = the case closes. */
export function nextPhaseId(
  config: Pick<CaseTypeConfig, 'fields' | 'phases'>,
  phase: Phase,
  values: CaseValues
): string | null {
  for (const rule of phase.rules)
    if (
      rule.type === 'flowChange' &&
      rule.when &&
      rule.toPhaseId &&
      config.phases.some((p) => p.id === rule.toPhaseId) &&
      conditionHolds(rule, config.fields, values)
    )
      return rule.toPhaseId
  const i = config.phases.findIndex((p) => p.id === phase.id)
  return config.phases[i + 1]?.id ?? null
}

export function previousPhaseId(config: Pick<CaseTypeConfig, 'phases'>, phase: Phase): string | null {
  const i = config.phases.findIndex((p) => p.id === phase.id)
  return i > 0 ? config.phases[i - 1].id : null
}

/** The phase form to show: layout without fields that are hidden right now, and without headers left empty. */
export function visibleLayout(
  config: Pick<CaseTypeConfig, 'fields'>,
  phase: Phase,
  values: CaseValues
): LayoutRow[] {
  const states = fieldStates(config, phase, values)
  const rows = effectiveLayout(phase, config.fields).flatMap((r): LayoutRow[] => {
    if (r.type !== 'fields') return [r]
    const cells = r.cells.filter((c) => states.get(c.fieldId)?.visible)
    return cells.length ? [{ ...r, cells }] : []
  })
  return rows.filter((r, i) => {
    if (r.type === 'fields') return true
    const next = rows.slice(i + 1).find((x) => x.type !== 'divider')
    return next?.type === 'fields'
  })
}

export type CaseMove = PhaseEvent

export const TRIGGER_FOR: Record<CaseMove, RuleTrigger> = {
  forward: 'onForward',
  backward: 'onBackward',
  preEnd: 'onPreEnd',
}

export const PERMISSION_FOR: Record<CaseMove, keyof PhasePermission> = {
  forward: 'forward',
  backward: 'backward',
  preEnd: 'preEnd',
}

/** A forced-direction rule that forbids this move, if any (its message explains why). */
export function blockingDirectionRule(
  config: Pick<CaseTypeConfig, 'fields'>,
  phase: Phase,
  move: CaseMove,
  values: CaseValues
): Extract<PhaseRule, { type: 'direction' }> | null {
  for (const rule of phase.rules)
    if (rule.type === 'direction' && rule.allowed !== move && conditionHolds(rule, config.fields, values)) return rule
  return null
}

/** Rules that fire for a trigger in the phase and whose condition holds. */
export function firingRules(
  config: Pick<CaseTypeConfig, 'fields'>,
  phase: Phase,
  trigger: RuleTrigger,
  values: CaseValues
): PhaseRule[] {
  return phase.rules.filter((r) => r.triggers.includes(trigger) && conditionHolds(r, config.fields, values))
}

export function requiresSignature(
  config: Pick<CaseTypeConfig, 'fields'>,
  phase: Phase,
  move: CaseMove,
  values: CaseValues
): boolean {
  return firingRules(config, phase, TRIGGER_FOR[move], values).some((r) => r.type === 'eSignature')
}
