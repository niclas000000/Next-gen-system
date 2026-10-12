import { existsSync, readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { validateCaseType } from '../validate'
import { convertCaneaExport, type RegistryNode } from './canea-sql'

/** A two-phase export in the format conf-import-tool generates, cut down to what the converter reads. */
const field = (id: number, name: string, render: string, phase: number, opts: { readOnly?: boolean; category?: number; registry?: number } = {}) => `
-- Field: ${name} (${render})
DECLARE @NewItemID_${id} INT
IF @TargetIsNewSchema = 1
BEGIN
INSERT INTO ImproofPhaseItemTypes (
    PhaseTypeID, InfoText, RenderAs, DefaultValue, HelpText,
    IsHidden, IsReadOnly, MetadataCategoryID,
    TextboxRows, IsSingleChoice, RoleTypeIDToSet, UserChoiceReferenceRegistryID
)
SELECT
    pm.NewID,
    '${name}',
    '${render}',
    NULL,
    '',
    0, ${opts.readOnly ? 1 : 0},
    ${opts.category ? `(SELECT NewID FROM @CategoryMap WHERE OldID = ${opts.category})` : 'NULL'},
    3, -- TextboxRows
    1,
    NULL,
    ${opts.registry ? `(SELECT NewID FROM @RegistryMap WHERE OldID = ${opts.registry})` : 'NULL'}
FROM @PhaseMap pm WHERE pm.OldID = ${phase}
END
SET @NewItemID_${id} = SCOPE_IDENTITY()
INSERT INTO @ItemMap VALUES (${id}, @NewItemID_${id}, '${render}', NULL)
`

const WORKFLOW = `-- Source: Complaint (ID: 7)
INSERT @RegistryMap VALUES (10, 'Yes/No', NULL) -- ?? FILL IN NewID
INSERT @CategoryMap VALUES (500, N'Product affected', NULL) -- ?? Fyll i NewID
INSERT @CategoryMap VALUES (501, N'Batch', NULL) -- ?? Fyll i NewID
INSERT @RoleMap VALUES (1, N'Creator',
    NULL)
INSERT @RoleMap VALUES (2, N'Complaint owner',
    NULL)
INSERT INTO ImproofCaseTypes (
    Name, CasePrefix
)
VALUES (
    'Complaint_IMPORT',
    'CMP',
    1
)
-- Phase: Register
DECLARE @NewPhaseID_1 INT
INSERT INTO ImproofPhaseTypes (Name, InternalName)
VALUES ('Register', 'Complaint - 1. Register')
-- Phase: Handle
DECLARE @NewPhaseID_2 INT
INSERT INTO ImproofPhaseTypes (Name, InternalName)
VALUES ('Handle', 'Complaint - 2. Handle')
SELECT @NewCaseTypeID, NewID, 0, 0, 1
FROM @PhaseMap WHERE OldID = 1
INSERT INTO @CasePhaseMap VALUES (11, @NewCasePhaseID_11, 1)
SELECT @NewCaseTypeID, NewID, 1, 0, 1
FROM @PhaseMap WHERE OldID = 2
INSERT INTO @CasePhaseMap VALUES (12, @NewCasePhaseID_12, 2)
${field(100, 'Product affected?', 'UserChoice', 1, { category: 500, registry: 10 })}
${field(101, 'Batch number', 'TextBox', 1, { category: 501 })}
${field(200, 'Product affected?', 'UserChoice', 2, { category: 500, registry: 10, readOnly: true })}
${field(201, 'Batch no.', 'TextBox', 2, { category: 501, readOnly: true })}
INSERT INTO @RoleItemMap VALUES (21, @NewRoleItemID_21, 1)
INSERT INTO @RoleItemMap VALUES (22, @NewRoleItemID_22, 2)
SELECT ri.NewID, cp.NewID, 1, 0, 1, 0
FROM @RoleItemMap ri, @CasePhaseMap cp
WHERE ri.OldID = 21 AND cp.OldID = 11
SELECT ri.NewID, cp.NewID, 1, 1, 1, 1
FROM @RoleItemMap ri, @CasePhaseMap cp
WHERE ri.OldID = 22 AND cp.OldID = 12
`

const rule = (id: number, name: string, type: string, phase: string, opts: { forward?: number; value1?: string; cond?: [number, number, number]; ids: [number, number][] }) => `
-- Regel: ${type} | ${name}
IF NOT EXISTS (SELECT 1 FROM X WHERE PT.InternalName = N'${phase}')
BEGIN
DECLARE @NewRuleID_${id} INT
INSERT INTO ImproofRules (
    Name, RuleType, CaseTypePhaseID,
    ApplyOnForward, ApplyOnBack, ApplyOnEnd, ApplyOnSave, ApplyOnButtonEvent, ApplyOnAnonymousReport,
    EvalAfterSave, Value1
)
SELECT
    N'${name}',
    N'${type}',
    (SELECT TOP 1 CTP._caseTypePhaseID FROM X WHERE PT.InternalName = N'${phase}'),
    ${opts.forward ?? 0}, 0, 0, 0, 0, 0,
    0,
    ${opts.value1 ? `N'${opts.value1}'` : 'NULL'}
SET @NewRuleID_${id} = SCOPE_IDENTITY()
${opts.cond ? `INSERT INTO ImproofRuleConditions (RuleID, PhaseItemTypeID, ConstraintType, Value, RegistryItemID, DataType)
VALUES (
    @NewRuleID_${id},
    @CondField_${id}_${opts.cond[0]},
    ${opts.cond[1]},
    NULL,
    (SELECT TOP 1 NewID FROM @ConditionRegistryMap WHERE OldID = ${opts.cond[2]}),
    8
)` : ''}
${opts.ids.map(([t, item]) => `    INSERT INTO ImproofRuleIDs (RuleID, ID, IDType, [Key])\n    VALUES (@NewRuleID_${id}, @RIDVal_${id}_${t}_${item}, ${t}, N'')`).join('\n')}
END
`

const RULES = [
  rule(1, 'Mandatory fields (forward)', 'CheckValueRule', 'Complaint - 1. Register', { forward: 1, ids: [[2, 100]] }),
  rule(2, 'Hidden fields if "Product affected?" != Yes', 'ProtectedFieldRule', 'Complaint - 1. Register', { value1: 'False', cond: [100, 4, 11], ids: [[1, 101]] }),
].join('')

const REGISTRY: RegistryNode[] = [
  { id: 10, name: 'Yes/No', path: '1.6.10', active: true },
  { id: 11, name: 'Yes', path: '1.6.10.11', active: true },
  { id: 12, name: 'No', path: '1.6.10.12', active: true },
]

describe('convertCaneaExport', () => {
  const { config, report } = convertCaneaExport(WORKFLOW, RULES, REGISTRY)

  it('reads the case type, phases in order and roles', () => {
    expect(config.caseTypeName).toBe('Complaint')
    expect(config.prefix).toBe('CMP')
    expect(config.phases.map((p) => p.name)).toEqual(['Register', 'Handle'])
    expect(config.roles.map((r) => r.name)).toEqual(['Creator', 'Complaint owner'])
  })

  it('merges items with the same property category into one field placed per phase', () => {
    expect(config.fields.map((f) => f.name)).toEqual(['Product affected?', 'Batch number'])
    const [register, handle] = config.phases
    expect(register.fields.batchNumber.access).toBe('edit')
    expect(handle.fields.batchNumber).toEqual({ access: 'readOnly', mandatory: null, title: 'Batch no.' })
  })

  it('maps the permission matrix, with CanEnd as quick close', () => {
    expect(config.phases[0].permissions.creator).toEqual({ edit: true, forward: true, backward: false, preEnd: false })
    expect(config.phases[1].permissions.complaintOwner).toEqual({ edit: true, forward: true, backward: true, preEnd: true })
  })

  it('takes registry values from the registry export', () => {
    expect(config.registries.find((r) => r.id === 'r-yesNo')?.values).toEqual(['Yes', 'No'])
  })

  it('turns rules into mandatory placements and conditional field access', () => {
    expect(config.phases[0].fields.productAffected.mandatory).toBe(true)
    const hidden = config.phases[0].rules.find((r) => r.type === 'fieldAccess')
    expect(hidden).toMatchObject({ access: 'hidden', fieldIds: ['batchNumber'], when: { fieldId: 'productAffected', operator: 'neq', value: 'Yes' } })
    expect(report.skipped).toEqual([])
  })

  it('produces a configuration that can be published', () => {
    expect(validateCaseType(config).filter((i) => i.severity === 'error')).toEqual([])
  })
})

// The real Deviation [NEW] export is customer data and stays out of git — test it when it is present
const real = ['wf_dev.txt', 'wf_dev_rules.txt'].every((f) => existsSync(f))
describe.skipIf(!real)('Deviation [NEW] export', () => {
  it('converts without blocking validation errors', () => {
    const { config } = convertCaneaExport(readFileSync('wf_dev.txt', 'utf8'), readFileSync('wf_dev_rules.txt', 'utf8'), null)
    expect(config.phases).toHaveLength(4)
    expect(config.phases[1].rules.some((r) => r.type === 'direction')).toBe(true)
  })
})
