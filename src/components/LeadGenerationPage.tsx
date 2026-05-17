import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsAPI, contactsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Users, Download, Search, X, AlertCircle, CheckCircle, Globe, Facebook, Instagram, Phone } from 'lucide-react'

const sources = [
  { id: 'indiamart', name: 'IndiaMART', icon: Globe, color: 'blue' },
  { id: 'justdial', name: 'JustDial', icon: Phone, color: 'green' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'blue' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'pink' },
]

export default function LeadGenerationPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('')
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', source: 'facebook', notes: '' })

  const { data: stats } = useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: () => leadsAPI.stats().then((r) => r.data),
  })

  const { data: leads } = useQuery({
    queryKey: ['contacts', 'leads', sourceFilter],
    queryFn: () => contactsAPI.list({ source: sourceFilter, tags: 'lead' }).then((r) => r.data),
  })

  const captureMutation = useMutation({
    mutationFn: (data: any) => contactsAPI.create({ ...data, tags: ['lead'] }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setShowForm(false)
      setFormData({ name: '', email: '', phone: '', company: '', source: 'facebook', notes: '' })
    },
  })

  const handleExport = () => {
    leadsAPI.export().then((r) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data)]))
      a.download = 'leads.json'
      a.click()
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('leads.title')}</h1>
          <p className="text-gray-400">{t('leads.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">
            <Download className="w-5 h-5" />{t('leads.export')}
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Plus className="w-5 h-5" />{t('leads.addLead')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sources.map((source) => {
          const count = stats?.bySource?.[source.id] ?? 0
          return (
            <button key={source.id} onClick={() => setSourceFilter(sourceFilter === source.id ? '' : source.id)} className={`glass-effect rounded-xl p-5 text-center transition-colors ${sourceFilter === source.id ? 'border-blue-500/40' : ''}`}>
              <source.icon className={`w-8 h-8 text-${source.color}-400 mx-auto mb-2`} />
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-sm text-gray-400">{source.name}</p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-blue-400">{stats?.totalLeads ?? 0}</p>
          <p className="text-sm text-gray-400">{t('leads.totalLeads')}</p>
        </div>
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-green-400">{stats?.convertedLeads ?? 0}</p>
          <p className="text-sm text-gray-400">{t('leads.converted')}</p>
        </div>
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-yellow-400">{stats?.conversionRate ?? 0}%</p>
          <p className="text-sm text-gray-400">{t('leads.conversionRate')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {leads?.items?.map((lead: any) => (
          <div key={lead.id} className="glass-effect rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{lead.name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{lead.email}</span>
                  <span>{lead.phone}</span>
                  {lead.company && <span>{lead.company}</span>}
                </div>
                {lead.source && (
                  <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">{lead.source}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${lead.status === 'new' ? 'bg-green-500/20 text-green-400' : lead.status === 'contacted' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{lead.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('leads.addLead')}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('leads.name')} />
              <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('leads.email')} />
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('leads.phone')} />
              <input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('leads.company')} />
              <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={2} placeholder={t('leads.notes')} />
            </div>
            <button onClick={() => captureMutation.mutate(formData)} disabled={!formData.name || captureMutation.isPending} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
