import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { demoMode, requireUser } from '@/lib/auth/session'

/** The effective user (after "view as"), and in demo mode the users an admin can switch to. */
export async function GET() {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const canSwitch = demoMode() && (user.role === 'admin' || !!user.viewAsBy)
  const switchable = canSwitch
    ? await prisma.user.findMany({
        where: { active: true, id: { not: 'system-placeholder-user' } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      })
    : []
  return NextResponse.json({ user, demo: demoMode(), switchable })
}
