import type { CaseTypeConfig, Field, FieldType, LayoutRow, Phase } from './schema'

/** Form layout helpers, ported from Workshop-tool shared/src/layout.ts and phaseFields.ts. */

export const LAYOUT_COLUMNS = 3

const WIDE_TYPES: ReadonlySet<FieldType> = new Set([
  'textMultiline',
  'staticText',
  'collapsiblePanel',
  'subcase',
  'attachments',
  'image',
])

export function defaultSpan(field: Field): number {
  return WIDE_TYPES.has(field.type) ? LAYOUT_COLUMNS : 1
}

let counter = 0
export function layoutId(prefix = 'lr'): string {
  counter = (counter + 1) % 1_000_000
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`
}

export function layoutFieldIds(layout: LayoutRow[]): string[] {
  return layout.flatMap((r) => (r.type === 'fields' ? r.cells.map((c) => c.fieldId) : []))
}

/** Fields placed (not hidden) in the phase, in the global field order. */
export function visibleFields(phase: Phase, fields: Field[]): Field[] {
  return fields.filter((f) => phase.fields[f.id] && phase.fields[f.id].access !== 'hidden')
}

function rowSpan(row: Extract<LayoutRow, { type: 'fields' }>): number {
  return row.cells.reduce((s, c) => s + c.span, 0)
}

/** Appends fields to rows; a field goes on the last row if it fits, a header is added when the section changes. */
function appendFields(rows: LayoutRow[], fieldsToAdd: Field[]): LayoutRow[] {
  const out = [...rows]
  let lastSection: string | null = null
  for (const r of out) if (r.type === 'header') lastSection = r.title
  for (const f of fieldsToAdd) {
    const span = defaultSpan(f)
    if (f.section && f.section !== lastSection) {
      out.push({ id: layoutId(), type: 'header', title: f.section })
      lastSection = f.section
    }
    const last = out[out.length - 1]
    if (last && last.type === 'fields' && rowSpan(last) + span <= LAYOUT_COLUMNS) {
      out[out.length - 1] = { ...last, cells: [...last.cells, { fieldId: f.id, span }] }
    } else {
      out.push({ id: layoutId(), type: 'fields', cells: [{ fieldId: f.id, span }] })
    }
  }
  return out
}

/** Removes cells for fields that are not visible or do not exist, empty rows and duplicates. */
export function normalizeLayout(phase: Phase, fields: Field[]): LayoutRow[] {
  const visible = new Set(visibleFields(phase, fields).map((f) => f.id))
  const seen = new Set<string>()
  const out: LayoutRow[] = []
  for (const r of phase.layout) {
    if (r.type !== 'fields') {
      out.push(r)
      continue
    }
    const cells = r.cells.filter((c) => visible.has(c.fieldId) && !seen.has(c.fieldId) && seen.add(c.fieldId))
    if (cells.length) out.push({ ...r, cells })
  }
  return out
}

/** The designed layout (cleaned, unplaced fields appended), or an automatic one if none is designed. */
export function effectiveLayout(phase: Phase, fields: Field[]): LayoutRow[] {
  if (!phase.layout.length) return appendFields([], visibleFields(phase, fields))
  const placed = new Set(layoutFieldIds(phase.layout))
  return appendFields(
    normalizeLayout(phase, fields),
    visibleFields(phase, fields).filter((f) => !placed.has(f.id))
  )
}

/** The phase where a field is introduced: first phase where it is editable, else first where it is shown. -1 = never shown. */
export function homePhaseIndex(config: Pick<CaseTypeConfig, 'phases'>, fieldId: string): number {
  const edit = config.phases.findIndex((p) => p.fields[fieldId]?.access === 'edit')
  if (edit >= 0) return edit
  return config.phases.findIndex((p) => p.fields[fieldId] && p.fields[fieldId].access !== 'hidden')
}
