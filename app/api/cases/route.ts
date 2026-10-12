import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { createCase, listCases } from '@/lib/cases/service'
import { handle } from '@/lib/cases/http'

export async function GET(req: Request) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const p = new URL(req.url).searchParams
  return handle(() =>
    listCases(
      {
        caseTypeId: p.get('caseTypeId') ?? undefined,
        status: p.get('status') ?? undefined,
        mine: p.get('view') === 'mine' ? '1' : undefined,
        q: p.get('q') ?? undefined,
        page: Number(p.get('page') ?? 1),
        pageSize: Number(p.get('pageSize') ?? 25),
      },
      user.id
    )
  )
}

export async function POST(req: Request) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const body = (await req.json()) as { caseTypeId?: string; title?: string; parent?: { caseId: string; fieldId: string } }
  if (!body.caseTypeId) return NextResponse.json({ error: 'caseTypeId required' }, { status: 400 })
  return handle(async () => ({ case: await createCase(body.caseTypeId!, body.title ?? '', user.id, body.parent) }))
}
