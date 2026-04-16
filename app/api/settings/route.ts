import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

const DEFAULTS: Record<string, string> = {
  backgroundImage: '',
  backgroundOpacity: '15',
  theme: 'default',
}

export async function GET() {
  const rows = await prisma.systemSetting.findMany()
  const settings: Record<string, string> = { ...DEFAULTS }
  for (const row of rows) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

export async function PATCH(req: Request) {
  const body = await req.json() as Record<string, string>
  const allowed = Object.keys(DEFAULTS)
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) continue
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }
  return NextResponse.json({ success: true })
}
