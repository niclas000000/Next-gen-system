import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/client'
import { authOptions } from './config'

export const VIEW_AS_COOKIE = 'nexus-view-as'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  /** Set when an admin is viewing the app as this user (demo mode) */
  viewAsBy?: { id: string; name: string }
}

export const demoMode = () => process.env.DEMO_MODE === 'true'

/**
 * The effective user. In demo mode an admin can "view as" another user (cookie set via
 * /api/demo/view-as); everything that uses this function then acts as that user.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; name?: string | null; email?: string | null; role?: string } | undefined
  if (!user?.id) return null
  const real: SessionUser = { id: user.id, name: user.name ?? '', email: user.email ?? '', role: user.role ?? 'user' }

  if (demoMode() && real.role === 'admin') {
    const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value
    if (viewAs && viewAs !== real.id) {
      const other = await prisma.user.findFirst({
        where: { id: viewAs, active: true },
        select: { id: true, name: true, email: true, role: true },
      })
      if (other) return { ...other, viewAsBy: { id: real.id, name: real.name } }
    }
  }
  return real
}

/** Returns the user, or a 401/403 response to return from the route handler. */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser()
  return user ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return user
}
