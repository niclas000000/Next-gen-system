import { prisma } from '@/lib/db/client'
import { ProcessesClient } from './ProcessesClient'

export default async function ProcessesPage() {
  const [processes, allDocuments, allWorkflows, allUsers] = await Promise.all([
    prisma.process.findMany({
      orderBy: { name: 'asc' },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { documents: true, workflows: true, children: true } },
      },
    }),
    prisma.document.findMany({ select: { id: true, title: true, status: true }, orderBy: { title: 'asc' } }),
    prisma.workflow.findMany({ select: { id: true, name: true, status: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <ProcessesClient
      initialProcesses={processes.map((p) => ({
        id: p.id, name: p.name, description: p.description, status: p.status,
        parentId: p.parentId, owner: p.owner, category: p.category, tags: p.tags,
        _count: p._count, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
      }))}
      allDocuments={allDocuments}
      allWorkflows={allWorkflows}
      allUsers={allUsers}
    />
  )
}
