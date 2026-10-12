import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { cancelCase, moveCase, pressButton, takeCase, type Signature } from '@/lib/cases/service'
import { handle } from '@/lib/cases/http'
import type { CaseValues } from '@/lib/case-config/runtime'

interface Body {
  action: 'forward' | 'backward' | 'preEnd' | 'take' | 'button' | 'cancel'
  revision: number
  values?: CaseValues
  signature?: Signature
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const body = (await req.json()) as Body

  switch (body.action) {
    case 'forward':
    case 'backward':
    case 'preEnd':
      return handle(() => moveCase(id, user.id, body.action as 'forward', body.revision, body.values, body.signature))
    case 'take':
      return handle(() => takeCase(id, user.id, body.revision))
    case 'button':
      return handle(() => pressButton(id, user.id, body.revision, body.values ?? {}))
    case 'cancel':
      if (user.role !== 'admin') return NextResponse.json({ error: 'Only administrators can cancel cases' }, { status: 403 })
      return handle(() => cancelCase(id, user.id, body.revision))
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
