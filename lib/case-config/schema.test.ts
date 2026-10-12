import { describe, expect, it } from 'vitest'
import deviationJson from './fixtures/deviation-pharma.json'
import { CaseTypeConfigSchema, describeRule, emptyCaseTypeConfig, fieldMandatoryInPhase } from './schema'
import { hasBlockingIssues, validateCaseType } from './validate'

const deviation = CaseTypeConfigSchema.parse(deviationJson)
const phase = (id: string) => deviation.phases.find((p) => p.id === id)!
const field = (id: string) => deviation.fields.find((f) => f.id === id)!

describe('Deviation reference configuration (EX-26714)', () => {
  it('parses into the case type model', () => {
    expect(deviation.prefix).toBe('DEV')
    expect(deviation.phases.map((p) => p.id)).toEqual(['registration', 'coordination', 'rootCause', 'qaAssessment'])
    expect(deviation.roles.filter((r) => r.kind === 'group').map((r) => r.id)).toEqual(['deviationLeaderGroup', 'qaAssessorGroup'])
  })

  it('places one field in several phases with different access', () => {
    expect(phase('registration').fields.problem.access).toBe('edit')
    expect(phase('coordination').fields.problem.access).toBe('readOnly')
    expect(fieldMandatoryInPhase(field('problem'), phase('registration'))).toBe(true)
    expect(fieldMandatoryInPhase(field('problem'), phase('coordination'))).toBe(false)
  })

  it('has a role × phase permission matrix including backward and pre-end', () => {
    expect(phase('coordination').permissions.deviationLeader).toEqual({ edit: true, forward: true, backward: true, preEnd: true })
    expect(phase('coordination').permissions.deviationLeaderGroup).toEqual({ edit: true, forward: false, backward: false, preEnd: false })
  })

  it('describes conditional rules the way CANEA ONE lists them', () => {
    const hidden = phase('registration').rules.find((r) => r.type === 'fieldAccess')!
    expect(describeRule(hidden, deviation)).toBe('Hidden fields if "Product/material affected?" ≠ Yes')
    const observation = phase('coordination').rules.find((r) => r.id === 'pr-coord-obs')!
    expect(describeRule(observation, deviation)).toBe('Must pre-end (quick close) if "Initial classification" = Observation')
  })

  it('can be published: no blocking validation issues', () => {
    const issues = validateCaseType(deviation)
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    expect(hasBlockingIssues(issues)).toBe(false)
  })
})

describe('validateCaseType', () => {
  it('blocks a case type without phases', () => {
    expect(hasBlockingIssues(validateCaseType(emptyCaseTypeConfig()))).toBe(true)
  })

  it('flags references to things that do not exist', () => {
    const broken = CaseTypeConfigSchema.parse({
      caseTypeName: 'Broken',
      prefix: 'BR',
      fields: [{ id: 'f1', name: 'Severity', type: 'registryDropdown', registryId: 'missing' }],
      phases: [
        {
          id: 'p1',
          name: 'Only phase',
          permissions: { ghost: { forward: true } },
          fields: { f1: { access: 'edit' }, nope: { access: 'edit' } },
          rules: [{ id: 'r1', type: 'mandatory', when: { fieldId: 'gone', operator: 'eq', value: 'x' }, fieldIds: ['f1'] }],
        },
      ],
    })
    const ids = validateCaseType(broken).filter((i) => i.severity === 'error').map((i) => i.id)
    expect(ids).toEqual(
      expect.arrayContaining(['phase-role-p1-ghost', 'phase-field-p1-nope', 'rule-when-r1', 'field-registry-f1'])
    )
  })
})
