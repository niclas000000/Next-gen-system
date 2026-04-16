import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { name?: string; description?: string; members?: string[] }

  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.members !== undefined ? { members: body.members } : {}),
    },
  })
  return NextResponse.json({ group })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.group.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
