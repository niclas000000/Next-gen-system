import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { inbox } from '@/lib/cases/service'

export async function GET() {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  return NextResponse.json({ cases: await inbox(user.id) })
}
