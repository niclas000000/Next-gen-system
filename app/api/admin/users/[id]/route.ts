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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { name?: string; email?: string; role?: string; active?: boolean; password?: string; groups?: string[] }

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.email !== undefined) updateData.email = body.email
  if (body.role !== undefined) updateData.role = body.role
  if (body.active !== undefined) updateData.active = body.active
  if (body.groups !== undefined) updateData.groups = body.groups
  if (body.password) updateData.password = await hashPassword(body.password)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, groups: true, active: true, createdAt: true },
  })
  return NextResponse.json({ user })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (id === 'system-placeholder-user') {
    return NextResponse.json({ error: 'Cannot delete system user' }, { status: 403 })
  }
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
