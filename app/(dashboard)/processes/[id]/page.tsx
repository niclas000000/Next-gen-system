import { prisma } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { ProcessDetailClient } from './ProcessDetailClient'

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [process, allDocuments, allWorkflows, allUsers] = await Promise.all([
    prisma.process.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, status: true }, orderBy: { name: 'asc' } },
        documents: {
          include: { document: { select: { id: true, title: true, status: true, category: true, updatedAt: true } } },
        },
        workflows: {
          include: { workflow: { select: { id: true, name: true, status: true, updatedAt: true } } },
        },
      },
    }),
    prisma.document.findMany({ select: { id: true, title: true, status: true }, orderBy: { title: 'asc' } }),
    prisma.workflow.findMany({ select: { id: true, name: true, status: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  if (!process) notFound()

  return (
    <ProcessDetailClient
      process={{
        ...process,
        nodes: process.nodes as unknown[],
        edges: process.edges as unknown[],
        kpis: process.kpis as unknown[],
        createdAt: process.createdAt.toISOString(),
        updatedAt: process.updatedAt.toISOString(),
        documents: process.documents.map((pd) => ({
          ...pd.document,
          updatedAt: pd.document.updatedAt.toISOString(),
        })),
        workflows: process.workflows.map((pw) => ({
          ...pw.workflow,
          updatedAt: pw.workflow.updatedAt.toISOString(),
        })),
      }}
      allDocuments={allDocuments}
      allWorkflows={allWorkflows}
      allUsers={allUsers}
    />
  )
}
