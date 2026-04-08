import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { defaultWorkflowSettings, makeInitialNodes, SYSTEM_USER_ID } from '@/lib/workflow-defaults'

async function ensureSystemUser() {
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      name: 'Niclas Svensson',
      email: 'niclas@nexus.local',
      password: 'placeholder',
      role: 'admin',
    },
    update: {},
  })
}

export async function GET() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      version: true,
      nodes: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json({ workflows })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, description } = body as { name: string; description?: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  await ensureSystemUser()

  const workflow = await prisma.workflow.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? '',
      status: 'draft',
      version: 1,
      nodes: makeInitialNodes() as object[],
      edges: [],
      settings: defaultWorkflowSettings as object,
      createdBy: SYSTEM_USER_ID,
    },
  })

  return NextResponse.json({ workflow }, { status: 201 })
}
