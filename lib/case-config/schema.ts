import { z } from 'zod'

/**
 * Configuration model for a case type (CANEA ONE "workflow").
 *
 * Mirrors WorkflowConfig in Workshop-tool (CANEA Blueprint), shared/src/workflowConfig.ts,
 * so a configuration designed in Blueprint can be imported here unchanged. Keep the
 * field names and defaults in sync; workshop-only data (comments, change log) is dropped.
 */

export const FieldTypes = [
  'text',
  'textMultiline',
  'checkbox',
  'number',
  'date',
  'registryDropdown',
  'registrySearch',
  'staticText',
  'url',
  'subcase',
  'delimiter',
  'attachments',
  'collapsiblePanel',
  'image',
  'button',
] as const
export const FieldTypeSchema = z.enum(FieldTypes)
export type FieldType = z.infer<typeof FieldTypeSchema>

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text field',
  textMultiline: 'Text field (multi-line)',
  checkbox: 'Checkbox (yes/no)',
  number: 'Number field',
  date: 'Date',
  registryDropdown: 'Registry choice – drop down',
  registrySearch: 'Registry choice – search field',
  staticText: 'Static text',
  url: 'URL',
  subcase: 'Sub case',
  delimiter: 'Delimiter',
  attachments: 'Attachments',
  collapsiblePanel: 'Collapsible panel',
  image: 'Image',
  button: 'Button',
}

/** Field types that hold no case data. */
export const LAYOUT_FIELD_TYPES: FieldType[] = ['staticText', 'delimiter', 'collapsiblePanel', 'image', 'button']

export const RoleKindSchema = z.enum(['user', 'group'])
export type RoleKind = z.infer<typeof RoleKindSchema>

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  /** group = an inbox: several users see the case and one of them is appointed to a user role via an assignment field. */
  kind: RoleKindSchema.default('user'),
})
export type Role = z.infer<typeof RoleSchema>

export const RegistrySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  values: z.array(z.string()).default([]),
  comments: z.string().default(''),
  /** Hierarchy: the values are sub-choices of another registry (e.g. Product sub group → Product group). */
  parentRegistryId: z.string().nullable().default(null),
  /** value → parent value in parentRegistryId */
  parents: z.record(z.string(), z.string()).default({}),
})
export type Registry = z.infer<typeof RegistrySchema>

export const RuleOperators = ['eq', 'neq', 'empty', 'notEmpty'] as const
export const RuleOperatorSchema = z.enum(RuleOperators)
export type RuleOperator = z.infer<typeof RuleOperatorSchema>

export const FieldConditionSchema = z.object({
  fieldId: z.string(),
  operator: RuleOperatorSchema.default('eq'),
  value: z.string().default(''),
})
export type FieldCondition = z.infer<typeof FieldConditionSchema>

/** A field is defined once on the case type and then placed in phases. */
export const FieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: FieldTypeSchema,
  section: z.string().default(''),
  /** Can be overridden per phase. */
  mandatory: z.boolean().default(false),
  registryId: z.string().nullable().default(null),
  multi: z.boolean().default(false),
  comments: z.string().default(''),
  /** Assignment field: the chosen user gets this role on the case. */
  assignsRoleId: z.string().nullable().default(null),
  /**
   * Property category (Nexus extension, CANEA ONE's metadata category): fields in different case types
   * with the same category are one dimension in reports. null = the field name is used.
   */
  propertyCategory: z.string().nullable().default(null),
  /** Sub case field (Nexus extension): the case type it creates, by name. null = a type named like the field. */
  subcaseTypeName: z.string().nullable().default(null),
  /** Sub case field (Nexus extension): the case cannot move on from a phase showing the field while sub cases are open. */
  subcasesMustBeClosed: z.boolean().default(false),
})
export type Field = z.infer<typeof FieldSchema>

export const FieldAccessSchema = z.enum(['hidden', 'readOnly', 'edit'])
export type FieldAccess = z.infer<typeof FieldAccessSchema>

/** How a field appears in a phase. No placement = hidden. */
export const FieldPlacementSchema = z.object({
  access: FieldAccessSchema,
  /** null = inherit from the field */
  mandatory: z.boolean().nullable().default(null),
  /** Other label in this phase; null = the field's name */
  title: z.string().nullable().default(null),
})
export type FieldPlacement = z.infer<typeof FieldPlacementSchema>

/** Per role and phase: Edit, send Forward, send Backward, Pre-end (quick close). */
export const PhasePermissionSchema = z.object({
  edit: z.boolean().default(false),
  forward: z.boolean().default(false),
  backward: z.boolean().default(false),
  preEnd: z.boolean().default(false),
})
export type PhasePermission = z.infer<typeof PhasePermissionSchema>

