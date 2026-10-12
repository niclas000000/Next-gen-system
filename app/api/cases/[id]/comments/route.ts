import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { addComment } from '@/lib/cases/service'
import { handle } from '@/lib/cases/http'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const { body } = (await req.json()) as { body: string }
  return handle(async () => ({ comment: await addComment(id, user.id, body ?? '') }))
}
