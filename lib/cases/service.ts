import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/client'
import { verifyPassword } from '@/lib/auth/password'
import { CaseTypeConfigSchema, type CaseTypeConfig, type Phase } from '@/lib/case-config/schema'
import { visibleLayout, type CaseMove, type CaseValues } from '@/lib/case-config/runtime'
import {
  actorFieldStates,
  actorRoleIds,
  allowedActions,
  applySave,
  applyTake,
  canCreateSubcase,
  currentPhase,
  emailNotices,
  initialCase,
  permissionIn,
  phaseHolderRoleIds,
  planMove,
  roleHolders,
  subcaseTypeName,
  type Actor,
  type CaseContext,
  type CaseSnapshot,
  type CaseStatus,
  type Notice,
  type RoleBindings,
} from './engine'

export class CaseError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message)
  }
}

const CASE_INCLUDE = {
  version: true,
  caseType: true,
  subCases: { select: { status: true, parentFieldId: true } },
} satisfies Prisma.CaseInclude

type CaseRow = Prisma.CaseGetPayload<{ include: typeof CASE_INCLUDE }>

const parseConfig = (json: unknown): CaseTypeConfig => CaseTypeConfigSchema.parse(json)
const bindingsOf = (json: unknown) => (json ?? {}) as RoleBindings

async function groupMembers(): Promise<Record<string, string[]>> {
  const groups = await prisma.group.findMany({ select: { id: true, members: true } })
  return Object.fromEntries(groups.map((g) => [g.id, g.members]))
}

export async function actorFor(userId: string): Promise<Actor> {
  const groups = await prisma.group.findMany({ where: { members: { has: userId } }, select: { id: true } })
  return { id: userId, groupIds: groups.map((g) => g.id) }
}

function snapshotOf(row: CaseRow): CaseSnapshot {
  return {
    phaseId: row.phaseId,
    status: row.status as CaseStatus,
    values: row.values as CaseValues,
    roles: row.roles as Record<string, string[]>,
    openSubcases: row.subCases.reduce<Record<string, number>>((acc, c) => {
      if (c.status === 'open' && c.parentFieldId) acc[c.parentFieldId] = (acc[c.parentFieldId] ?? 0) + 1
      return acc
    }, {}),
  }
}

/** Loads the case; with `revision`, fails fast if someone saved since the caller loaded it. */
async function loadCase(idOrNumber: string, revision?: number): Promise<CaseRow> {
  const row = await prisma.case.findFirst({
    where: { OR: [{ id: idOrNumber }, { number: idOrNumber.toUpperCase() }] },
    include: CASE_INCLUDE,
  })
  if (!row) throw new CaseError('Case not found', 404)
  if (revision !== undefined && revision !== row.revision) throw new CaseError(STALE, 409)
  return row
}

const STALE = 'Someone else has changed the case — reload to see their changes'

function contextOf(row: CaseRow, actor: Actor): CaseContext {
  return { config: parseConfig(row.version.config), bindings: bindingsOf(row.caseType.roleBindings), snapshot: snapshotOf(row), actor }
}

function dueAt(phase: Phase, from: Date): Date | null {
  const hours = (phase.deadlineDays ?? 0) * 24 + (phase.deadlineHours ?? 0)
  return hours ? new Date(from.getTime() + hours * 3_600_000) : null
}

/** Writes with optimistic locking: fails with 409 if someone saved since `revision`. */
async function writeCase(
  tx: Prisma.TransactionClient,
  row: CaseRow,
  revision: number,
  data: Prisma.CaseUncheckedUpdateManyInput
) {
  const res = await tx.case.updateMany({ where: { id: row.id, revision }, data: { ...data, revision: { increment: 1 } } })
  if (res.count === 0) throw new CaseError(STALE, 409)
}

