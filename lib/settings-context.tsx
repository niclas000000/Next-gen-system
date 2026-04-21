'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AppSettings {
  backgroundImage: string
  backgroundOpacity: string
  theme: string
  navMode: 'v1' | 'v2'
}

const defaults: AppSettings = { backgroundImage: '', backgroundOpacity: '15', theme: 'default', navMode: 'v1' }

const SettingsContext = createContext<{
  settings: AppSettings
  reload: () => void
}>({ settings: defaults, reload: () => {} })

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults)

  const load = () => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ settings: s }: { settings: AppSettings }) => setSettings(s))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  return (
    <SettingsContext.Provider value={{ settings, reload: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
