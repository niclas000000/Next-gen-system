import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { Suspense } from 'react'
import { DocumentsClient } from './DocumentsClient'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string; q?: string }>
}) {
  const sp = await searchParams
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? ''

  const whereClause: Record<string, unknown> = {}
  if (sp.status) {
    whereClause.status = sp.status
  } else if (!sp.view) {
    // Library (default view) = published only
    whereClause.status = 'published'
  }
  if (sp.view === 'mine') whereClause.createdBy = userId

  const [documents, documentTypes] = await Promise.all([
    prisma.document.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
        documentType: { select: { id: true, name: true, prefix: true } },
      },
    }),
    prisma.documentType.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, prefix: true, format: true },
    }),
  ])

  return (
    <Suspense>
      <DocumentsClient
        initialDocuments={documents.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          category: d.category,
          tags: d.tags,
          status: d.status,
          version: d.version,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          author: d.author,
          documentType: d.documentType,
        }))}
        documentTypes={documentTypes}
        currentStatus={sp.status ?? null}
        currentView={sp.view ?? null}
        userId={userId}
      />
    </Suspense>
  )
}
