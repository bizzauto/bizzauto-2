import { Outlet, Link, useLocation } from 'react-router-dom'
import { useThemeStore } from '../lib/themeStore'
import { Sun, Moon, Languages } from 'lucide-react'
import { setLanguage } from '../lib/i18n'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export default function AuthLayout() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [lang, setLang] = useState('en')
  const location = useLocation()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const toggleLang = () => {
    const next = lang === 'en' ? 'hi' : 'en'
    setLang(next)
    setLanguage(next)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col">
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button
          onClick={toggleLang}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Toggle language"
        >
          <Languages size={18} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-bold text-white">
              Bizz<span className="text-blue-400">Auto</span>
            </Link>
            <p className="text-gray-400 mt-2">
              {location.pathname === '/login'
                ? t('auth.signIn')
                : location.pathname === '/register'
                  ? t('auth.signUp')
                  : ''}
            </p>
          </div>
          <Outlet />
        </div>
      </div>

      <footer className="text-center py-4 text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} BizzAuto. All rights reserved.
      </footer>
    </div>
  )
}
