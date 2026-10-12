import { describe, expect, it } from 'vitest'
import { validateCaseType } from '../validate'
import { adjustBuiltIn, BUILT_IN_CASE_TYPES, builtInConfig } from '.'

describe('built-in case types', () => {
  it.each(BUILT_IN_CASE_TYPES.map((t) => t.prefix))('%s can be published', (prefix) => {
    const config = builtInConfig(prefix)
    expect(config.prefix).toBe(prefix)
    expect(validateCaseType(config).filter((i) => i.severity === 'error')).toEqual([])
  })

  it('links the sub case fields to the case types that ship with Nexus', () => {
    expect(builtInConfig('DEV').fields.find((f) => f.id === 'capa')?.subcaseTypeName).toBe('CAPA')
    const activities = builtInConfig('CAPA').fields.find((f) => f.id === 'activities')
    expect(activities).toMatchObject({ subcaseTypeName: 'Action', subcasesMustBeClosed: true })
    expect(builtInConfig('ACT').fields.find((f) => f.id === 'actionOwner')?.assignsRoleId).toBe('actionOwner')
    expect(builtInConfig('CAPA').fields.find((f) => f.id === 'changeControl')?.subcaseTypeName).toBe('Change control')
    expect(builtInConfig('CC').fields.find((f) => f.id === 'activities')?.subcaseTypeName).toBe('Action')
  })

  it('turns the CAPA QA decision into structured direction rules', () => {
    const qa = builtInConfig('CAPA').phases.find((p) => p.id === 'qaApproval')!
    expect(qa.rules.filter((r) => r.type === 'direction').map((r) => [r.when?.value, r.type === 'direction' && r.allowed])).toEqual([
      ['Yes', 'forward'],
      ['No', 'preEnd'],
    ])
  })

  it('gives every phase of change control someone who can act', () => {
    const cc = builtInConfig('CC')
    const assigned = new Set(cc.fields.map((f) => f.assignsRoleId).filter(Boolean))
    for (const p of cc.phases) {
      const actors = Object.entries(p.permissions).filter(([, v]) => v.forward || v.preEnd).map(([k]) => k)
      expect(actors.some((r) => r === 'initiator' || assigned.has(r)), p.id).toBe(true)
    }
    const coordination = cc.phases.find((p) => p.id === 'coordination')!
    expect(coordination.rules.find((r) => r.type === 'flowChange')).toMatchObject({ toPhaseId: 'managerApproval', when: { fieldId: 'proceed', value: 'No' } })
  })

  it('applies the adjustments idempotently', () => {
    for (const { prefix } of BUILT_IN_CASE_TYPES) {
      const once = builtInConfig(prefix)
      expect(adjustBuiltIn(prefix, once)).toEqual(once)
    }
  })
})
