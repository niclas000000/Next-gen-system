import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const body = await req.json() as { type: 'document' | 'caseType'; targetId: string }

  if (body.type === 'document') {
    await prisma.processDocument.upsert({
      where: { processId_documentId: { processId, documentId: body.targetId } },
      create: { processId, documentId: body.targetId },
      update: {},
    })
  } else if (body.type === 'caseType') {
    await prisma.processCaseType.upsert({
      where: { processId_caseTypeId: { processId, caseTypeId: body.targetId } },
      create: { processId, caseTypeId: body.targetId },
      update: {},
    })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: processId } = await params
  const body = await req.json() as { type: 'document' | 'caseType'; targetId: string }

  if (body.type === 'document') {
    await prisma.processDocument.delete({
      where: { processId_documentId: { processId, documentId: body.targetId } },
    })
  } else if (body.type === 'caseType') {
    await prisma.processCaseType.delete({
      where: { processId_caseTypeId: { processId, caseTypeId: body.targetId } },
    })
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
