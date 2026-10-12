import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/db/client'
import { CaseError, actorFor } from './service'
import { allowedActions } from './engine'
import { CaseTypeConfigSchema } from '@/lib/case-config/schema'
import type { CaseStatus, RoleBindings } from './engine'
import type { CaseValues } from '@/lib/case-config/runtime'

const ROOT = join(process.cwd(), 'uploads')
const MAX_BYTES = 20 * 1024 * 1024

/** Stores the file; the caller adds the returned id to the attachments field with a normal save. */
export async function uploadAttachment(caseId: string, userId: string, file: File, fieldId: string | null) {
  const row = await prisma.case.findUnique({ where: { id: caseId }, include: { version: true, caseType: true } })
  if (!row) throw new CaseError('Case not found', 404)
  const actions = allowedActions({
    config: CaseTypeConfigSchema.parse(row.version.config),
    bindings: (row.caseType.roleBindings ?? {}) as unknown as RoleBindings,
    snapshot: { phaseId: row.phaseId, status: row.status as CaseStatus, values: row.values as CaseValues, roles: row.roles as Record<string, string[]> },
    actor: await actorFor(userId),
  })
  if (!actions.save.allowed) throw new CaseError('You cannot add files to the case in this phase', 403)
  if (file.size > MAX_BYTES) throw new CaseError('The file is larger than 20 MB', 413)

  const att = await prisma.caseAttachment.create({
    data: { caseId, fieldId, fileName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, uploadedBy: userId },
  })
  await mkdir(join(ROOT, caseId), { recursive: true })
  await writeFile(join(ROOT, caseId, att.id), Buffer.from(await file.arrayBuffer()))
  return att
}

export async function readAttachment(caseId: string, attachmentId: string) {
  const att = await prisma.caseAttachment.findFirst({ where: { id: attachmentId, caseId } })
  if (!att) throw new CaseError('File not found', 404)
  return { att, data: await readFile(join(ROOT, caseId, att.id)) }
}
