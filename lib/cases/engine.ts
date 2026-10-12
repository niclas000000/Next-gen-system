import { LAYOUT_FIELD_TYPES, type CaseTypeConfig, type Phase, type PhasePermission } from '@/lib/case-config/schema'
import {
  blockingDirectionRule,
  fieldStates,
  firingRules,
  missingMandatory,
  nextPhaseId,
  PERMISSION_FOR,
  previousPhaseId,
  requiresSignature,
  TRIGGER_FOR,
  type CaseMove,
  type CaseValues,
  type FieldState,
} from '@/lib/case-config/runtime'

/**
 * Case behaviour from a user's point of view. Pure: takes a snapshot of the case and returns
 * what the user may do and what a save or move changes. lib/cases/service.ts persists it.
 */

export type CaseStatus = 'open' | 'closed' | 'preClosed' | 'cancelled'

/** Who holds a role in this environment, outside the portable config. */
export interface RoleBinding {
  userIds: string[]
  groupIds: string[]
}
export type RoleBindings = Record<string, RoleBinding>

export interface CaseSnapshot {
  phaseId: string
  status: CaseStatus
  values: CaseValues
  /** roleId → user ids holding it on this case */
  roles: Record<string, string[]>
  /** Sub case field → how many of its sub cases are still open */
  openSubcases?: Record<string, number>
}

export interface Actor {
  id: string
  groupIds: string[]
}

export interface CaseContext {
  config: CaseTypeConfig
  bindings: RoleBindings
  snapshot: CaseSnapshot
  actor: Actor
}

export type CaseActionName = 'save' | CaseMove | 'take'
export interface ActionState {
  allowed: boolean
  /** Why it is not allowed, shown on the disabled button */
  reason?: string
  /** Moves only: the user must sign electronically */
  signature?: boolean
  /** forward only: closes the case (last phase) */
  closes?: boolean
}

export interface Notice {
  roleIds: string[]
  subject: string
  message: string
}

const NO_PERMISSION: PhasePermission = { edit: false, forward: false, backward: false, preEnd: false }

export function currentPhase(config: CaseTypeConfig, snapshot: Pick<CaseSnapshot, 'phaseId'>): Phase {
  const phase = config.phases.find((p) => p.id === snapshot.phaseId)
  if (!phase) throw new Error(`Phase ${snapshot.phaseId} does not exist in this version`)
  return phase
}

/** Users bound to a role: directly on the case, or through the environment's role bindings (users and groups). */
export function roleHolders(
  roleId: string,
  roles: CaseSnapshot['roles'],
  bindings: RoleBindings,
  groupMembers: Record<string, string[]>
): string[] {
  const b = bindings[roleId]
  const ids = new Set([...(roles[roleId] ?? []), ...(b?.userIds ?? [])])
  for (const g of b?.groupIds ?? []) for (const u of groupMembers[g] ?? []) ids.add(u)
  return [...ids]
}

export function actorRoleIds(ctx: Pick<CaseContext, 'config' | 'bindings' | 'snapshot' | 'actor'>): string[] {
  const { config, bindings, snapshot, actor } = ctx
  return config.roles
    .filter((r) => {
      if (snapshot.roles[r.id]?.includes(actor.id)) return true
      const b = bindings[r.id]
      return !!b && (b.userIds.includes(actor.id) || b.groupIds.some((g) => actor.groupIds.includes(g)))
    })
    .map((r) => r.id)
}

export function permissionIn(phase: Phase, roleIds: string[]): PhasePermission {
  return roleIds.reduce<PhasePermission>((acc, id) => {
    const p = phase.permissions[id]
    if (!p) return acc
    return { edit: acc.edit || p.edit, forward: acc.forward || p.forward, backward: acc.backward || p.backward, preEnd: acc.preEnd || p.preEnd }
  }, NO_PERMISSION)
}

/**
 * Read-only for fields the actor may not change: everything when the case is closed or the
 * actor cannot edit, and for group roles everything except the assignment field that hands the
 * case on (CANEA ONE: "the group may only edit 'Select deviation leader'"). Mutates `states`.
 * Pure on config + permission, so the case page can apply it to live states while typing.
 */
export function restrictForActor(
  config: CaseTypeConfig,
  phase: Phase,
  states: Map<string, FieldState>,
  perm: PhasePermission,
  roleIds: string[],
  status: CaseStatus
): Map<string, FieldState> {
  const userRoleEdit = roleIds.some((id) => phase.permissions[id]?.edit && config.roles.find((r) => r.id === id)?.kind !== 'group')
  for (const f of config.fields) {
    const s = states.get(f.id)!
    const assignsResponsible = !!f.assignsRoleId && phase.responsibleRoleIds.includes(f.assignsRoleId)
    if (status !== 'open' || !perm.edit || (!userRoleEdit && !assignsResponsible)) s.readOnly = true
    if (s.readOnly) s.mandatory = false
  }
  return states
}

