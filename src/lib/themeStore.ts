import { create } from 'zustand'

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  accentColor: string
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  setAccentColor: (color: string) => void
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved =
    typeof window !== 'undefined'
      ? localStorage.getItem('theme-preferences')
      : null
  const defaults = saved ? JSON.parse(saved) : {}

  return {
    theme: defaults.theme || 'dark',
    sidebarCollapsed: defaults.sidebarCollapsed || false,
    accentColor: defaults.accentColor || 'blue',

    setTheme: (theme) => {
      set({ theme })
      const html = document.documentElement
      html.classList.remove('light', 'dark')
      html.classList.add(theme === 'system' ? 'dark' : theme)
      localStorage.setItem(
        'theme-preferences',
        JSON.stringify({ theme })
      )
    },

    toggleSidebar: () => {
      set((state) => {
        const next = { sidebarCollapsed: !state.sidebarCollapsed }
        localStorage.setItem(
          'theme-preferences',
          JSON.stringify({ ...next, theme: state.theme })
        )
        return next
      })
    },

    setAccentColor: (accentColor) => {
      set({ accentColor })
      localStorage.setItem(
        'theme-preferences',
        JSON.stringify({ accentColor })
      )
    },
  }
})
