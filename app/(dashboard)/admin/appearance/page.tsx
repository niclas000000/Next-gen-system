import { prisma } from '@/lib/db/client'
import { AppearanceClient } from './AppearanceClient'

export default async function AppearancePage() {
  const rows = await prisma.systemSetting.findMany()
  const settings: Record<string, string> = { backgroundImage: '', backgroundOpacity: '15', theme: 'default' }
  for (const row of rows) settings[row.key] = row.value
  return <AppearanceClient initialSettings={settings} />
}
