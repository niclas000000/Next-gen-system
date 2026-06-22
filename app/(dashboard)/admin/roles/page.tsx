import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { RolesClient } from './RolesClient'

export default async function RolesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const roles = await prisma.processRole.findMany({
    orderBy: { name: 'asc' },
  })

  return (
    <RolesClient
      initialRoles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  )
}
