import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/client'
import { CaseTypeConfigSchema, type CaseTypeConfig, type Field } from '@/lib/case-config/schema'
import type { CaseValues } from '@/lib/case-config/runtime'

/**
 * Case reporting. Dimensions are built-in (case type, status, phase, creator) or properties: choice
 * and people fields, merged across case types by property category — or by name when a field has
 * no category (CANEA ONE's "property categories", in a light form).
 */

const DAY = 86_400_000
const DIMENSION_TYPES: Field['type'][] = ['registryDropdown', 'registrySearch', 'checkbox']

export interface Dimension {
  key: string
  name: string
  kind: 'builtin' | 'property'
  /** Case types that have the property */
  caseTypes: string[]
}

export interface ReportFilter {
  caseTypeId?: string
  status?: 'open' | 'closed' | 'all'
  /** Created within the last N days; 0 = all time */
  days?: number
  dimension?: string
  /** Drill-down: only cases with this value in the dimension */
  value?: string
}

const BUILTINS: Dimension[] = [
  { key: 'caseType', name: 'Case type', kind: 'builtin', caseTypes: [] },
  { key: 'status', name: 'Status', kind: 'builtin', caseTypes: [] },
  { key: 'phase', name: 'Current phase', kind: 'builtin', caseTypes: [] },
  { key: 'creator', name: 'Created by', kind: 'builtin', caseTypes: [] },
]

const STATUS_LABEL: Record<string, string> = { open: 'Open', closed: 'Closed', preClosed: 'Closed early', cancelled: 'Cancelled' }
const NONE = '(not set)'

const propertyKey = (f: Field) => `p:${(f.propertyCategory ?? f.name).trim().toLowerCase()}`

/** Property dimensions offered for the given case type configurations. */
export function dimensionsFor(types: { name: string; config: CaseTypeConfig }[]): Dimension[] {
  const props = new Map<string, Dimension>()
  for (const t of types)
    for (const f of t.config.fields) {
      if (!DIMENSION_TYPES.includes(f.type)) continue
      const key = propertyKey(f)
      const d = props.get(key) ?? { key, name: (f.propertyCategory ?? f.name).trim(), kind: 'property' as const, caseTypes: [] }
      if (!d.caseTypes.includes(t.name)) d.caseTypes.push(t.name)
      props.set(key, d)
    }
  // Shared properties first, then alphabetical
  const sorted = [...props.values()].sort((a, b) => b.caseTypes.length - a.caseTypes.length || a.name.localeCompare(b.name))
  return [...BUILTINS, ...sorted]
}

type Row = Prisma.CaseGetPayload<{
  include: { version: { select: { config: true } }; caseType: { select: { name: true } }; creator: { select: { name: true } } }
}>

function valuesOf(row: Row, config: CaseTypeConfig, dimension: string, users: Map<string, string>): string[] {
  switch (dimension) {
    case 'caseType':
      return [row.caseType.name]
    case 'status':
      return [STATUS_LABEL[row.status] ?? row.status]
    case 'phase':
      return [config.phases.find((p) => p.id === row.phaseId)?.name ?? row.phaseId]
    case 'creator':
      return [row.creator.name]
  }
  const field = config.fields.find((f) => DIMENSION_TYPES.includes(f.type) && propertyKey(f) === dimension)
  if (!field) return []
  const raw = (row.values as CaseValues)[field.id]
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean)
  if (field.type === 'checkbox') return [raw === 'Yes' ? 'Yes' : 'No']
  if (!list.length) return [NONE]
  return field.type === 'registrySearch' ? list.map((id) => users.get(id) ?? 'Unknown user') : list
}

/** Days spent in each phase, from the case history (completed visits only). */
async function phaseTimes(caseIds: string[], config: CaseTypeConfig) {
  const events = await prisma.caseEvent.findMany({
    where: { caseId: { in: caseIds }, type: { in: ['created', 'forward', 'backward', 'preEnd'] } },
    orderBy: { at: 'asc' },
    select: { caseId: true, type: true, fromPhaseId: true, toPhaseId: true, at: true },
  })
  const visits: Record<string, number[]> = {}
  const entered = new Map<string, { phaseId: string; at: Date }>()
  for (const e of events) {
    const cur = entered.get(e.caseId)
    if (e.type !== 'created' && cur && e.fromPhaseId === cur.phaseId) (visits[cur.phaseId] ??= []).push((e.at.getTime() - cur.at.getTime()) / DAY)
    if (e.toPhaseId) entered.set(e.caseId, { phaseId: e.toPhaseId, at: e.at })
  }
  return config.phases.map((p) => {
    const d = (visits[p.id] ?? []).sort((a, b) => a - b)
    return {
      phase: p.name,
      count: d.length,
      median: d.length ? d[Math.floor(d.length / 2)] : null,
      average: d.length ? d.reduce((s, x) => s + x, 0) / d.length : null,
      deadlineDays: p.deadlineDays,
    }
  })
}

