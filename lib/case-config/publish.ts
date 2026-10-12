import { prisma } from '@/lib/db/client'
import { CaseTypeConfigSchema } from './schema'
import { hasBlockingIssues, validateCaseType, type ValidationIssue } from './validate'

/**
 * Snapshots the case type's draft into a new immutable CaseTypeVersion.
 * Running cases keep pointing at the version they were started on.
 */
export async function publishCaseType(
  caseTypeId: string,
  userId: string
): Promise<{ version: number } | { issues: ValidationIssue[] }> {
  const caseType = await prisma.caseType.findUnique({ where: { id: caseTypeId } })
  if (!caseType) throw new Error('Case type not found')

  const config = CaseTypeConfigSchema.parse(caseType.draft)
  const issues = validateCaseType(config)
  const clash = await prisma.caseType.findFirst({
    where: { prefix: config.prefix, id: { not: caseTypeId } },
    select: { name: true },
  })
  if (clash) {
    issues.push({ id: 'prefix-taken', section: 'basics', severity: 'error', message: `Prefix “${config.prefix}” is already used by ${clash.name}` })
  }
  if (hasBlockingIssues(issues)) return { issues }

  return prisma.$transaction(async (tx) => {
    const latest = await tx.caseTypeVersion.findFirst({
      where: { caseTypeId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const version = (latest?.version ?? 0) + 1
    await tx.caseTypeVersion.create({
      data: { caseTypeId, version, config: config as never, publishedBy: userId },
    })
    await tx.caseType.update({
      where: { id: caseTypeId },
      data: { status: 'published', name: config.caseTypeName, prefix: config.prefix },
    })
    return { version }
  })
}
