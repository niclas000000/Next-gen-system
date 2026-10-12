import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './config'

export interface SessionUser {
  id: string
  name: string
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; name?: string | null; role?: string } | undefined
  if (!user?.id) return null
  return { id: user.id, name: user.name ?? '', role: user.role ?? 'user' }
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
