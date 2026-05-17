import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessAPI, settingsAPI, authAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useThemeStore } from '../lib/themeStore'
import { useTranslation } from 'react-i18next'
import { Building2, Bell, Shield, Save, Sun, Moon, Smartphone } from 'lucide-react'

export default function SettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<any>({})
  const [autopilot, setAutopilot] = useState<any>({})
  const [show2FA, setShow2FA] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorSetup, setTwoFactorSetup] = useState<any>(null)

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: () => businessAPI.get().then((r) => r.data.data),
  })

  useEffect(() => {
    if (business) setSettings(business)
  }, [business])

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsAPI.updateBusiness(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
    },
  })

  const updateAutopilotMutation = useMutation({
    mutationFn: (data: any) => settingsAPI.updateAutopilot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
    },
  })

  const setup2FAMutation = useMutation({
    mutationFn: () => authAPI.setup2FA(),
    onSuccess: (data) => setTwoFactorSetup(data.data.data),
  })

  const enable2FAMutation = useMutation({
    mutationFn: (token: string) => authAPI.enable2FA({ token }),
    onSuccess: () => {
      setShow2FA(false)
      setTwoFactorSetup(null)
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
    },
  })

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'autopilot', label: 'Autopilot', icon: Smartphone },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.title') || 'Settings'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business Name</label>
            <input
              value={settings.name || ''}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              value={settings.phone || ''}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={settings.email || ''}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select
              value={settings.timezone || 'Asia/Kolkata'}
              onChange={(e) => setSettings((prev: any) => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Sun size={16} /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Moon size={16} /> Dark
              </button>
            </div>
          </div>
          <button
            onClick={() => updateSettingsMutation.mutate(settings)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      )}

      {/* Autopilot Settings */}
      {activeTab === 'autopilot' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-medium">Enable Autopilot</label>
            <button
              onClick={() =>
                setAutopilot((prev: any) => ({ ...prev, isEnabled: !prev.isEnabled }))
              }
              className={`w-12 h-6 rounded-full transition ${
                autopilot.isEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition ${
                  autopilot.isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Welcome Message</label>
            <textarea
              value={autopilot.welcomeMessage || ''}
              onChange={(e) =>
                setAutopilot((prev: any) => ({ ...prev, welcomeMessage: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">AI Tone</label>
            <select
              value={autopilot.aiTone || 'professional'}
              onChange={(e) =>
                setAutopilot((prev: any) => ({ ...prev, aiTone: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
            </select>
          </div>
          <button
            onClick={() => updateAutopilotMutation.mutate(autopilot)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="font-semibold">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500">
            Status: {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </p>
          {!user?.twoFactorEnabled && (
            <button
              onClick={() => setup2FAMutation.mutate()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Setup 2FA
            </button>
          )}
          {twoFactorSetup && (
            <div className="space-y-4">
              <img src={twoFactorSetup.qrCode} alt="2FA QR" className="w-48 h-48" />
              <p className="text-sm font-mono">{twoFactorSetup.secret}</p>
              <input
                placeholder="Enter 6-digit code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
              />
              <button
                onClick={() => enable2FAMutation.mutate(twoFactorCode)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Verify & Enable
              </button>
            </div>
          )}
          <div className="pt-4">
            <h3 className="font-semibold">Backup Codes</h3>
            <p className="text-sm text-gray-500">
              Store these safely - they can be used once each
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
          {['New contact', 'Message received', 'Campaign completed', 'Payment received'].map(
            (item) => (
              <div key={item} className="flex items-center justify-between">
                <span>{item}</span>
                <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5" />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
