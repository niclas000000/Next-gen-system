import { PrismaClient } from '@prisma/client'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'
import { BUILT_IN_CASE_TYPES, builtInConfig } from '../lib/case-config/fixtures'

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
    { name: 'Open cases',   section: 'cases',     icon: 'Clock',       filters: {},                      order: 0 },
    { name: 'My cases',     section: 'cases',     icon: 'User',        filters: { view: 'mine' },        order: 1 },
    { name: 'Closed',       section: 'cases',     icon: 'CheckCircle', filters: { status: 'closed' },    order: 2 },
    { name: 'Cancelled',    section: 'cases',     icon: 'FileX',       filters: { status: 'cancelled' }, order: 3 },
    { name: 'All cases',    section: 'cases',     icon: 'List',        filters: { status: 'all' },       order: 4 },
    // Documents
    { name: 'Library',          section: 'documents', icon: 'Library',     filters: {},                       order: 0 },
    { name: 'Pending Approval', section: 'documents', icon: 'Clock',       filters: { status: 'pending' },    order: 1 },
    { name: 'My Documents',     section: 'documents', icon: 'User',        filters: { view: 'mine' },         order: 2 },
    { name: 'Drafts',           section: 'documents', icon: 'FileInput',   filters: { status: 'draft' },      order: 3 },
    { name: 'Archived',         section: 'documents', icon: 'Archive',     filters: { status: 'archived' },   order: 4 },
  ]

  // Default case views from the graph-workflow era used other statuses
  await prisma.systemView.deleteMany({
    where: { section: 'cases', isDefault: true, name: { in: ['Running', 'Completed', 'Per workflow'] } },
  })
  await prisma.systemView.updateMany({
    where: { section: 'cases', isDefault: true, name: 'All cases', filters: { equals: {} } },
    data: { filters: { status: 'all' }, order: 4 },
  })
  await prisma.systemView.updateMany({ where: { section: 'cases', isDefault: true, name: 'My cases' }, data: { order: 1 } })

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

  // Built-in case types: CANEA reference configurations (Deviation EX-26714, CAPA EX-26738, Action)
  // exported from Workshop-tool. Each is published as v1 if no case type uses its prefix yet.
  const owner = await prisma.user.findFirst({
    where: { role: 'admin', active: true, id: { not: 'system-placeholder-user' } },
    orderBy: { createdAt: 'asc' },
  })
  for (const { prefix } of BUILT_IN_CASE_TYPES) {
    if (!owner || (await prisma.caseType.findUnique({ where: { prefix } }))) continue
    const config = builtInConfig(prefix)
    await prisma.caseType.create({
      data: {
        name: config.caseTypeName,
        prefix,
        status: 'published',
        draft: config as never,
        createdBy: owner.id,
        versions: { create: { version: 1, config: config as never, publishedBy: owner.id } },
      },
    })
    console.log(`Case type "${config.caseTypeName}" (${prefix}) seeded and published.`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