export function actorFieldStates(ctx: CaseContext): Map<string, FieldState> {
  const { config, snapshot } = ctx
  const phase = currentPhase(config, snapshot)
  const roleIds = actorRoleIds(ctx)
  return restrictForActor(config, phase, fieldStates(config, phase, snapshot.values), permissionIn(phase, roleIds), roleIds, snapshot.status)
}

/** The assignment field a group member uses to take the case (sets the phase's responsible role). */
function takeField(ctx: CaseContext) {
  const phase = currentPhase(ctx.config, ctx.snapshot)
  return ctx.config.fields.find(
    (f) => f.assignsRoleId && phase.responsibleRoleIds.includes(f.assignsRoleId) && phase.fields[f.id]?.access === 'edit'
  )
}

function names(fields: { name: string }[], max = 3): string {
  const shown = fields.slice(0, max).map((f) => f.name).join(', ')
  return fields.length > max ? `${shown} and ${fields.length - max} more` : shown
}

/** Whether each move is possible, and why not — pure, so the case page re-evaluates it while typing. */
export function moveStates(
  config: CaseTypeConfig,
  phase: Phase,
  perm: PhasePermission,
  status: CaseStatus,
  values: CaseValues,
  openSubcases: Record<string, number> = {}
): Record<CaseMove, ActionState> {
  const last = config.phases[config.phases.length - 1]?.id === phase.id
  const move = (m: CaseMove): ActionState => {
    if (status !== 'open') return { allowed: false, reason: 'The case is closed' }
    if (!perm[PERMISSION_FOR[m]]) return { allowed: false, reason: 'You do not have permission for this in the current phase' }
    if (m === 'backward' && !previousPhaseId(config, phase)) return { allowed: false, reason: 'This is the first phase' }
    const direction = blockingDirectionRule(config, phase, m, values)
    if (direction) return { allowed: false, reason: direction.message || 'Not allowed in this situation' }
    if (m !== 'backward') {
      const missing = missingMandatory(config, phase, values)
      if (missing.length) return { allowed: false, reason: `Fill in ${names(missing)}` }
      const states = fieldStates(config, phase, values)
      const blocking = config.fields.find((f) => f.subcasesMustBeClosed && (openSubcases[f.id] ?? 0) > 0 && states.get(f.id)?.visible)
      if (blocking) return { allowed: false, reason: `Close the open ${blocking.name} sub case${openSubcases[blocking.id] > 1 ? 's' : ''} first` }
    }
    return {
      allowed: true,
      signature: requiresSignature(config, phase, m, values),
      ...(m === 'forward' ? { closes: last || nextPhaseId(config, phase, values) === null } : {}),
    }
  }
  return { forward: move('forward'), backward: move('backward'), preEnd: move('preEnd') }
}

export function allowedActions(ctx: CaseContext): Record<CaseActionName, ActionState> {
  const { config, snapshot, actor } = ctx
  const phase = currentPhase(config, snapshot)
  const roleIds = actorRoleIds(ctx)
  const perm = permissionIn(phase, roleIds)
  const closedReason = snapshot.status === 'open' ? null : 'The case is closed'

  const moves = moveStates(config, phase, perm, snapshot.status, snapshot.values, snapshot.openSubcases)
  const field = takeField(ctx)
  const holders = field?.assignsRoleId ? snapshot.roles[field.assignsRoleId] ?? [] : []
  const take: ActionState = closedReason
    ? { allowed: false, reason: closedReason }
    : !field || !perm.edit
      ? { allowed: false, reason: 'Nothing to take in this phase' }
      : holders.includes(actor.id)
        ? { allowed: false, reason: 'You already hold the case' }
        : { allowed: true }

  return {
    save: closedReason ? { allowed: false, reason: closedReason } : perm.edit ? { allowed: true } : { allowed: false, reason: 'You cannot edit the case in this phase' },
    ...moves,
    take,
  }
}

export interface SaveResult {
  values: CaseValues
  roles: CaseSnapshot['roles']
  changed: string[]
  /** Fields in the patch the actor may not change; ignored */
  rejected: string[]
  /** roleId → new holder, from assignment fields */
  assigned: Record<string, string[]>
}

/**
 * Applies a patch of values, keeping only fields the actor may edit; assignment fields set roles.
 * Field states depend on values (e.g. a field shown only when another = Yes), so fields are
 * accepted in passes until nothing more becomes editable — order in the patch does not matter.
 */
