import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = await prisma.workflow.findUnique({ where: { id } })
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ workflow })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.nodes !== undefined) updateData.nodes = body.nodes
  if (body.edges !== undefined) updateData.edges = body.edges
  if (body.settings !== undefined) updateData.settings = body.settings

  if (body.status !== undefined) {
    updateData.status = body.status
    // Increment version on publish
    if (body.status === 'published') {
      const current = await prisma.workflow.findUnique({ where: { id }, select: { version: true } })
      if (current) updateData.version = current.version + 1
    }
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ workflow })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.workflow.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
