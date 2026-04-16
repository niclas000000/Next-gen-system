'use client'

import { useSettings } from '@/lib/settings-context'

export function DashboardBackground({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const opacity = Math.min(100, Math.max(0, parseInt(settings.backgroundOpacity ?? '15', 10))) / 100

  return (
    <div className="flex-1 overflow-hidden relative min-h-0">
      {settings.backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: `url(${settings.backgroundImage})`, opacity }}
          aria-hidden="true"
        />
      )}
      <div className="relative h-full flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