export function applySave(ctx: CaseContext, patch: CaseValues): SaveResult {
  const values = { ...ctx.snapshot.values }
  const roles = { ...ctx.snapshot.roles }
  const changed: string[] = []
  const assigned: Record<string, string[]> = {}
  let pending = Object.keys(patch)

  for (let progress = true; progress && pending.length; ) {
    progress = false
    const states = actorFieldStates({ ...ctx, snapshot: { ...ctx.snapshot, values } })
    pending = pending.filter((fieldId) => {
      const field = ctx.config.fields.find((f) => f.id === fieldId)
      const s = states.get(fieldId)
      // Sub case lists are kept by the server when sub cases are created
      if (!field || LAYOUT_FIELD_TYPES.includes(field.type) || field.type === 'subcase' || !s?.visible || s.readOnly) return true
      progress = true
      const value = patch[fieldId]
      if (JSON.stringify(values[fieldId] ?? null) === JSON.stringify(value)) return false
      values[fieldId] = value
      changed.push(fieldId)
      if (field.assignsRoleId) {
        const holder = (Array.isArray(value) ? value : [value]).filter(Boolean)
        roles[field.assignsRoleId] = holder
        assigned[field.assignsRoleId] = holder
      }
      return false
    })
  }
  return { values, roles, changed, rejected: pending, assigned }
}

/** Taking the case: fills the assignment field with the actor, which gives them the responsible role. */
export function applyTake(ctx: CaseContext): SaveResult {
  const field = takeField(ctx)
  if (!field) throw new Error('Nothing to take in this phase')
  return applySave(ctx, { [field.id]: field.multi ? [ctx.actor.id] : ctx.actor.id })
}

export type MoveResult =
  | { ok: false; reason: string }
  | { ok: true; phaseId: string; status: CaseStatus; signature: boolean; notices: Notice[] }

/** Validates and plans a move from the current snapshot (values already saved). */
export function planMove(ctx: CaseContext, move: CaseMove): MoveResult {
  const state = allowedActions(ctx)[move]
  if (!state.allowed) return { ok: false, reason: state.reason ?? 'Not allowed' }
  const { config, snapshot } = ctx
  const phase = currentPhase(config, snapshot)

  let phaseId = phase.id
  let status: CaseStatus = 'open'
  if (move === 'forward') {
    const next = nextPhaseId(config, phase, snapshot.values)
    if (next) phaseId = next
    else status = 'closed'
  } else if (move === 'backward') {
    phaseId = previousPhaseId(config, phase)!
  } else {
    status = 'preClosed'
  }

  return { ok: true, phaseId, status, signature: !!state.signature, notices: emailNotices(ctx, phase, TRIGGER_FOR[move]) }
}

export function emailNotices(ctx: CaseContext, phase: Phase, trigger: Parameters<typeof firingRules>[2]): Notice[] {
  return firingRules(ctx.config, phase, trigger, ctx.snapshot.values).flatMap((r) =>
    r.type === 'email' ? [{ roleIds: r.recipientRoleIds, subject: r.subject, message: r.message }] : []
  )
}

/** Who has the case now: holders of roles that may send it forward, else of the responsible roles. */
export function phaseHolderRoleIds(config: CaseTypeConfig, phase: Phase): string[] {
  const fwd = config.roles.filter((r) => phase.permissions[r.id]?.forward).map((r) => r.id)
  return fwd.length ? fwd : phase.responsibleRoleIds
}

/** Whether the actor may create a sub case from this field now (editable sub case field in the current phase). */
export function canCreateSubcase(ctx: CaseContext, fieldId: string): boolean {
  const field = ctx.config.fields.find((f) => f.id === fieldId)
  const state = actorFieldStates(ctx).get(fieldId)
  return !!field && field.type === 'subcase' && ctx.snapshot.status === 'open' && !!state?.visible && !state.readOnly
}

/** The case type a sub case field creates: its configured name, else a type named like the field. */
export function subcaseTypeName(field: { name: string; subcaseTypeName: string | null }): string {
  return field.subcaseTypeName ?? field.name
}

/** Initial roles and values when a case is created: the creator gets the user roles that work the first phase. */
export function initialCase(config: CaseTypeConfig, bindings: RoleBindings, creatorId: string, now: Date): CaseSnapshot {
  const first = config.phases[0]
  const roles: CaseSnapshot['roles'] = {}
  for (const r of config.roles) {
    const p = first.permissions[r.id]
    if (r.kind === 'user' && p && (p.edit || p.forward) && !bindings[r.id]) roles[r.id] = [creatorId]
  }
  // CANEA ONE fills read-only registration fields automatically: timestamp and registering user
  const values: CaseValues = {}
  for (const f of config.fields) {
    if (first.fields[f.id]?.access !== 'readOnly') continue
    if (f.type === 'date') values[f.id] = now.toISOString()
    if (f.type === 'registrySearch') values[f.id] = creatorId
  }
  return { phaseId: first.id, status: 'open', values, roles }
}
