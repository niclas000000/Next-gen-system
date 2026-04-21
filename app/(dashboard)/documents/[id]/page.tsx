import { prisma } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { DocumentEditor } from './DocumentEditor'

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? ''

  const [doc, versions, receipts] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        documentType: {
          select: {
            id: true, name: true, prefix: true, format: true,
            propertyPackage: true, requireReadReceipt: true, requireChangeDesc: true,
            approvalFlow: { select: { id: true, name: true, phases: true } },
          },
        },
      },
    }),
    prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.readReceipt.findMany({
      where: { documentId: id },
      orderBy: { readAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  if (!doc) notFound()

  const hasReadReceipt = receipts.some((r) => r.userId === currentUserId)

  return (
    <DocumentEditor
      doc={{
        id: doc.id,
        title: doc.title,
        description: doc.description,
        content: doc.content,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        status: doc.status,
        version: doc.version,
        changeDescription: doc.changeDescription,
        validFrom: doc.validFrom?.toISOString() ?? null,
        validTo: doc.validTo?.toISOString() ?? null,
        properties: doc.properties as Record<string, unknown>,
        roles: doc.roles as Record<string, unknown>,
        requireReadReceipt: doc.requireReadReceipt,
        tags: doc.tags,
        category: doc.category,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        author: doc.author,
        documentType: doc.documentType ? {
          id: doc.documentType.id,
          name: doc.documentType.name,
          prefix: doc.documentType.prefix,
          format: doc.documentType.format,
          propertyPackage: doc.documentType.propertyPackage as unknown[],
          requireReadReceipt: doc.documentType.requireReadReceipt,
          requireChangeDesc: doc.documentType.requireChangeDesc,
          approvalFlow: doc.documentType.approvalFlow ? {
            id: doc.documentType.approvalFlow.id,
            name: doc.documentType.approvalFlow.name,
            phases: doc.documentType.approvalFlow.phases as unknown[],
          } : null,
        } : null,
      }}
      versions={versions.map((v) => ({
        id: v.id,
        version: v.version,
        changeDesc: v.changeDesc,
        createdAt: v.createdAt.toISOString(),
        author: v.author,
      }))}
      receipts={receipts.map((r) => ({
        id: r.id,
        readAt: r.readAt.toISOString(),
        user: r.user,
      }))}
      currentUserId={currentUserId}
      hasReadReceipt={hasReadReceipt}
    />
  )
}