export async function buildReport(filter: ReportFilter) {
  const now = Date.now()
  const days = filter.days ?? 90
  const types = await prisma.caseType.findMany({
    where: { status: 'published' },
    orderBy: { name: 'asc' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1, select: { config: true } } },
  })
  const typeConfigs = types.map((t) => ({ id: t.id, name: t.name, prefix: t.prefix, config: CaseTypeConfigSchema.parse(t.versions[0]?.config ?? { caseTypeName: t.name }) }))
  const scopeTypes = filter.caseTypeId ? typeConfigs.filter((t) => t.id === filter.caseTypeId) : typeConfigs
  const dimensions = dimensionsFor(scopeTypes)
  const dimension = dimensions.find((d) => d.key === filter.dimension) ?? dimensions.find((d) => d.key === (filter.caseTypeId ? 'phase' : 'caseType'))!

  const where: Prisma.CaseWhereInput = {
    ...(filter.caseTypeId ? { caseTypeId: filter.caseTypeId } : {}),
    ...(days ? { createdAt: { gte: new Date(now - days * DAY) } } : {}),
    ...(filter.status === 'open' ? { status: 'open' } : filter.status === 'closed' ? { status: { in: ['closed', 'preClosed'] } } : {}),
  }
  const [rows, users] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { version: { select: { config: true } }, caseType: { select: { name: true } }, creator: { select: { name: true } } },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ])
  const userNames = new Map(users.map((u) => [u.id, u.name]))
  const configs = new Map<string, CaseTypeConfig>()
  const configOf = (r: Row) => {
    if (!configs.has(r.versionId)) configs.set(r.versionId, CaseTypeConfigSchema.parse(r.version.config))
    return configs.get(r.versionId)!
  }

  const isOverdue = (r: Row) => r.status === 'open' && !!r.phaseDueAt && r.phaseDueAt.getTime() < now
  const closed = rows.filter((r) => r.closedAt && r.status !== 'cancelled')
  const lead = closed.map((r) => (r.closedAt!.getTime() - r.createdAt.getTime()) / DAY).sort((a, b) => a - b)

  // Breakdown by the chosen dimension
  const buckets = new Map<string, { value: string; count: number; open: number; overdue: number }>()
  const matching: Row[] = []
  for (const r of rows) {
    const vals = valuesOf(r, configOf(r), dimension.key, userNames)
    for (const v of vals) {
      const b = buckets.get(v) ?? { value: v, count: 0, open: 0, overdue: 0 }
      b.count++
      if (r.status === 'open') b.open++
      if (isOverdue(r)) b.overdue++
      buckets.set(v, b)
    }
    if (filter.value && vals.includes(filter.value)) matching.push(r)
  }
  const breakdown = [...buckets.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

  // Created and closed per month: the last 6 months, or the period when shorter
  const months: { key: string; label: string; created: number; closed: number }[] = []
  const start = new Date(now)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-GB', { month: 'short' }), created: 0, closed: 0 })
  }
  const monthOf = (d: Date) => months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
  for (const r of rows) {
    const c = monthOf(r.createdAt)
    if (c) c.created++
  }
  for (const r of closed) {
    const m = monthOf(r.closedAt!)
    if (m) m.closed++
  }

  const single = scopeTypes.length === 1 ? scopeTypes[0] : null
  return {
    filter: { ...filter, days, dimension: dimension.key },
    caseTypes: typeConfigs.map((t) => ({ id: t.id, name: t.name, prefix: t.prefix })),
    dimensions,
    dimension,
    kpis: {
      total: rows.length,
      open: rows.filter((r) => r.status === 'open').length,
      overdue: rows.filter(isOverdue).length,
      closed: closed.length,
      medianDaysToClose: lead.length ? lead[Math.floor(lead.length / 2)] : null,
    },
    breakdown,
    trend: months,
    phaseTimes: single ? await phaseTimes(rows.map((r) => r.id), single.config) : null,
    drill: filter.value
      ? matching.slice(0, 50).map((r) => ({
          id: r.id,
          number: r.number,
          title: r.title,
          status: r.status,
          caseTypeName: r.caseType.name,
          phaseName: configOf(r).phases.find((p) => p.id === r.phaseId)?.name ?? r.phaseId,
          overdue: isOverdue(r),
          createdAt: r.createdAt,
        }))
      : null,
  }
}

export type Report = Awaited<ReturnType<typeof buildReport>>
