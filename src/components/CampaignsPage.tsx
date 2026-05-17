import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsAPI, contactsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Play, Pause, Edit, Trash2, Search, X, Users, MessageSquare, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

export default function CampaignsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [showDrip, setShowDrip] = useState(false)
  const [dripSteps, setDripSteps] = useState([{ delay: 0, message: '', channel: 'whatsapp' }])
  const [formData, setFormData] = useState({ name: '', channel: 'whatsapp', message: '', audience: 'all', schedule: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', search],
    queryFn: () => campaignsAPI.list({ search }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => campaignsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setShowCreate(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => campaignsAPI.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setShowCreate(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const resetForm = () => {
    setFormData({ name: '', channel: 'whatsapp', message: '', audience: 'all', schedule: '' })
    setEditing(null)
  }

  const openEdit = (campaign: any) => {
    setEditing(campaign)
    setFormData({ name: campaign.name, channel: campaign.channel, message: campaign.message, audience: campaign.audience, schedule: campaign.schedule })
    setShowCreate(true)
  }

  const handleSubmit = () => {
    const data = { ...formData, dripSteps: showDrip ? dripSteps : undefined }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const addDripStep = () => setDripSteps([...dripSteps, { delay: 0, message: '', channel: 'whatsapp' }])
  const removeDripStep = (i: number) => setDripSteps(dripSteps.filter((_, idx) => idx !== i))
  const updateDripStep = (i: number, field: string, value: any) => {
    const updated = [...dripSteps]
    updated[i] = { ...updated[i], [field]: value }
    setDripSteps(updated)
  }

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('campaigns.title')}</h1>
          <p className="text-gray-400">{t('campaigns.subtitle', { total: data?.total ?? 0 })}</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
          <Plus className="w-5 h-5" />
          {t('campaigns.create')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('campaigns.search')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items?.map((campaign: any) => (
          <div key={campaign.id} className="glass-effect rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                  campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>{campaign.status}</span>
              </div>
              <span className="text-xs text-gray-500">{campaign.channel}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-gray-800/30">
                <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-white">{campaign.sent ?? 0}</p>
                <p className="text-xs text-gray-500">{t('campaigns.sent')}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-800/30">
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-white">{campaign.delivered ?? 0}</p>
                <p className="text-xs text-gray-500">{t('campaigns.delivered')}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-800/30">
                <MessageSquare className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-white">{campaign.replies ?? 0}</p>
                <p className="text-xs text-gray-500">{t('campaigns.replies')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {campaign.status === 'draft' && (
                <button onClick={() => startMutation.mutate(campaign.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
                  <Play className="w-4 h-4" />{t('campaigns.start')}
                </button>
              )}
              {campaign.status === 'active' && (
                <button onClick={() => pauseMutation.mutate(campaign.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium">
                  <Pause className="w-4 h-4" />{t('campaigns.pause')}
                </button>
              )}
              {campaign.status === 'paused' && (
                <button onClick={() => resumeMutation.mutate(campaign.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
                  <Play className="w-4 h-4" />{t('campaigns.resume')}
                </button>
              )}
              <button onClick={() => openEdit(campaign)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white"><Edit className="w-4 h-4" /></button>
              <button onClick={() => deleteMutation.mutate(campaign.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editing ? t('campaigns.edit') : t('campaigns.create')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('campaigns.name')} />
              <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={4} placeholder={t('campaigns.message')} />
              <select value={formData.audience} onChange={(e) => setFormData({ ...formData, audience: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="all">{t('campaigns.allContacts')}</option>
                <option value="active">{t('campaigns.activeContacts')}</option>
                <option value="segment">{t('campaigns.segment')}</option>
              </select>
              <input type="datetime-local" value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" />
            </div>

            <div className="border-t border-gray-700 pt-4">
              <button onClick={() => setShowDrip(!showDrip)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                {showDrip ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {t('campaigns.dripCampaign')}
              </button>
              {showDrip && (
                <div className="mt-3 space-y-3">
                  {dripSteps.map((step, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-800/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{t('campaigns.step', { num: i + 1 })}</span>
                        {i > 0 && <button onClick={() => removeDripStep(i)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>}
                      </div>
                      <input type="number" value={step.delay} onChange={(e) => updateDripStep(i, 'delay', parseInt(e.target.value))} className="w-full px-3 py-1 rounded bg-gray-800/50 border border-gray-700 text-white text-sm" placeholder={t('campaigns.delayHours')} />
                      <input value={step.message} onChange={(e) => updateDripStep(i, 'message', e.target.value)} className="w-full px-3 py-1 rounded bg-gray-800/50 border border-gray-700 text-white text-sm" placeholder={t('campaigns.message')} />
                      <select value={step.channel} onChange={(e) => updateDripStep(i, 'channel', e.target.value)} className="w-full px-3 py-1 rounded bg-gray-800/50 border border-gray-700 text-white text-sm">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>
                  ))}
                  <button onClick={addDripStep} className="text-sm text-blue-400 hover:text-blue-300">{t('campaigns.addStep')}</button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
