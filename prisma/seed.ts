import { PrismaClient } from '@prisma/client'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CaseTypeConfigSchema } from '../lib/case-config/schema'

const prisma = new PrismaClient()
const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = await scryptAsync(password, salt, 64) as Buffer
  return `${buf.toString('hex')}.${salt}`
}

async function main() {
  // Ensure system placeholder user exists (used by workflow engine)
  await prisma.user.upsert({
    where: { id: 'system-placeholder-user' },
    create: {
      id: 'system-placeholder-user',
      name: 'System',
      email: 'system@nexus.internal',
      password: '',
      role: 'admin',
      active: false,
    },
    update: {},
  })

  // Create default admin if no real admin exists yet
  const adminExists = await prisma.user.findFirst({
    where: { role: 'admin', id: { not: 'system-placeholder-user' } },
  })

  if (!adminExists) {
    const password = await hashPassword('admin')
    await prisma.user.create({
      data: {
        name: 'Administrator',
        email: 'admin@nexus.internal',
        password,
        role: 'admin',
        active: true,
      },
    })
    console.log('Created default admin user:')
    console.log('  Email:    admin@nexus.internal')
    console.log('  Password: admin')
    console.log('  ⚠  Change the password after first login!')
  } else {
    console.log('Admin user already exists — skipping.')
  }

  // Seed default system views (idempotent — upsert by section+name+isDefault)
  const defaultViews = [
    // Cases
    { name: 'All cases',    section: 'cases',     icon: 'List',        filters: {},                      order: 0 },
    { name: 'Running',      section: 'cases',     icon: 'Clock',       filters: { status: 'running' },   order: 1 },
    { name: 'Completed',    section: 'cases',     icon: 'CheckCircle', filters: { status: 'completed' }, order: 2 },
    { name: 'Cancelled',    section: 'cases',     icon: 'FileX',       filters: { status: 'cancelled' }, order: 3 },
    { name: 'My cases',     section: 'cases',     icon: 'User',        filters: { view: 'mine' },        order: 4 },
    { name: 'Per workflow', section: 'cases',     icon: 'GitBranch',   filters: { view: 'by-workflow' }, order: 5 },
    // Documents
    { name: 'Library',          section: 'documents', icon: 'Library',     filters: {},                       order: 0 },
    { name: 'Pending Approval', section: 'documents', icon: 'Clock',       filters: { status: 'pending' },    order: 1 },
    { name: 'My Documents',     section: 'documents', icon: 'User',        filters: { view: 'mine' },         order: 2 },
    { name: 'Drafts',           section: 'documents', icon: 'FileInput',   filters: { status: 'draft' },      order: 3 },
    { name: 'Archived',         section: 'documents', icon: 'Archive',     filters: { status: 'archived' },   order: 4 },
  ]

  for (const v of defaultViews) {
    const existing = await prisma.systemView.findFirst({
      where: { section: v.section, name: v.name, isDefault: true },
    })
    if (!existing) {
      await prisma.systemView.create({
        data: { ...v, isDefault: true },
      })
    }
  }
  console.log('Default system views seeded.')

  // Demo case type: CANEA reference configuration EX-26714 (Deviation, Life Science/Pharma),
  // exported from Workshop-tool. Published as v1 if no case type uses the prefix yet.
  const deviation = CaseTypeConfigSchema.parse(
    JSON.parse(readFileSync(join(__dirname, '../lib/case-config/fixtures/deviation-pharma.json'), 'utf8'))
  )
  const owner = await prisma.user.findFirst({
    where: { role: 'admin', active: true, id: { not: 'system-placeholder-user' } },
    orderBy: { createdAt: 'asc' },
  })
  if (owner && !(await prisma.caseType.findUnique({ where: { prefix: deviation.prefix } }))) {
    await prisma.caseType.create({
      data: {
        name: deviation.caseTypeName,
        prefix: deviation.prefix,
        status: 'published',
        draft: deviation as never,
        createdBy: owner.id,
        versions: { create: { version: 1, config: deviation as never, publishedBy: owner.id } },
      },
    })
    console.log(`Case type "${deviation.caseTypeName}" (${deviation.prefix}) seeded and published.`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
