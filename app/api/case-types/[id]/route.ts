import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/session'
import { CaseTypeConfigSchema } from '@/lib/case-config/schema'
import { validateCaseType } from '@/lib/case-config/validate'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caseType = await prisma.caseType.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: 'desc' }, select: { id: true, version: true, publishedAt: true, publishedBy: true } },
      _count: { select: { cases: true } },
    },
  })
  if (!caseType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const draft = CaseTypeConfigSchema.parse(caseType.draft)
  return NextResponse.json({ caseType: { ...caseType, draft }, issues: validateCaseType(draft) })
}

/** Body: { draft?: CaseTypeConfig, roleBindings? } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id } = await params

  const body = await req.json() as { draft?: unknown; roleBindings?: Record<string, { userIds?: string[]; groupIds?: string[] }> }
  const data: { draft?: never; roleBindings?: never } = {}

  if (body.draft !== undefined) {
    const parsed = CaseTypeConfigSchema.safeParse(body.draft)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid configuration', issues: parsed.error.issues }, { status: 400 })
    }
    data.draft = parsed.data as never
  }
  if (body.roleBindings !== undefined) data.roleBindings = body.roleBindings as never

  const caseType = await prisma.caseType.update({ where: { id }, data })
  const draft = CaseTypeConfigSchema.parse(caseType.draft)
  return NextResponse.json({ caseType: { ...caseType, draft }, issues: validateCaseType(draft) })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin
  const { id } = await params

  const cases = await prisma.case.count({ where: { caseTypeId: id } })
  if (cases > 0) {
    return NextResponse.json({ error: 'The case type has cases — archive it instead' }, { status: 409 })
  }
  await prisma.caseType.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
