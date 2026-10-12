import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { demoMode, VIEW_AS_COOKIE } from '@/lib/auth/session'

/** Body: { userId } to view the app as that user, { userId: null } to go back. Admins only, demo mode only. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!demoMode() || role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = (await req.json()) as { userId: string | null }
  const res = NextResponse.json({ success: true })
  if (userId) res.cookies.set(VIEW_AS_COOKIE, userId, { httpOnly: true, sameSite: 'lax', path: '/' })
  else res.cookies.delete(VIEW_AS_COOKIE)
  return res
}
