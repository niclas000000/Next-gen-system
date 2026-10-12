import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { uploadAttachment } from '@/lib/cases/attachments'
import { handle } from '@/lib/cases/http'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const { id } = await params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  const fieldId = form.get('fieldId')
  return handle(async () => ({ attachment: await uploadAttachment(id, user.id, file, typeof fieldId === 'string' ? fieldId : null) }))
}