export const PhaseEventSchema = z.enum(['forward', 'backward', 'preEnd'])
export type PhaseEvent = z.infer<typeof PhaseEventSchema>
export const PHASE_EVENT_LABELS: Record<PhaseEvent, string> = {
  forward: 'Send forward',
  backward: 'Send backward',
  preEnd: 'Pre-end (quick close)',
}

export const RuleTriggers = [
  'onForward',
  'onBackward',
  'onSave',
  'onPreEnd',
  'onAnonymousReporting',
  'onButtonClick',
  'afterSave',
] as const
export const RuleTriggerSchema = z.enum(RuleTriggers)
export type RuleTrigger = z.infer<typeof RuleTriggerSchema>

export const RuleTypes = [
  'email',
  'sms',
  'mandatory',
  'computed',
  'webService',
  'fieldAccess',
  'saveCheckIn',
  'alarm',
  'flowChange',
  'eSignature',
  'direction',
] as const
export type RuleType = (typeof RuleTypes)[number]
export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  email: 'E-mail rule',
  sms: 'SMS rule',
  mandatory: 'Mandatory items',
  computed: 'Computed fields',
  webService: 'Web service call',
  fieldAccess: 'Read/Write protected fields',
  saveCheckIn: 'Save/Check in',
  alarm: 'Alarm rule',
  flowChange: 'Flow change',
  eSignature: 'Electronic signing',
  direction: 'Forced direction',
}

const ruleBase = {
  id: z.string(),
  name: z.string().default(''),
  triggers: z.array(RuleTriggerSchema).default([]),
  /** Structured condition; null = none, or free text in `condition` */
  when: FieldConditionSchema.nullable().default(null),
  condition: z.string().default(''),
  comments: z.string().default(''),
}
const fieldIds = z.array(z.string()).default([])

export const PhaseRuleSchema = z.discriminatedUnion('type', [
  z.object({
    ...ruleBase,
    type: z.literal('email'),
    recipientRoleIds: z.array(z.string()).default([]),
    recipientText: z.string().default(''),
    subject: z.string().default(''),
    message: z.string().default(''),
  }),
  z.object({ ...ruleBase, type: z.literal('mandatory'), fieldIds }),
  z.object({
    ...ruleBase,
    type: z.literal('fieldAccess'),
    fieldIds,
    access: z.enum(['hidden', 'readOnly']).default('hidden'),
  }),
  z.object({ ...ruleBase, type: z.literal('flowChange'), toPhaseId: z.string().default('') }),
  z.object({ ...ruleBase, type: z.literal('eSignature') }),
  z.object({
    ...ruleBase,
    type: z.literal('direction'),
    allowed: PhaseEventSchema.default('forward'),
    message: z.string().default(''),
  }),
  z.object({ ...ruleBase, type: z.literal('sms') }),
  z.object({ ...ruleBase, type: z.literal('computed') }),
  z.object({ ...ruleBase, type: z.literal('webService') }),
  z.object({ ...ruleBase, type: z.literal('saveCheckIn') }),
  z.object({ ...ruleBase, type: z.literal('alarm') }),
])
export type PhaseRule = z.infer<typeof PhaseRuleSchema>
export type RuleOf<T extends RuleType> = Extract<PhaseRule, { type: T }>

/** Form layout per phase: rows in a three-column grid. */
export const LayoutCellSchema = z.object({
  fieldId: z.string(),
  span: z.number().int().min(1).max(3).default(1),
})
export type LayoutCell = z.infer<typeof LayoutCellSchema>

export const LayoutRowSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('header'), title: z.string().default('') }),
  z.object({ id: z.string(), type: z.literal('divider') }),
  z.object({ id: z.string(), type: z.literal('fields'), cells: z.array(LayoutCellSchema).default([]) }),
])
export type LayoutRow = z.infer<typeof LayoutRowSchema>

export const PhaseNotifySchema = z.object({
  mode: z.enum(['allWithPermission', 'roles']).default('allWithPermission'),
  roleIds: z.array(z.string()).default([]),
})

export const PhaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  responsibleRoleIds: z.array(z.string()).default([]),
  /** roleId → permissions */
  permissions: z.record(z.string(), PhasePermissionSchema).default({}),
  /** fieldId → placement. Source of truth for what is shown in the phase. */
  fields: z.record(z.string(), FieldPlacementSchema).default({}),
  /** Empty = generated from the field list */
  layout: z.array(LayoutRowSchema).default([]),
  rules: z.array(PhaseRuleSchema).default([]),
  deadlineDays: z.number().int().positive().nullable().default(null),
  deadlineHours: z.number().int().min(1).max(23).nullable().default(null),
  notify: PhaseNotifySchema.optional(),
})
export type Phase = z.infer<typeof PhaseSchema>

