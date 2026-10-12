import { describe, expect, it } from 'vitest'
import deviationJson from '@/lib/case-config/fixtures/deviation-pharma.json'
import { CaseTypeConfigSchema } from '@/lib/case-config/schema'
import { missingMandatory, type CaseValues } from '@/lib/case-config/runtime'
import {
  actorFieldStates,
  allowedActions,
  applySave,
  applyTake,
  currentPhase,
  initialCase,
  planMove,
  type Actor,
  type CaseContext,
  type CaseSnapshot,
  type RoleBindings,
} from './engine'

const config = CaseTypeConfigSchema.parse(deviationJson)
const bindings: RoleBindings = {
  deviationLeaderGroup: { userIds: [], groupIds: ['g-leaders'] },
  qaAssessorGroup: { userIds: [], groupIds: ['g-qa'] },
}
const anna: Actor = { id: 'anna', groupIds: [] }
const erik: Actor = { id: 'erik', groupIds: ['g-leaders'] }
const sara: Actor = { id: 'sara', groupIds: ['g-qa'] }
const mallory: Actor = { id: 'mallory', groupIds: [] }

const ctx = (snapshot: CaseSnapshot, actor: Actor): CaseContext => ({ config, bindings, snapshot, actor })

/** Fills every mandatory field in the current phase with a plausible value. */
function fill(c: CaseContext, overrides: CaseValues = {}): CaseValues {
  const phase = currentPhase(config, c.snapshot)
  const patch: CaseValues = { ...overrides }
  for (const f of missingMandatory(config, phase, { ...c.snapshot.values, ...overrides })) {
    const reg = config.registries.find((r) => r.id === f.registryId)
    const v = f.type === 'date' ? '2026-10-12' : reg?.values[0] ?? `${f.name} text`
    patch[f.id] = f.multi ? [v] : v
  }
  return patch
}

/** Saves a patch and moves, like the case page's "Send forward" button. */
function step(snapshot: CaseSnapshot, actor: Actor, move: 'forward' | 'backward' | 'preEnd', overrides: CaseValues = {}) {
  const saved = applySave(ctx(snapshot, actor), move === 'backward' ? overrides : fill(ctx(snapshot, actor), overrides))
  const after = { ...snapshot, values: saved.values, roles: saved.roles }
  const result = planMove(ctx(after, actor), move)
  if (!result.ok) throw new Error(result.reason)
  return { snapshot: { ...after, phaseId: result.phaseId, status: result.status }, result }
}

const created = () => initialCase(config, bindings, 'anna', new Date('2026-10-12T08:00:00Z'))
const basics: CaseValues = { productAffected: 'No', analysisAffected: 'No' }

/** Registration done, deviation leader taken by Erik. */
function inCoordinationWithLeader() {
  const { snapshot } = step(created(), anna, 'forward', basics)
  const taken = applyTake(ctx(snapshot, erik))
  return { ...snapshot, values: taken.values, roles: taken.roles }
}

describe('creating a case', () => {
  it('gives the creator the initiator role and fills automatic registration fields', () => {
    const c = created()
    expect(c.phaseId).toBe('registration')
    expect(c.roles.initiator).toEqual(['anna'])
    expect(c.values.reporter).toBe('anna')
    expect(c.values.caseCreated).toBe('2026-10-12T08:00:00.000Z')
  })
})

describe('Deviation — observation is quick-closed in coordination', () => {
  it('runs registration → coordination → pre-closed with e-signature', () => {
    let s = created()
    expect(allowedActions(ctx(s, anna)).forward).toMatchObject({ allowed: false, reason: expect.stringContaining('Fill in') })

    const reg = step(s, anna, 'forward', basics)
    expect(reg.snapshot.phaseId).toBe('coordination')
    expect(reg.result.ok && reg.result.notices[0].roleIds).toEqual(['deviationLeaderGroup'])

    s = inCoordinationWithLeader()
    expect(s.roles.deviationLeader).toEqual(['erik'])

    const values = fill(ctx(s, erik), { initialClassification: 'Observation' })
    const saved = applySave(ctx(s, erik), values)
    s = { ...s, values: saved.values }

    const actions = allowedActions(ctx(s, erik))
    expect(actions.forward).toEqual({ allowed: false, reason: 'Observations are closed here – use quick close.' })
    // "Observation – additional correction" becomes mandatory and shown
    expect(actions.preEnd).toMatchObject({ allowed: false, reason: expect.stringContaining('Observation – additional correction') })

    const closed = step(s, erik, 'preEnd', { observationCorrection: 'Re-labelled the batch' })
    expect(closed.snapshot.status).toBe('preClosed')
    expect(closed.result.ok && closed.result.signature).toBe(true)
  })
})

