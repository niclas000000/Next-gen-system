/**
 * Demo data for the Deviation case type: demo users and groups, role bindings, registry values
 * and a set of DEV cases in different phases — created through the real case service so history,
 * signatures and notifications are genuine.
 *
 *   npm run demo:reset   — deletes all DEV cases and recreates the demo set (idempotent for users)
 *
 * All demo users have the password "demo". Only touches DEV cases, demo users (@nexus.demo) and
 * the demo groups.
 */
import { prisma } from '@/lib/db/client'
import { hashPassword } from '@/lib/auth/password'
import { CaseTypeConfigSchema, type CaseTypeConfig } from '@/lib/case-config/schema'
import { missingMandatory, type CaseValues } from '@/lib/case-config/runtime'
import { publishCaseType } from '@/lib/case-config/publish'
import { createCase, moveCase, saveCase, takeCase, addComment } from '@/lib/cases/service'

const PASSWORD = 'demo'
const DAY = 86_400_000

const USERS = [
  { key: 'admin', name: 'Demo Admin', email: 'admin@nexus.demo', role: 'admin' },
  { key: 'anna', name: 'Anna Berg', email: 'anna.berg@nexus.demo', role: 'user' },
  { key: 'erik', name: 'Erik Lund', email: 'erik.lund@nexus.demo', role: 'user' },
  { key: 'johan', name: 'Johan Ek', email: 'johan.ek@nexus.demo', role: 'user' },
  { key: 'sara', name: 'Sara Nilsson', email: 'sara.nilsson@nexus.demo', role: 'user' },
  { key: 'lina', name: 'Lina Holm', email: 'lina.holm@nexus.demo', role: 'user' },
] as const
type UserKey = (typeof USERS)[number]['key']

const GROUPS = [
  { name: 'Deviation leaders', description: 'Inbox for new deviations — appoints the deviation leader', members: ['erik', 'johan'] as UserKey[], roleId: 'deviationLeaderGroup' },
  { name: 'QA assessors', description: 'Inbox for deviations ready for QA assessment', members: ['sara', 'lina'] as UserKey[], roleId: 'qaAssessorGroup' },
]

/** Customer-specific lists that are empty in the reference configuration. */
const REGISTRY_VALUES: Record<string, string[]> = {
  'r-room': ['R-101 Weighing', 'R-102 Granulation', 'R-201 Packaging line 1', 'R-202 Packaging line 2', 'R-301 QC laboratory'],
  'r-area': ['Solid dosage', 'Packaging', 'QC laboratory', 'Warehouse'],
  'r-equipment': ['BAL-014 Balance', 'GRN-002 Granulator', 'TAB-005 Tablet press', 'PCK-011 Blister line', 'HPLC-03 HPLC'],
  'r-errorCode': ['E01 Documentation', 'E02 Equipment failure', 'E03 Human error', 'E04 Material', 'E05 Environment'],
}

async function ensureUsers(): Promise<Record<UserKey, string>> {
  const hash = await hashPassword(PASSWORD)
  const ids = {} as Record<UserKey, string>
  for (const u of USERS) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      create: { name: u.name, email: u.email, role: u.role, password: hash, active: true },
      update: { name: u.name, role: u.role, active: true },
    })
    ids[u.key] = row.id
  }
  return ids
}

async function ensureGroups(users: Record<UserKey, string>) {
  const bindings: Record<string, { userIds: string[]; groupIds: string[] }> = {}
  for (const g of GROUPS) {
    const members = g.members.map((k) => users[k])
    const group = await prisma.group.upsert({
      where: { name: g.name },
      create: { name: g.name, description: g.description, members },
      update: { description: g.description, members },
    })
    for (const userId of members) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { groups: true } })
      if (u && !u.groups.includes(group.id)) await prisma.user.update({ where: { id: userId }, data: { groups: [...u.groups, group.id] } })
    }
    bindings[g.roleId] = { userIds: [], groupIds: [group.id] }
  }
  return bindings
}

