import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const body = await req.json() as { type: 'document' | 'workflow'; targetId: string }

  if (body.type === 'document') {
    await prisma.processDocument.upsert({
      where: { processId_documentId: { processId, documentId: body.targetId } },
      create: { processId, documentId: body.targetId },
      update: {},
    })
  } else if (body.type === 'workflow') {
    await prisma.processWorkflow.upsert({
      where: { processId_workflowId: { processId, workflowId: body.targetId } },
      create: { processId, workflowId: body.targetId },
      update: {},
    })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const body = await req.json() as { type: 'document' | 'workflow'; targetId: string }

  if (body.type === 'document') {
    await prisma.processDocument.delete({
      where: { processId_documentId: { processId, documentId: body.targetId } },
    })
  } else if (body.type === 'workflow') {
    await prisma.processWorkflow.delete({
      where: { processId_workflowId: { processId, workflowId: body.targetId } },
    })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
