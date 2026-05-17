import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Play, Pause, Send, Search, X, Mail, Settings, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

export default function EmailMarketingPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({ name: '', subject: '', content: '', audience: 'all', schedule: '' })
  const [testEmail, setTestEmail] = useState('')
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '587', user: '', password: '', secure: true })

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email', 'campaigns', search],
    queryFn: () => campaignsAPI.list({ search, channel: 'email' }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => campaignsAPI.create({ ...data, channel: 'email' }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email'] })
      setShowCreate(false)
      setFormData({ name: '', subject: '', content: '', audience: 'all', schedule: '' })
    },
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email'] }),
  })

  const sendTestMutation = useMutation({
    mutationFn: (data: any) => campaignsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      setShowTest(false)
      setTestEmail('')
    },
  })

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('email.title')}</h1>
          <p className="text-gray-400">{t('email.subtitle', { total: campaigns?.total ?? 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">
            <Settings className="w-5 h-5" />{t('email.smtp')}
          </button>
          <button onClick={() => { setShowCreate(true); setFormData({ name: '', subject: '', content: '', audience: 'all', schedule: '' }) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Plus className="w-5 h-5" />{t('email.create')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('email.search')} />
      </div>

      <div className="space-y-3">
        {campaigns?.items?.map((campaign: any) => (
          <div key={campaign.id} className="glass-effect rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                  <p className="text-sm text-gray-400">{campaign.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{t('email.sent')}: {campaign.sent ?? 0}</span>
                    <span>{t('email.opened')}: {campaign.opened ?? 0}</span>
                    <span>{t('email.clicked')}: {campaign.clicked ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${campaign.status === 'active' ? 'bg-green-500/20 text-green-400' : campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{campaign.status}</span>
                {campaign.status === 'draft' && <button onClick={() => startMutation.mutate(campaign.id)} className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"><Play className="w-4 h-4" /></button>}
                {campaign.status === 'active' && <button onClick={() => pauseMutation.mutate(campaign.id)} className="p-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white"><Pause className="w-4 h-4" /></button>}
                {campaign.status === 'paused' && <button onClick={() => resumeMutation.mutate(campaign.id)} className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"><Play className="w-4 h-4" /></button>}
                <button onClick={() => { setShowTest(true); setFormData({ name: campaign.name, subject: campaign.subject, content: campaign.message, audience: 'all', schedule: '' }) }} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white"><Send className="w-4 h-4" /></button>
                <button onClick={() => deleteMutation.mutate(campaign.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('email.createCampaign')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('email.campaignName')} />
              <input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('email.subject')} />
              <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={6} placeholder={t('email.content')} />
              <select value={formData.audience} onChange={(e) => setFormData({ ...formData, audience: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="all">{t('email.allContacts')}</option>
                <option value="active">{t('email.activeContacts')}</option>
                <option value="segment">{t('email.segment')}</option>
              </select>
              <input type="datetime-local" value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" />
            </div>
            <button onClick={() => createMutation.mutate(formData)} disabled={!formData.name || !formData.subject} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
          </div>
        </div>
      )}

      {showTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('email.sendTest')}</h3>
              <button onClick={() => setShowTest(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('email.testEmail')} />
            <button onClick={() => sendTestMutation.mutate({ name: 'Test', subject: formData.subject, content: formData.content, audience: 'test', testEmail })} disabled={!testEmail} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('email.sendTest')}</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('email.smtpConfig')}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder="smtp.gmail.com" />
              <input value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder="587" />
              <input value={smtpConfig.user} onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder="email@example.com" />
              <input type="password" value={smtpConfig.password} onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder="Password" />
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={smtpConfig.secure} onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })} className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                <span className="text-white">{t('email.useTLS')}</span>
              </label>
            </div>
            <button className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">{t('common.save')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
