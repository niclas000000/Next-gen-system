import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET(_req: Request, { params }: { params: { id: string; nodeId: string } }) {
  const form = await prisma.workflowForm.findUnique({
    where: { workflowId_nodeId: { workflowId: params.id, nodeId: params.nodeId } },
  })
  return NextResponse.json({ form })
}

export async function PUT(req: Request, { params }: { params: { id: string; nodeId: string } }) {
  const body = await req.json() as { fields: unknown[]; settings: unknown }

  const form = await prisma.workflowForm.upsert({
    where: { workflowId_nodeId: { workflowId: params.id, nodeId: params.nodeId } },
    create: {
      workflowId: params.id,
      nodeId: params.nodeId,
      name: `Form for ${params.nodeId}`,
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
