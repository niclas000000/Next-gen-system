import { prisma } from '@/lib/db/client'
import { UsersClient } from './UsersClient'

export default async function AdminUsersPage() {
  const [users, groups] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, groups: true, active: true, createdAt: true },
    }),
    prisma.group.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <UsersClient
      initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      groups={groups}
    />
  )
}
