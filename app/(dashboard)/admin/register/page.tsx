import { prisma } from '@/lib/db/client'
import { RegistryClient } from './RegistryClient'

export default async function RegistryPage() {
  const items = await prisma.registryItem.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] })
  return (
    <RegistryClient
      initialItems={items.map((i) => ({
        id: i.id, type: i.type, name: i.name, color: i.color,
        description: i.description, scope: i.scope,
      }))}
    />
  )
}
