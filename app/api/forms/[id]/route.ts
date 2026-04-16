import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = await prisma.form.findUnique({ where: { id } })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ form })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { name?: string; description?: string; fields?: unknown; settings?: unknown }
  const form = await prisma.form.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.fields !== undefined ? { fields: body.fields as never } : {}),
      ...(body.settings !== undefined ? { settings: body.settings as never } : {}),
    },
  })
  return NextResponse.json({ form })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.form.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
