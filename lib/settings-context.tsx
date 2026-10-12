'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

interface AppSettings {
  /** Default theme for everyone, set under Admin → Appearance */
  theme: ThemeChoice
}

const defaults: AppSettings = { theme: 'light' }
const USER_THEME_KEY = 'nexus-theme'

interface SettingsApi {
  settings: AppSettings
  reload: () => void
  /** This browser's choice; null = follow the default */
  userTheme: ThemeChoice | null
  setUserTheme: (t: ThemeChoice | null) => void
  /** The theme in effect right now */
  resolvedTheme: 'light' | 'dark'
}

const SettingsContext = createContext<SettingsApi>({
  settings: defaults,
  reload: () => {},
  userTheme: null,
  setUserTheme: () => {},
  resolvedTheme: 'light',
})

const asTheme = (v: unknown): ThemeChoice => (v === 'dark' || v === 'system' ? v : 'light')

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults)
  const [userTheme, setUserThemeState] = useState<ThemeChoice | null>(null)
  const [systemDark, setSystemDark] = useState(false)

  const load = useCallback(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ settings: s }: { settings: Record<string, string> }) => setSettings({ theme: asTheme(s.theme) }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    try {
      const stored = localStorage.getItem(USER_THEME_KEY)
      if (stored) setUserThemeState(asTheme(stored))
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [load])

  const choice = userTheme ?? settings.theme
  const resolvedTheme = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setUserTheme = (t: ThemeChoice | null) => {
    setUserThemeState(t)
    try {
      if (t) localStorage.setItem(USER_THEME_KEY, t)
      else localStorage.removeItem(USER_THEME_KEY)
    } catch {}
  }

  return (
    <SettingsContext.Provider value={{ settings, reload: load, userTheme, setUserTheme, resolvedTheme }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