/** Fills empty registries, binds group roles and publishes a new version if the config changed. */
async function prepareCaseType(bindings: Record<string, { userIds: string[]; groupIds: string[] }>, adminId: string) {
  const caseType = await prisma.caseType.findUnique({ where: { prefix: 'DEV' } })
  if (!caseType) throw new Error('Case type DEV not found — run `npx prisma db seed` first')
  const draft = CaseTypeConfigSchema.parse(caseType.draft)
  let changed = false
  for (const r of draft.registries) {
    if (REGISTRY_VALUES[r.id] && r.values.length === 0) {
      r.values = REGISTRY_VALUES[r.id]
      changed = true
    }
  }
  await prisma.caseType.update({ where: { id: caseType.id }, data: { draft: draft as never, roleBindings: bindings as never } })
  if (changed) {
    const res = await publishCaseType(caseType.id, adminId)
    if ('issues' in res) throw new Error(`Publishing failed: ${res.issues.map((i) => i.message).join('; ')}`)
    console.log(`Published DEV v${res.version} with demo registry values`)
  }
  return { caseTypeId: caseType.id, config: draft }
}

// ---------------------------------------------------------------------------
// Building cases through the service
// ---------------------------------------------------------------------------

class Builder {
  constructor(private config: CaseTypeConfig, private caseId: string, private users: Record<UserKey, string>) {}

  private async current() {
    return prisma.case.findUniqueOrThrow({ where: { id: this.caseId } })
  }

  /** Values for every mandatory field still missing in the current phase, with case-specific texts first. */
  private async filled(texts: CaseValues): Promise<CaseValues> {
    const row = await this.current()
    const values = { ...(row.values as CaseValues), ...texts }
    const phase = this.config.phases.find((p) => p.id === row.phaseId)!
    const patch: CaseValues = { ...texts }
    for (const f of missingMandatory(this.config, phase, values)) {
      const reg = this.config.registries.find((r) => r.id === f.registryId)
      let v: string
      if (f.type === 'date') v = new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10)
      else if (f.type === 'registrySearch') v = this.users.erik
      else if (reg?.values.length) v = reg.values[0]
      else v = `${f.name}: see attached notes.`
      patch[f.id] = f.multi ? [v] : v
    }
    return patch
  }

  async save(who: UserKey, values: CaseValues) {
    const row = await this.current()
    await saveCase(this.caseId, this.users[who], values, row.revision)
  }

  async take(who: UserKey) {
    const row = await this.current()
    await takeCase(this.caseId, this.users[who], row.revision)
  }

  async move(who: UserKey, move: 'forward' | 'backward' | 'preEnd', texts: CaseValues = {}, meaning?: string) {
    const row = await this.current()
    const values = move === 'backward' ? texts : await this.filled(texts)
    await moveCase(this.caseId, this.users[who], move, row.revision, values, meaning ? { password: PASSWORD, meaning } : undefined)
  }

  async comment(who: UserKey, body: string) {
    await addComment(this.caseId, this.users[who], body)
  }

  /**
   * Spreads the case's history over the last `days` days (the script creates it within seconds),
   * so the timeline, lead times and overdue phases look real. Event i of n lands at
   * days·(1 − i/n) ago; the phase deadline keeps its length from the new entry time.
   */
  async age(days: number, enteredDaysAgo?: number) {
    const span = days * DAY
    const now = Date.now()
    const row = await this.current()
    const events = await prisma.caseEvent.findMany({ where: { caseId: this.caseId }, orderBy: { at: 'asc' } })
    const lastMoveIndex = events.map((e) => e.type).findLastIndex((t) => ['created', 'forward', 'backward', 'preEnd'].includes(t))
    const timeOf = (i: number) =>
      enteredDaysAgo !== undefined && i === lastMoveIndex
        ? new Date(now - enteredDaysAgo * DAY)
        : new Date(now - span * (1 - i / events.length) + i * 60_000)
    for (const [i, e] of events.entries()) await prisma.caseEvent.update({ where: { id: e.id }, data: { at: timeOf(i) } })

    const entered = lastMoveIndex >= 0 ? timeOf(lastMoveIndex) : row.phaseEnteredAt
    const deadline = row.phaseDueAt ? row.phaseDueAt.getTime() - row.phaseEnteredAt.getTime() : null
    await prisma.case.update({
      where: { id: this.caseId },
      data: {
        createdAt: timeOf(0),
        phaseEnteredAt: entered,
        phaseDueAt: deadline !== null ? new Date(entered.getTime() + deadline) : null,
        closedAt: row.closedAt ? timeOf(events.length - 1) : null,
      },
    })
    const comments = await prisma.caseComment.findMany({ where: { caseId: this.caseId } })
    for (const c of comments) await prisma.caseComment.update({ where: { id: c.id }, data: { createdAt: new Date(now - span / 3) } })
  }
}

