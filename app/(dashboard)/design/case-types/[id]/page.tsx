import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getSessionUser } from '@/lib/auth/session'
import { CaseTypeConfigSchema } from '@/lib/case-config/schema'
import type { RoleBindings } from '@/lib/cases/engine'
import { CaseTypeEditor } from '@/components/design/editor/CaseTypeEditor'

export default async function CaseTypeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/')
  const { id } = await params

  const [caseType, groups, users] = await Promise.all([
    prisma.caseType.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 }, _count: { select: { cases: true } } },
    }),
    prisma.group.findMany({ select: { id: true, name: true, members: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { active: true, id: { not: 'system-placeholder-user' } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])
  if (!caseType) notFound()
  const live = caseType.versions[0]

  return (
    <CaseTypeEditor
      key={`${caseType.id}-${live?.version ?? 0}`}
      caseType={{ id: caseType.id, status: caseType.status, caseCount: caseType._count.cases }}
      draft={CaseTypeConfigSchema.parse(caseType.draft)}
      bindings={(caseType.roleBindings ?? {}) as unknown as RoleBindings}
      published={live ? { version: live.version, publishedAt: live.publishedAt, config: CaseTypeConfigSchema.parse(live.config) } : null}
      groups={groups}
      users={users}
    />
  )
}
