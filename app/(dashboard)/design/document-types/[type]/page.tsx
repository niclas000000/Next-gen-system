import { prisma } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { DocumentTypeEditor } from './DocumentTypeEditor'

export default async function DocumentTypeDetailPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: id } = await params

  const [docType, flows] = await Promise.all([
    prisma.documentType.findUnique({
      where: { id },
      include: { approvalFlow: { select: { id: true, name: true } } },
    }),
    prisma.approvalFlow.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!docType) notFound()

  return (
    <DocumentTypeEditor
      docType={{
        id: docType.id,
        name: docType.name,
        prefix: docType.prefix,
        format: docType.format,
        propertyPackage: docType.propertyPackage,
        approvalFlowId: docType.approvalFlowId,
        requireReadReceipt: docType.requireReadReceipt,
        requireChangeDesc: docType.requireChangeDesc,
        approvalFlow: docType.approvalFlow,
      }}
      flows={flows}
    />
  )
}