async function notify(
  tx: Prisma.TransactionClient,
  row: CaseRow,
  ctx: CaseContext,
  notices: Notice[],
  exclude: string
) {
  if (!notices.length) return
  const members = await groupMembers()
  const fallback = `${row.number} · ${row.title}`
  for (const n of notices) {
    const users = new Set(n.roleIds.flatMap((r) => roleHolders(r, ctx.snapshot.roles, ctx.bindings, members)))
    users.delete(exclude)
    const title = (n.subject || fallback).replace('[ID]', row.number).replace('[Title]', row.title)
    for (const userId of users) {
      await tx.notification.create({ data: { userId, type: 'case', title, body: n.message || fallback, link: `/cases/${row.number}` } })
    }
    if (users.size) console.log(`[cases] e-mail (stub) to ${users.size} user(s): ${title}`)
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface ParentLink {
  caseId: string
  fieldId: string
}

/**
 * Creates a case. With `parent`, it becomes a sub case created from that sub case field: the actor must be
 * able to edit the field now, the case type must be the one the field creates, and the field's list
 * of sub cases on the parent is updated in the same transaction.
 */
export async function createCase(caseTypeId: string, title: string, userId: string, parent?: ParentLink) {
  const parentRow = parent ? await loadCase(parent.caseId) : null
  if (parentRow && parent) {
    const ctx = contextOf(parentRow, await actorFor(userId))
    const field = ctx.config.fields.find((f) => f.id === parent.fieldId)
    if (!field || !canCreateSubcase(ctx, parent.fieldId)) throw new CaseError('You cannot add sub cases here in this phase', 403)
    const target = await prisma.caseType.findUnique({ where: { id: caseTypeId }, select: { name: true } })
    if (target?.name.toLowerCase() !== subcaseTypeName(field).toLowerCase()) throw new CaseError(`This field creates ${subcaseTypeName(field)} sub cases`, 400)
  }
  const caseType = await prisma.caseType.findUnique({
    where: { id: caseTypeId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  const version = caseType?.versions[0]
  if (!caseType || !version || caseType.status !== 'published') throw new CaseError('The case type is not published', 400)

  const config = parseConfig(version.config)
  const now = new Date()
  const initial = initialCase(config, bindingsOf(caseType.roleBindings), userId, now)
  const titleField = config.fields.find((f) => f.type === 'text' && f.name.toLowerCase() === 'title')
  if (titleField && title.trim()) initial.values[titleField.id] = title.trim()

  return prisma.$transaction(async (tx) => {
    const { nextNumber } = await tx.caseType.update({
      where: { id: caseType.id },
      data: { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    })
    const created = await tx.case.create({
      data: {
        number: `${caseType.prefix}${nextNumber - 1}`,
        title: title.trim() || `${config.caseTypeName} ${now.toLocaleDateString('en-GB')}`,
        caseTypeId: caseType.id,
        versionId: version.id,
        phaseId: initial.phaseId,
        phaseEnteredAt: now,
        phaseDueAt: dueAt(config.phases[0], now),
        values: initial.values as never,
        roles: initial.roles as never,
        createdBy: userId,
        ...(parentRow && parent ? { parentId: parentRow.id, parentFieldId: parent.fieldId } : {}),
      },
    })
    await tx.caseEvent.create({
      data: { caseId: created.id, type: 'created', toPhaseId: initial.phaseId, actorId: userId, data: parentRow ? ({ parent: parentRow.number } as never) : undefined },
    })
    if (parentRow && parent) {
      // The parent's sub case field lists its sub cases (counts for mandatory checks)
      const fresh = await tx.case.findUniqueOrThrow({ where: { id: parentRow.id }, select: { values: true } })
      const values = fresh.values as CaseValues
      const list = Array.isArray(values[parent.fieldId]) ? (values[parent.fieldId] as string[]) : []
      await tx.case.update({
        where: { id: parentRow.id },
        data: { values: { ...values, [parent.fieldId]: [...list, created.id] } as never, revision: { increment: 1 } },
      })
      await tx.caseEvent.create({
        data: { caseId: parentRow.id, type: 'subcaseCreated', fromPhaseId: parentRow.phaseId, actorId: userId, data: { number: created.number, fieldId: parent.fieldId } as never },
      })
    }
    return created
  })
}

export async function saveCase(idOrNumber: string, userId: string, patch: CaseValues, revision: number) {
  const row = await loadCase(idOrNumber, revision)
  const ctx = contextOf(row, await actorFor(userId))
  if (!allowedActions(ctx).save.allowed) throw new CaseError('You cannot edit the case in this phase', 403)
  const saved = applySave(ctx, patch)

  await prisma.$transaction(async (tx) => {
    await writeCase(tx, row, revision, { values: saved.values as never, roles: saved.roles as never })
    if (saved.changed.length) {
      await tx.caseEvent.create({
        data: { caseId: row.id, type: 'saved', fromPhaseId: row.phaseId, actorId: userId, data: { fields: saved.changed, assigned: saved.assigned } as never },
      })
    }
    // A new holder of the phase's responsible role is told the case is theirs
    const notices: Notice[] = Object.keys(saved.assigned).map((roleId) => ({
      roleIds: [roleId],
      subject: `You have been assigned ${row.number}`,
      message: row.title,
    }))
    await notify(tx, row, { ...ctx, snapshot: { ...ctx.snapshot, roles: saved.roles } }, notices, userId)
  })
  return saved
}

export async function takeCase(idOrNumber: string, userId: string, revision: number) {
  const row = await loadCase(idOrNumber, revision)
  const ctx = contextOf(row, await actorFor(userId))
  const state = allowedActions(ctx).take
  if (!state.allowed) throw new CaseError(state.reason ?? 'Not allowed', 403)
  const taken = applyTake(ctx)
  await prisma.$transaction(async (tx) => {
    await writeCase(tx, row, revision, { values: taken.values as never, roles: taken.roles as never })
    await tx.caseEvent.create({
      data: { caseId: row.id, type: 'taken', fromPhaseId: row.phaseId, actorId: userId, data: { assigned: taken.assigned } as never },
    })
  })
}

export interface Signature {
  password: string
  meaning: string
}

/** Saves the patch (if any), then moves the case. E-signature is checked against the user's password. */
export async function moveCase(
  idOrNumber: string,
  userId: string,
  move: CaseMove,
  revision: number,
  patch: CaseValues = {},
  signature?: Signature
) {
  const row = await loadCase(idOrNumber, revision)
  const actor = await actorFor(userId)
  const ctx = contextOf(row, actor)
  const saved = Object.keys(patch).length && allowedActions(ctx).save.allowed ? applySave(ctx, patch) : null
  const after: CaseContext = saved ? { ...ctx, snapshot: { ...ctx.snapshot, values: saved.values, roles: saved.roles } } : ctx

  const plan = planMove(after, move)
  if (!plan.ok) throw new CaseError(plan.reason, 422)

  if (plan.signature) {
    if (!signature?.password || !signature.meaning.trim()) throw new CaseError('Electronic signature required', 428)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
    if (!user || !(await verifyPassword(signature.password, user.password))) throw new CaseError('Wrong password — the signature was not accepted', 401)
  }

  const config = ctx.config
  const target = config.phases.find((p) => p.id === plan.phaseId)!
  const now = new Date()
  const entered = plan.phaseId !== row.phaseId

  await prisma.$transaction(async (tx) => {
    await writeCase(tx, row, revision, {
      values: after.snapshot.values as never,
      roles: after.snapshot.roles as never,
      phaseId: plan.phaseId,
      status: plan.status,
      ...(entered ? { phaseEnteredAt: now, phaseDueAt: dueAt(target, now) } : {}),
      ...(plan.status !== 'open' ? { closedAt: now, phaseDueAt: null } : {}),
    })
    if (saved?.changed.length) {
      await tx.caseEvent.create({ data: { caseId: row.id, type: 'saved', fromPhaseId: row.phaseId, actorId: userId, data: { fields: saved.changed } as never } })
    }
    if (plan.signature) {
      await tx.caseEvent.create({
        data: { caseId: row.id, type: 'signed', fromPhaseId: row.phaseId, actorId: userId, data: { meaning: signature!.meaning.trim(), move } as never },
      })
    }
    await tx.caseEvent.create({ data: { caseId: row.id, type: move, fromPhaseId: row.phaseId, toPhaseId: plan.phaseId, actorId: userId } })

    const notices = [...plan.notices]
    if (entered && plan.status === 'open') {
      const roleIds = target.notify?.mode === 'roles' ? target.notify.roleIds : phaseHolderRoleIds(config, target)
      notices.push({ roleIds, subject: `${row.number} is now in ${target.name}`, message: row.title })
    }
    await notify(tx, row, after, notices, userId)
    if (plan.status !== 'open' && row.parentId) await notifyParent(tx, row, userId)
  })
  return plan
}

/** A sub case closed: whoever has the parent case now is told, and the parent's history notes it. */
async function notifyParent(tx: Prisma.TransactionClient, child: CaseRow, actorId: string) {
  const parent = await tx.case.findUnique({ where: { id: child.parentId! }, include: CASE_INCLUDE })
  if (!parent) return
  const ctx = contextOf(parent, { id: actorId, groupIds: [] })
  const phase = currentPhase(ctx.config, ctx.snapshot)
  await tx.caseEvent.create({
    data: { caseId: parent.id, type: 'subcaseClosed', fromPhaseId: parent.phaseId, actorId, data: { number: child.number } as never },
  })
  await notify(tx, parent, ctx, [{ roleIds: phaseHolderRoleIds(ctx.config, phase), subject: `${child.number} is closed — sub case of ${parent.number}`, message: child.title }], actorId)
}

/** A button field: saves the patch and fires the phase's "on button click" rules (e-mails). */
export async function pressButton(idOrNumber: string, userId: string, revision: number, patch: CaseValues) {
  const row = await loadCase(idOrNumber)
  const ctx = contextOf(row, await actorFor(userId))
  const saved = await saveCase(idOrNumber, userId, patch, revision)
  const after = { ...ctx, snapshot: { ...ctx.snapshot, values: saved.values, roles: saved.roles } }
  await prisma.$transaction((tx) => notify(tx, row, after, emailNotices(after, currentPhase(ctx.config, ctx.snapshot), 'onButtonClick'), userId))
}

export async function cancelCase(idOrNumber: string, userId: string, revision: number) {
  const row = await loadCase(idOrNumber, revision)
  if (row.status !== 'open') throw new CaseError('The case is closed', 400)
  await prisma.$transaction(async (tx) => {
    await writeCase(tx, row, revision, { status: 'cancelled', closedAt: new Date(), phaseDueAt: null })
    await tx.caseEvent.create({ data: { caseId: row.id, type: 'cancelled', fromPhaseId: row.phaseId, actorId: userId } })
  })
}

export async function addComment(idOrNumber: string, userId: string, body: string) {
  const row = await loadCase(idOrNumber)
  if (!body.trim()) throw new CaseError('Empty comment', 400)
  return prisma.caseComment.create({
    data: { caseId: row.id, phaseId: row.phaseId, body: body.trim(), authorId: userId },
    include: { author: { select: { id: true, name: true } } },
  })
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Everything the case page needs, computed for this user. */
export async function getCaseDetail(idOrNumber: string, userId: string) {
  const row = await loadCase(idOrNumber)
  const actor = await actorFor(userId)
  const ctx = contextOf(row, actor)
  const { config, snapshot } = ctx
  const phase = currentPhase(config, snapshot)
  const states = actorFieldStates(ctx)
  const phaseIndex = config.phases.findIndex((p) => p.id === phase.id)

  const [events, comments, attachments, users, members, parent, subCases, caseTypes] = await Promise.all([
    prisma.caseEvent.findMany({ where: { caseId: row.id }, orderBy: { at: 'asc' }, include: { actor: { select: { id: true, name: true } } } }),
    prisma.caseComment.findMany({ where: { caseId: row.id }, orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true } } } }),
    prisma.caseAttachment.findMany({ where: { caseId: row.id }, orderBy: { uploadedAt: 'asc' }, include: { uploader: { select: { name: true } } } }),
    prisma.user.findMany({ where: { active: true, id: { not: 'system-placeholder-user' } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    groupMembers(),
    row.parentId
      ? prisma.case.findUnique({ where: { id: row.parentId }, select: { number: true, title: true, caseType: { select: { name: true } } } })
      : null,
    prisma.case.findMany({
      where: { parentId: row.id },
      orderBy: { createdAt: 'asc' },
      include: { version: { select: { config: true } }, caseType: { select: { name: true } } },
    }),
    prisma.caseType.findMany({ where: { status: 'published' }, select: { id: true, name: true, prefix: true } }),
  ])

  // Sub case fields: which published case type each creates, and whether this user may add one now
  const subcaseFields = Object.fromEntries(
    config.fields
      .filter((f) => f.type === 'subcase')
      .map((f) => {
        const target = caseTypes.find((t) => t.name.toLowerCase() === subcaseTypeName(f).toLowerCase()) ?? null
        return [f.id, { target, typeName: subcaseTypeName(f), canCreate: !!target && canCreateSubcase(ctx, f.id) }]
      })
  )

  const holderRoleIds = phaseHolderRoleIds(config, phase)
  return {
    case: {
      id: row.id,
      number: row.number,
      title: row.title,
      status: row.status,
      phaseId: row.phaseId,
      revision: row.revision,
      createdAt: row.createdAt,
      closedAt: row.closedAt,
      phaseDueAt: row.phaseDueAt,
      values: snapshot.values,
      roles: snapshot.roles,
      caseType: { id: row.caseType.id, name: row.caseType.name, prefix: row.caseType.prefix },
      version: row.version.version,
    },
    config,
    phaseIndex,
    layout: visibleLayout(config, phase, snapshot.values),
    fieldStates: Object.fromEntries(states),
    actions: allowedActions(ctx),
    myRoleIds: actorRoleIds(ctx),
    permission: permissionIn(phase, actorRoleIds(ctx)),
    holders: holderRoleIds.map((roleId) => ({
      roleId,
      name: config.roles.find((r) => r.id === roleId)?.name ?? roleId,
      userIds: roleHolders(roleId, snapshot.roles, ctx.bindings, members),
      direct: snapshot.roles[roleId] ?? [],
    })),
    events,
    comments,
    attachments,
    users,
    parent,
    subCases: subCases.map((c) => {
      const cfg = parseConfig(c.version.config)
      return {
        id: c.id,
        number: c.number,
        title: c.title,
        status: c.status,
        fieldId: c.parentFieldId,
        caseTypeName: c.caseType.name,
        phaseName: cfg.phases.find((p) => p.id === c.phaseId)?.name ?? c.phaseId,
        phaseDueAt: c.phaseDueAt,
      }
    }),
    subcaseFields,
    openSubcases: snapshot.openSubcases ?? {},
  }
}

export interface CaseListFilter {
  caseTypeId?: string
  status?: string
  mine?: string
  q?: string
  page?: number
  pageSize?: number
}

export async function listCases(filter: CaseListFilter, userId: string) {
  const pageSize = Math.min(filter.pageSize ?? 25, 100)
  const page = Math.max(filter.page ?? 1, 1)
  const where: Prisma.CaseWhereInput = {
    ...(filter.caseTypeId ? { caseTypeId: filter.caseTypeId } : {}),
    ...(filter.status === 'closed'
      ? { status: { in: ['closed', 'preClosed'] } }
      : filter.status && filter.status !== 'all'
        ? { status: filter.status }
        : {}),
    ...(filter.mine ? { createdBy: userId } : {}),
    ...(filter.q
      ? { OR: [{ number: { contains: filter.q, mode: 'insensitive' } }, { title: { contains: filter.q, mode: 'insensitive' } }] }
      : {}),
  }
  const [total, rows] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        version: { select: { config: true } },
        caseType: { select: { name: true, prefix: true } },
        creator: { select: { name: true } },
        parent: { select: { number: true } },
      },
    }),
  ])
  return {
    total,
    page,
    pageSize,
    cases: rows.map((r) => {
      const config = parseConfig(r.version.config)
      return {
        id: r.id,
        number: r.number,
        title: r.title,
        status: r.status,
        caseTypeName: r.caseType.name,
        phaseName: config.phases.find((p) => p.id === r.phaseId)?.name ?? r.phaseId,
        phaseIndex: config.phases.findIndex((p) => p.id === r.phaseId),
        phaseCount: config.phases.length,
        phaseDueAt: r.phaseDueAt,
        createdAt: r.createdAt,
        creatorName: r.creator.name,
        parentNumber: r.parent?.number ?? null,
      }
    }),
  }
}

/** Open cases where the user can act in the current phase, plus group inboxes the user can take from. */
export async function inbox(userId: string) {
  const actor = await actorFor(userId)
  const rows = await prisma.case.findMany({
    where: { status: 'open' },
    orderBy: [{ phaseDueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    include: CASE_INCLUDE,
  })
  return rows.flatMap((row) => {
    const ctx = contextOf(row, actor)
    const actions = allowedActions(ctx)
    const canAct = actions.forward.allowed || actions.backward.allowed || actions.preEnd.allowed || actions.save.allowed
    if (!canAct && !actions.take.allowed) return []
    const phase = currentPhase(ctx.config, ctx.snapshot)
    return [{
      id: row.id,
      number: row.number,
      title: row.title,
      caseTypeName: row.caseType.name,
      phaseName: phase.name,
      phaseDueAt: row.phaseDueAt,
      phaseEnteredAt: row.phaseEnteredAt,
      /** In a group inbox: someone in the group should take it */
      inGroupInbox: actions.take.allowed && !actions.forward.allowed,
    }]
  })
}

export type CaseDetail = Awaited<ReturnType<typeof getCaseDetail>>
