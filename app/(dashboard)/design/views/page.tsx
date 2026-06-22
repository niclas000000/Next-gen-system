import { prisma } from '@/lib/db/client'
import { ViewsClient } from './ViewsClient'

export default async function ViewsPage() {
  const views = await prisma.systemView.findMany({
    orderBy: [{ section: 'asc' }, { order: 'asc' }],
  })
  return <ViewsClient initialViews={views.map((v) => ({ ...v, filters: (v.filters ?? {}) as Record<string, string> }))} />
}
