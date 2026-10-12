import { CaseTypeConfigSchema, type CaseTypeConfig } from '../schema'
import deviation from './deviation-pharma.json'
import capa from './capa-pharma.json'
import action from './action.json'
import changeControl from './change-control-pharma.json'

/**
 * The case types Nexus ships with: CANEA reference configurations exported unchanged from
 * Workshop-tool (the JSON files), plus the adjustments Nexus needs to run them. The adjustments
 * are idempotent so they can also be applied to a draft someone has already edited.
 */

/** Canea's "Comments" sub case is replaced by Nexus' built-in comments: hide the field everywhere. */
function hideCommentSubcases(c: CaseTypeConfig) {
  for (const f of c.fields.filter((x) => x.type === 'subcase' && x.name === 'Comments')) {
    for (const p of c.phases) delete p.fields[f.id]
    f.comments = 'Hidden in Nexus — the case page has comments built in.'
  }
}

function adjustDeviation(c: CaseTypeConfig) {
  const capaField = c.fields.find((f) => f.id === 'capa')
  if (capaField) capaField.subcaseTypeName = 'CAPA'
  hideCommentSubcases(c)
}

function adjustCapa(c: CaseTypeConfig) {
  const activities = c.fields.find((f) => f.id === 'activities')
  if (activities) {
    activities.subcaseTypeName = 'Action'
    activities.subcasesMustBeClosed = true
  }
  const cc = c.fields.find((f) => f.id === 'changeControl')
  if (cc) cc.subcaseTypeName = 'Change control'
  hideCommentSubcases(c)
  const qa = c.phases.find((p) => p.id === 'qaApproval')
  const decision = c.fields.find((f) => f.id === 'qaDecision')
  if (qa && decision) {
    for (const r of qa.rules) {
      if (r.id === 'pr-capa-qa-yes') r.when = { fieldId: decision.id, operator: 'eq', value: 'Yes' }
      if (r.id === 'pr-capa-qa-no') r.when = { fieldId: decision.id, operator: 'eq', value: 'No' }
      if (r.when) r.condition = ''
    }
    // "More information needed" is not a value of the decision — QA sends the case back instead
    qa.rules = qa.rules.filter((r) => r.id !== 'fr-1')
  }
  const manager = c.phases.find((p) => p.id === 'managerApproval')
  if (manager) manager.rules = manager.rules.filter((r) => r.id !== 'pr-capa-mgr-dir')
  const implementation = c.phases.find((p) => p.id === 'implementation')
  if (implementation) implementation.rules = implementation.rules.filter((r) => !(r.type === 'flowChange' && !r.when))
}

function adjustChangeControl(c: CaseTypeConfig) {
  const assigns: Record<string, string> = { managerApprover: 'managerApprover', qaApprover: 'qaApprover', changeChangeLeader: 'changeLeader' }
  for (const f of c.fields) if (assigns[f.id]) f.assignsRoleId = assigns[f.id]
  const activities = c.fields.find((f) => f.id === 'activities')
  if (activities) {
    activities.subcaseTypeName = 'Action'
    activities.subcasesMustBeClosed = true
  }
  hideCommentSubcases(c)
  const coordination = c.phases.find((p) => p.id === 'coordination')
  const proceed = c.fields.find((f) => f.id === 'proceed')
  for (const r of coordination?.rules ?? [])
    if (r.id === 'fr-1' && proceed) {
      r.when = { fieldId: proceed.id, operator: 'eq', value: 'No' }
      r.condition = ''
    }
  const qa = c.phases.find((p) => p.id === 'qaApproval')
  const qaDecision = c.fields.find((f) => f.id === 'qaDecision')
  for (const r of qa?.rules ?? [])
    if (r.id === 'pr-cc-qa-no' && qaDecision) {
      r.when = { fieldId: qaDecision.id, operator: 'eq', value: 'No' }
      r.condition = ''
    }
  // CANEA's "backward to <phase>" flow changes: Nexus sends a case back to the previous phase
  for (const p of c.phases) p.rules = p.rules.filter((r) => !(r.type === 'flowChange' && !r.when))
}

function adjustAction(c: CaseTypeConfig) {
  const owner = c.fields.find((f) => f.id === 'actionOwner')
  if (owner) owner.assignsRoleId = 'actionOwner'
}

export const BUILT_IN_CASE_TYPES: { prefix: string; source: unknown; adjust: (c: CaseTypeConfig) => void }[] = [
  { prefix: 'DEV', source: deviation, adjust: adjustDeviation },
  { prefix: 'CAPA', source: capa, adjust: adjustCapa },
  { prefix: 'CC', source: changeControl, adjust: adjustChangeControl },
  { prefix: 'ACT', source: action, adjust: adjustAction },
]

export function builtInConfig(prefix: string): CaseTypeConfig {
  const entry = BUILT_IN_CASE_TYPES.find((t) => t.prefix === prefix)
  if (!entry) throw new Error(`No built-in case type ${prefix}`)
  const config = CaseTypeConfigSchema.parse(structuredClone(entry.source))
  entry.adjust(config)
  return config
}

/** Applies the Nexus adjustments for a built-in case type to an existing configuration (idempotent). */
export function adjustBuiltIn(prefix: string, config: CaseTypeConfig): CaseTypeConfig {
  const next = structuredClone(config)
  BUILT_IN_CASE_TYPES.find((t) => t.prefix === prefix)?.adjust(next)
  return next
}
