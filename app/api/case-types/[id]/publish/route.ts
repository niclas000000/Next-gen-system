import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/session'
import { publishCaseType } from '@/lib/case-config/publish'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id } = await params

  const result = await publishCaseType(id, admin.id)
  if ('issues' in result) {
    return NextResponse.json({ error: 'Fix the errors before publishing', issues: result.issues }, { status: 422 })
  }
  return NextResponse.json(result)
}