describe('Deviation — major deviation goes all the way', () => {
  it('runs through all four phases and closes from QA with e-signature', () => {
    let s = inCoordinationWithLeader()
    // Not classified as Observation → forced direction forbids quick close
    expect(allowedActions(ctx(s, erik)).preEnd).toEqual({
      allowed: false,
      reason: 'Deviations must be sent forward for root cause investigation.',
    })

    s = step(s, erik, 'forward', { initialClassification: 'Major deviation' }).snapshot
    expect(s.phaseId).toBe('rootCause')

    const rca = step(s, erik, 'forward', { classification: 'Major deviation', errorCode: 'E-12' })
    expect(rca.result.ok && rca.result.signature).toBe(true)
    s = rca.snapshot
    expect(s.phaseId).toBe('qaAssessment')

    s = { ...s, ...applyTake(ctx(s, sara)) }
    const qa = step(s, sara, 'forward')
    expect(qa.snapshot.status).toBe('closed')
    expect(qa.result.ok && qa.result.signature).toBe(true)
  })

  it('lets QA send the case back to root cause investigation', () => {
    let s = inCoordinationWithLeader()
    s = step(s, erik, 'forward', { initialClassification: 'Minor deviation' }).snapshot
    s = step(s, erik, 'forward', { classification: 'Minor deviation', errorCode: 'E-1' }).snapshot
    s = { ...s, ...applyTake(ctx(s, sara)) }
    const back = step(s, sara, 'backward')
    expect(back.snapshot.phaseId).toBe('rootCause')
    expect(back.snapshot.status).toBe('open')
  })
})

describe('field states and permissions', () => {
  it('hides product fields unless "Product/material affected?" = Yes', () => {
    const s = created()
    expect(actorFieldStates(ctx(s, anna)).get('batchNumber')!.visible).toBe(false)
    const withYes = { ...s, values: { ...s.values, productAffected: 'Yes' } }
    expect(actorFieldStates(ctx(withYes, anna)).get('batchNumber')!.visible).toBe(true)
  })

  it('shows registration fields read-only in later phases', () => {
    const s = inCoordinationWithLeader()
    expect(actorFieldStates(ctx(s, erik)).get('problem')).toMatchObject({ visible: true, readOnly: true })
  })

  it('lets the group only edit the assignment field', () => {
    const { snapshot } = step(created(), anna, 'forward', basics)
    const states = actorFieldStates(ctx(snapshot, erik))
    expect(states.get('deviationLeader')!.readOnly).toBe(false)
    expect(states.get('ownership')!.readOnly).toBe(true)
    expect(allowedActions(ctx(snapshot, erik)).forward.allowed).toBe(false)
    expect(allowedActions(ctx(snapshot, erik)).take.allowed).toBe(true)
  })

  it('denies users without a role', () => {
    const s = created()
    const actions = allowedActions(ctx(s, mallory))
    expect(actions.save.allowed).toBe(false)
    expect(actions.forward.allowed).toBe(false)
    const saved = applySave(ctx(s, mallory), { problem: 'hijack' })
    expect(saved.changed).toEqual([])
    expect(saved.rejected).toEqual(['problem'])
  })

  it('ignores read-only and layout fields in a save', () => {
    const s = created()
    const saved = applySave(ctx(s, anna), { reporter: 'mallory', productAffectedBtn: 'x', problem: 'Spill' })
    expect(saved.changed).toEqual(['problem'])
    expect(saved.rejected.sort()).toEqual(['productAffectedBtn', 'reporter'])
  })

  it('offers nothing once the case is closed', () => {
    const s = { ...created(), status: 'closed' as const }
    expect(Object.values(allowedActions(ctx(s, anna))).every((a) => !a.allowed)).toBe(true)
  })
})
