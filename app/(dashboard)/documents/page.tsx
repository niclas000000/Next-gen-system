import { prisma } from '@/lib/db/client'
import { DocumentsClient } from './DocumentsClient'

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { author: { select: { id: true, name: true } } },
  })

  return (
    <DocumentsClient
      initialDocuments={documents.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        tags: d.tags,
        content: d.content,
        status: d.status,
        version: d.version,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        author: d.author,
      }))}
    />
  )
}
