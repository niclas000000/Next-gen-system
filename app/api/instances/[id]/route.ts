import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const instance = await prisma.workflowInstance.findUnique({
    where: { id },
    include: {
      workflow: {
        select: { id: true, name: true, description: true, nodes: true, edges: true, forms: true },
      },
      steps: { orderBy: { startedAt: 'asc' } },
    },
  })

  if (!instance) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ instance })
}
