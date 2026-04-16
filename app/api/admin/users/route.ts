import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = await scryptAsync(password, salt, 64) as Buffer
  return `${buf.toString('hex')}.${salt}`
}

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, groups: true, active: true, createdAt: true },
  })
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; email: string; password: string; role?: string }
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const hashed = await hashPassword(body.password)
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, password: hashed, role: body.role ?? 'user' },
    select: { id: true, name: true, email: true, role: true, groups: true, active: true, createdAt: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}
