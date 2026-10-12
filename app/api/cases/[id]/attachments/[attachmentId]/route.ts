import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { readAttachment } from '@/lib/cases/attachments'
import { CaseError } from '@/lib/cases/service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const user = await requireUser()
  if (user instanceof NextResponse) return user
  const { id, attachmentId } = await params
  try {
    const { att, data } = await readAttachment(id, attachmentId)
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': att.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(att.fileName)}"`,
      },
    })
  } catch (e) {
    if (e instanceof CaseError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
