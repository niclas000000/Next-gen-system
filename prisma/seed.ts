import { PrismaClient } from '@prisma/client'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'

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
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
