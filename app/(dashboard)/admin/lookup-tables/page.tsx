import { prisma } from '@/lib/db/client'
import { LookupTablesClient } from './LookupTablesClient'

export default async function LookupTablesPage() {
  const tables = await prisma.lookupTable.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { values: true } } },
  })

  return (
    <LookupTablesClient
      initialTables={tables.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        scope: t.scope,
        valueCount: t._count.values,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
    />
  )
}
