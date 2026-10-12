import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { getCaseDetail, saveCase } from '@/lib/cases/service'
import { handle } from '@/lib/cases/http'
import type { CaseValues } from '@/lib/case-config/runtime'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  return handle(() => getCaseDetail(id, user.id))
}

/** Body: { values, revision } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const body = (await req.json()) as { values?: CaseValues; revision: number }
  return handle(() => saveCase(id, user.id, body.values ?? {}, body.revision))
}
