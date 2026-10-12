import type { Metadata } from 'next'
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import { prisma } from '@/lib/db/client'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

// Every page reads live data (and the theme default), so nothing is prerendered at build time
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nexus',
  description: 'Documents, processes and cases in one governance platform',
}

// Sets the theme before first paint (no light flash): this browser's choice, else the admin default
const THEME_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('nexus-theme')||d.getAttribute('data-default-theme')||'light';if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.theme=t;d.style.colorScheme=t}catch(e){}})()`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'theme' } }).catch(() => null)
  const defaultTheme = setting?.value === 'dark' || setting?.value === 'system' ? setting.value : 'light'
  return (
    <html lang="en" data-default-theme={defaultTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