const registration = (problem: string, discovery: string, action: string, extra: CaseValues = {}): CaseValues => ({
  discoveryArea: 'Production',
  productAffected: 'No',
  analysisAffected: 'No',
  eventDate: new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10),
  problem,
  discovery,
  immediateAction: action,
  ...extra,
})

async function buildCases(caseTypeId: string, config: CaseTypeConfig, users: Record<UserKey, string>) {
  const make = async (title: string, by: UserKey = 'anna') => {
    const c = await createCase(caseTypeId, title, users[by])
    return new Builder(config, c.id, users)
  }

  // DEV1 — still being registered
  const d1 = await make('Spill of granulate in packaging room')
  await d1.save('anna', { problem: 'About 2 kg of granulate spilled from IBC during transfer to the hopper.', productAffected: 'Yes', batchNumber: '24-131' })

  // DEV2 — in the deviation leaders' group inbox, nobody has taken it
  const d2 = await make('Balance BAL-014 out of calibration')
  await d2.move('anna', 'forward', registration(
    'Daily check of balance BAL-014 showed 0.6 % deviation against the reference weight (limit 0.1 %).',
    'Discovered by the operator during the daily check before weighing batch 24-129.',
    'Balance taken out of use and labelled. Weighing moved to BAL-015.',
    { equipment: ['BAL-014 Balance'], room: ['R-101 Weighing'] }
  ))
  await d2.age(1)

  // DEV3 — taken by Erik, coordination in progress
  const d3 = await make('Label mix-up on blister line', 'johan')
  await d3.move('johan', 'forward', registration(
    'Cartons for 20 mg strength found with 10 mg labels on blister line 1.',
    'Found by the line operator at the in-process check after 340 cartons.',
    'Line stopped, the affected cartons quarantined and the label roll removed.',
    { discoveryArea: 'Packaging', productAffected: 'Yes', batchNumber: '24-127', articleNumber: '100245', articleName: 'Examplol 20 mg tablets' }
  ))
  await d3.take('erik')
  await d3.save('erik', { ownership: 'Production', plannedDate: new Date(Date.now() + 25 * DAY).toISOString().slice(0, 10) })
  await d3.comment('erik', 'Checking with the label supplier whether other rolls in the same delivery are affected.')
  await d3.age(8, 7)

  // DEV4 — observation, quick-closed in coordination with e-signature
  const d4 = await make('Warehouse temperature logger offline for 2 hours')
  await d4.move('anna', 'forward', registration(
    'Temperature logger in warehouse zone B was offline 02:10–04:05.',
    'Seen in the morning when reviewing the monitoring system.',
    'Logger restarted; the redundant logger shows 18–21 °C during the gap.',
    { discoveryArea: 'Warehouse' }
  ))
  await d4.take('johan')
  await d4.move('johan', 'preEnd', {
    initialClassification: 'Observation',
    initialJustification: 'Redundant logger confirms storage conditions were within limits; no product impact.',
    observationCorrection: 'Logger firmware updated and alarm for lost connection enabled.',
  }, 'I confirm the quick close of this observation')
  await d4.age(12)

  // DEV5 — major deviation in root cause investigation, analysis affected
  const d5 = await make('OOS result on assay, batch 24-118', 'sara')
  await d5.move('sara', 'forward', registration(
    'Assay result 91.2 % for batch 24-118 (specification 95.0–105.0 %).',
    'Reported by QC after the release test.',
    'Batch on hold. Laboratory investigation phase 1 started.',
    { discoveryArea: 'QC laboratory', analysisAffected: 'Yes', sampleNumber: 'S-24-0871', suspectedOos: 'OOS' }
  ))
  await d5.take('erik')
  await d5.move('erik', 'forward', { initialClassification: 'Major deviation', initialJustification: 'Confirmed OOS on a release test; product quality may be affected.' })
  await d5.save('erik', { classification: 'Major deviation', rootCauseInvestigation: 'Phase 1 lab investigation found no analytical error. Manufacturing investigation ongoing.' })
  await d5.comment('erik', 'Interviews with the granulation team booked for Thursday.')
  await d5.age(9)

  // DEV6 — waiting in the QA inbox, overdue
  const d6 = await make('Missing signature in batch record 24-120', 'johan')
  await d6.move('johan', 'forward', registration(
    'Second signature missing for the in-process check at step 14 in batch record 24-120.',
    'Found during batch record review.',
    'Operator interviewed; check was performed according to the log of the equipment.',
    { discoveryArea: 'Quality assurance' }
  ))
  await d6.take('erik')
  await d6.move('erik', 'forward', { initialClassification: 'Minor deviation', initialJustification: 'Documentation error only; the check is verified by equipment data.' })
  await d6.move('erik', 'forward', {
    classification: 'Minor deviation',
    rootCauseInvestigation: 'The second operator was called away; the batch record has no reminder before the next step.',
    riskAssessment: 'No product impact: equipment data shows the check was performed and within limits.',
    trend: 'Occasional',
    rootCause: 'Documentation',
    errorCode: 'E01 Documentation',
  }, 'I approve the root cause investigation')
  await d6.age(16, 12)

  // DEV7 — closed after the full flow
  const d7 = await make('Tablet press stoppage – foreign particles', 'anna')
  await d7.move('anna', 'forward', registration(
    'Black particles found in tablets during compression of batch 24-102.',
    'Visual in-process check by the operator.',
    'Press stopped, tablets from the last 30 minutes segregated.',
    { equipment: ['TAB-005 Tablet press'], productAffected: 'Yes', batchNumber: '24-102' }
  ))
  await d7.take('erik')
  await d7.move('erik', 'forward', { initialClassification: 'Major deviation', initialJustification: 'Foreign particles in product.' })
  await d7.move('erik', 'forward', {
    classification: 'Major deviation',
    rootCauseInvestigation: 'Worn punch seal released rubber particles. Maintenance interval exceeded by 3 weeks.',
    trend: 'First time',
    rootCause: 'Machine',
    errorCode: 'E02 Equipment failure',
  }, 'I approve the root cause investigation')
  await d7.take('sara')
  await d7.move('sara', 'forward', {
    qaAssessment: 'Root cause and CAPA accepted. Segregated tablets destroyed; remaining batch released after 100 % inspection.',
    batchStatus: 'Released with justification',
  }, 'I approve the QA assessment and close the deviation')
  await d7.age(30)

  // DEV8 — sent back from QA for completion
  const d8 = await make('Wrong revision of SOP used for line clearance', 'johan')
  await d8.move('johan', 'forward', registration(
    'Line clearance performed with SOP-0412 rev 3 instead of rev 4.',
    'Noticed by the shift lead when filing the checklist.',
    'Line clearance repeated with rev 4 before start.',
    { discoveryArea: 'Packaging', documentRef: 'SOP-0412 rev 4' }
  ))
  await d8.take('johan')
  await d8.move('johan', 'forward', { initialClassification: 'Minor deviation', initialJustification: 'Clearance was repeated before production started.' })
  await d8.move('johan', 'forward', {
    classification: 'Minor deviation',
    rootCauseInvestigation: 'Old printed copies were still in the line binder.',
    riskAssessment: 'No product impact.',
    trend: 'Recurring',
    rootCause: 'Documentation',
    errorCode: 'E01 Documentation',
  }, 'I approve the root cause investigation')
  await d8.take('lina')
  await d8.comment('lina', 'Recurring trend — please link the previous deviations and assess whether a CAPA is needed before I can close this.')
  await d8.move('lina', 'backward')
  await d8.age(6)
}

async function main() {
  const users = await ensureUsers()
  const bindings = await ensureGroups(users)
  const { caseTypeId } = await prepareCaseType(bindings, users.admin)

  // Reset: only the DEV case type's cases and their notifications
  const old = await prisma.case.findMany({ where: { caseTypeId }, select: { number: true } })
  await prisma.notification.deleteMany({ where: { link: { in: old.map((c) => `/cases/${c.number}`) } } })
  await prisma.case.deleteMany({ where: { caseTypeId } })
  await prisma.caseType.update({ where: { id: caseTypeId }, data: { nextNumber: 1 } })

  const latest = await prisma.caseTypeVersion.findFirstOrThrow({ where: { caseTypeId }, orderBy: { version: 'desc' } })
  await buildCases(caseTypeId, CaseTypeConfigSchema.parse(latest.config), users)

  const count = await prisma.case.count({ where: { caseTypeId } })
  console.log(`Demo ready: ${count} DEV cases. Log in as e.g. anna.berg@nexus.demo / ${PASSWORD} (admin: admin@nexus.demo).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
