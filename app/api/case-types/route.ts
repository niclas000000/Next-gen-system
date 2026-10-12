import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/session'
import { CaseTypeConfigSchema, emptyCaseTypeConfig } from '@/lib/case-config/schema'

export async function GET() {
  const caseTypes = await prisma.caseType.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      status: true,
      updatedAt: true,
      versions: { orderBy: { version: 'desc' }, take: 1, select: { version: true, publishedAt: true } },
      _count: { select: { cases: true } },
    },
  })
  return NextResponse.json({ caseTypes })
}

/** Body: { name } for a blank case type, or { config } — a full CaseTypeConfig, e.g. exported from Blueprint. */
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  const body = await req.json() as { name?: string; config?: unknown }
  const parsed = body.config
    ? CaseTypeConfigSchema.safeParse(body.config)
    : { success: true as const, data: emptyCaseTypeConfig(body.name?.trim() || undefined) }
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid configuration', issues: parsed.error.issues }, { status: 400 })
  }
  const config = parsed.data

  // Prefixes must be unique since they form the case numbers
  let prefix = config.prefix.trim().toUpperCase() || 'CASE'
  for (let n = 2; await prisma.caseType.findUnique({ where: { prefix } }); n++) {
    prefix = `${config.prefix.trim().toUpperCase() || 'CASE'}${n}`
  }
  config.prefix = prefix

  const caseType = await prisma.caseType.create({
    data: { name: config.caseTypeName, prefix, draft: config as never, createdBy: admin.id },
  })
  return NextResponse.json({ caseType }, { status: 201 })
}
