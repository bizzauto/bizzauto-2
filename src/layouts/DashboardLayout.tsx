import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { useThemeStore } from '../lib/themeStore'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Megaphone,
  Bot,
  Wand2,
  Share2,
  Star,
  Calendar,
  ShoppingCart,
  FileText,
  Mail,
  UserPlus,
  BarChart3,
  CreditCard,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Languages,
  Key,
  ScrollText,
} from 'lucide-react'
import { setLanguage } from '../lib/i18n'
import { useTranslation } from 'react-i18next'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { path: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { path: '/automation', icon: Bot, label: 'Automation' },
  { path: '/ai-chatbot', icon: Bot, label: 'AI Chatbot' },
  { path: '/creative', icon: Wand2, label: 'Creative' },
  { path: '/social', icon: Share2, label: 'Social Media' },
  { path: '/reviews', icon: Star, label: 'Reviews' },
  { path: '/appointments', icon: Calendar, label: 'Appointments' },
  { path: '/ecommerce', icon: ShoppingCart, label: 'E-Commerce' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/email', icon: Mail, label: 'Email' },
  { path: '/leads', icon: UserPlus, label: 'Leads' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/billing', icon: CreditCard, label: 'Billing' },
  { path: '/team', icon: Users, label: 'Team' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/api-keys', icon: Key, label: 'API Keys' },
  { path: '/audit-log', icon: ScrollText, label: 'Audit Log' },
]

export default function DashboardLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const sidebarCollapsed = useThemeStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lang, setLang] = useState('en')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => {
    const next = lang === 'en' ? 'hi' : 'en'
    setLang(next)
    setLanguage(next)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BA</span>
            </div>
            {!sidebarCollapsed && (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                BizzAuto
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden p-1"
            aria-label="Close sidebar"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                className="p-1 text-gray-500 hover:text-red-500 transition"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1 text-gray-500"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden lg:block p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle language"
            >
              <Languages size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <ChevronDown size={14} className="text-gray-500" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/settings')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/billing')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Billing
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      logout()
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
