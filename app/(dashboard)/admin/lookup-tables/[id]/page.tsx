import { prisma } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { LookupTableEditor } from './LookupTableEditor'

export default async function LookupTableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const table = await prisma.lookupTable.findUnique({
    where: { id },
    include: { values: { orderBy: { order: 'asc' } } },
  })
  if (!table) notFound()

  return (
    <LookupTableEditor
      table={{
        id: table.id,
        name: table.name,
        description: table.description,
        scope: table.scope,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
      }}
      initialValues={table.values.map((v) => ({
        id: v.id,
        label: v.label,
        value: v.value,
        color: v.color,
        order: v.order,
        parentId: v.parentId,
        active: v.active,
      }))}
    />
  )
}