export const ViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  columns: z.array(z.string()).default([]),
  filters: z.string().default(''),
  comments: z.string().default(''),
})

export const SystemRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
  securityLevel: z.number().int().min(1).max(10).default(1),
  permissions: z.array(z.string()).default([]),
})

export const CaseTypeRelationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  relation: z.enum(['parent', 'sub', 'related']),
  description: z.string().default(''),
  targetConfigurationId: z.string().nullable().optional(),
})

export const RequirementRefSchema = z.object({
  standard: z.string(),
  clause: z.string(),
  title: z.string(),
})

export const CaseTypeConfigSchema = z.object({
  caseTypeName: z.string().min(1),
  /** Case number prefix, e.g. "DEV" → DEV1, DEV2 … */
  prefix: z.string().default(''),
  securityLevel: z.number().int().min(1).max(10).default(1),
  description: z.string().default(''),
  roles: z.array(RoleSchema).default([]),
  registries: z.array(RegistrySchema).default([]),
  /** Order here = order in the generated form (grouped by section). */
  fields: z.array(FieldSchema).default([]),
  phases: z.array(PhaseSchema).default([]),
  views: z.array(ViewSchema).default([]),
  systemRoles: z.array(SystemRoleSchema).default([]),
  relatedCaseTypes: z.array(CaseTypeRelationSchema).default([]),
  requirements: z.array(RequirementRefSchema).default([]),
  notes: z.string().default(''),
})
export type CaseTypeConfig = z.infer<typeof CaseTypeConfigSchema>

export function emptyCaseTypeConfig(name = 'New case type'): CaseTypeConfig {
  return CaseTypeConfigSchema.parse({ caseTypeName: name })
}

export function fieldTitleInPhase(field: Field, phase: Phase): string {
  return phase.fields[field.id]?.title ?? field.name
}

export function fieldMandatoryInPhase(field: Field, phase: Phase): boolean {
  const p = phase.fields[field.id]
  if (!p || p.access !== 'edit') return false
  return p.mandatory ?? field.mandatory
}

const OPERATOR_TEXT: Record<RuleOperator, string> = {
  eq: '=',
  neq: '≠',
  empty: 'is empty',
  notEmpty: 'is not empty',
}

/** Readable condition, e.g. `"Product affected?" ≠ Yes`; free text if there is no structured condition. */
export function describeCondition(
  rule: Pick<PhaseRule, 'when' | 'condition'>,
  fields: Pick<Field, 'id' | 'name'>[]
): string {
  if (!rule.when) return rule.condition.trim()
  const { fieldId, operator, value } = rule.when
  const name = fields.find((f) => f.id === fieldId)?.name ?? fieldId
  return operator === 'empty' || operator === 'notEmpty'
    ? `"${name}" ${OPERATOR_TEXT[operator]}`
    : `"${name}" ${OPERATOR_TEXT[operator]} ${value}`
}

/** The rule as CANEA ONE's rule list would name it, e.g. `Hidden fields if "Product affected?" ≠ Yes`. */
export function describeRule(
  rule: PhaseRule,
  config: Pick<CaseTypeConfig, 'fields' | 'phases' | 'roles'>
): string {
  const cond = describeCondition(rule, config.fields)
  const ifCond = cond ? ` if ${cond}` : ''
  switch (rule.type) {
    case 'email': {
      const to = [
        ...rule.recipientRoleIds.map((id) => config.roles.find((r) => r.id === id)?.name ?? id),
        rule.recipientText,
      ]
        .filter(Boolean)
        .join(', ')
      return `E-mail${to ? ` to ${to}` : ''}${rule.subject ? `: ${rule.subject}` : ''}`
    }
    case 'mandatory':
      return `Mandatory fields${ifCond}`
    case 'fieldAccess':
      return `${rule.access === 'readOnly' ? 'Read-only' : 'Hidden'} fields${ifCond}`
    case 'flowChange':
      return `Go to ${config.phases.find((p) => p.id === rule.toPhaseId)?.name ?? '…'}${ifCond}`
    case 'direction':
      return `Must ${PHASE_EVENT_LABELS[rule.allowed].toLowerCase()}${ifCond}`
    default:
      return `${RULE_TYPE_LABELS[rule.type]}${ifCond}`
  }
}

export function ruleTitle(
  rule: PhaseRule,
  config: Pick<CaseTypeConfig, 'fields' | 'phases' | 'roles'>
): string {
  return rule.name.trim() || describeRule(rule, config)
}
