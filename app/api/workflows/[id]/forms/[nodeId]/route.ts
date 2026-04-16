import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; nodeId: string }> }) {
  const { id, nodeId } = await params
  const form = await prisma.workflowForm.findUnique({
    where: { workflowId_nodeId: { workflowId: id, nodeId } },
  })
  return NextResponse.json({ form })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; nodeId: string }> }) {
  const { id, nodeId } = await params
  const body = await req.json() as { fields: unknown[]; settings: unknown }

  const form = await prisma.workflowForm.upsert({
    where: { workflowId_nodeId: { workflowId: id, nodeId } },
    create: {
      workflowId: id,
      nodeId,
      name: `Form for ${nodeId}`,
      fields: body.fields as object[],
      settings: body.settings as object,
    },
    update: {
      fields: body.fields as object[],
      settings: body.settings as object,
    },
  })

  return NextResponse.json({ form })
}
