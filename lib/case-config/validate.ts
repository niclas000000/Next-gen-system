import { fieldMandatoryInPhase, type CaseTypeConfig } from './schema'

/** Mirrors validateWorkflow in Workshop-tool shared/src/validate.ts, plus checks the runtime depends on. */
export interface ValidationIssue {
  id: string
  /** Designer section where it is fixed */
  section: 'phases' | 'permissions' | 'matrix' | 'fields' | 'rules' | 'basics'
  message: string
  targetId?: string
  /** Errors block publishing; warnings do not. */
  severity: 'error' | 'warning'
}

export function validateCaseType(c: CaseTypeConfig): ValidationIssue[] {
  const out: ValidationIssue[] = []
  const last = c.phases.length - 1
  const fieldIds = new Set(c.fields.map((f) => f.id))
  const roleIds = new Set(c.roles.map((r) => r.id))
  const phaseIds = new Set(c.phases.map((p) => p.id))

  if (c.phases.length === 0)
    out.push({ id: 'no-phases', section: 'phases', severity: 'error', message: 'The case type has no phases' })
  if (!c.prefix.trim())
    out.push({ id: 'no-prefix', section: 'basics', severity: 'warning', message: 'No case number prefix' })

  c.phases.forEach((p, i) => {
    if (p.responsibleRoleIds.length === 0)
      out.push({ id: `phase-owner-${p.id}`, section: 'phases', severity: 'warning', targetId: p.id, message: `Phase “${p.name}” has no responsible role` })
    // The last phase closes the case on forward, so it still needs someone who can send forward
    if (!Object.values(p.permissions).some((perm) => perm.forward || (i === last && perm.preEnd)))
      out.push({ id: `phase-forward-${p.id}`, section: 'permissions', severity: 'error', targetId: p.id, message: `No role can send the case forward from “${p.name}”` })
    for (const rid of Object.keys(p.permissions))
      if (!roleIds.has(rid))
        out.push({ id: `phase-role-${p.id}-${rid}`, section: 'permissions', severity: 'error', targetId: p.id, message: `Phase “${p.name}” has permissions for a role that does not exist (${rid})` })
    for (const fid of Object.keys(p.fields))
      if (!fieldIds.has(fid))
        out.push({ id: `phase-field-${p.id}-${fid}`, section: 'matrix', severity: 'error', targetId: p.id, message: `Phase “${p.name}” places a field that does not exist (${fid})` })
    for (const r of p.rules) {
      if (r.when && !fieldIds.has(r.when.fieldId))
        out.push({ id: `rule-when-${r.id}`, section: 'rules', severity: 'error', targetId: p.id, message: `A rule in “${p.name}” has a condition on a field that does not exist (${r.when.fieldId})` })
      if ((r.type === 'mandatory' || r.type === 'fieldAccess') && r.fieldIds.some((fid) => !fieldIds.has(fid)))
        out.push({ id: `rule-fields-${r.id}`, section: 'rules', severity: 'error', targetId: p.id, message: `A rule in “${p.name}” refers to a field that does not exist` })
      if (r.type === 'flowChange' && r.toPhaseId && !phaseIds.has(r.toPhaseId))
        out.push({ id: `rule-target-${r.id}`, section: 'rules', severity: 'error', targetId: p.id, message: `A flow change in “${p.name}” points to a phase that no longer exists` })
      if (!r.when && r.condition.trim() && (r.type === 'direction' || r.type === 'flowChange' || r.type === 'mandatory' || r.type === 'fieldAccess'))
        out.push({ id: `rule-freetext-${r.id}`, section: 'rules', severity: 'warning', targetId: p.id, message: `A rule in “${p.name}” has a free-text condition (“${r.condition}”) that the runtime cannot evaluate` })
    }
  })

  for (const f of c.fields) {
    const shownIn = c.phases.filter((p) => p.fields[f.id] && p.fields[f.id].access !== 'hidden')
    if (f.type !== 'delimiter' && f.type !== 'staticText' && shownIn.length === 0 && c.phases.length > 0)
      out.push({ id: `field-hidden-${f.id}`, section: 'matrix', severity: 'warning', targetId: f.id, message: `Field “${f.name}” is never shown in any phase` })
    const editable = c.phases.some((p) => p.fields[f.id]?.access === 'edit')
    const mandatoryWhereEditable = c.phases.some((p) => fieldMandatoryInPhase(f, p))
    if (f.mandatory && !editable && shownIn.length > 0)
      out.push({ id: `field-mandatory-${f.id}`, section: 'matrix', severity: 'warning', targetId: f.id, message: `Mandatory field “${f.name}” is never editable` })
    else if (f.mandatory && editable && !mandatoryWhereEditable)
      out.push({ id: `field-mandatory-${f.id}`, section: 'matrix', severity: 'warning', targetId: f.id, message: `Field “${f.name}” is marked mandatory but is optional in every phase` })
    if ((f.type === 'registryDropdown' || f.type === 'registrySearch') && !c.registries.some((r) => r.id === f.registryId))
      out.push({ id: `field-registry-${f.id}`, section: 'fields', severity: 'error', targetId: f.id, message: `Registry field “${f.name}” has no registry` })
    if (f.assignsRoleId && !roleIds.has(f.assignsRoleId))
      out.push({ id: `field-role-${f.id}`, section: 'fields', severity: 'error', targetId: f.id, message: `Field “${f.name}” assigns a role that does not exist` })
  }

  return out
}

export const hasBlockingIssues = (issues: ValidationIssue[]) => issues.some((i) => i.severity === 'error')
