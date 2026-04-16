import { prisma } from '@/lib/db/client'
import { GroupsClient } from './GroupsClient'

export default async function AdminSettingsPage() {
  const [groups, users] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { id: { not: 'system-placeholder-user' } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return <GroupsClient initialGroups={groups} users={users} />
}
