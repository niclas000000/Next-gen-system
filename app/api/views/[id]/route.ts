import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const view = await prisma.savedView.findUnique({ where: { id } })
  if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (view.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.savedView.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
