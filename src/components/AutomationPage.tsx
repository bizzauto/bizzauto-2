import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automationAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, Play, Pause, Zap, History, X, AlertCircle, CheckCircle, Clock } from 'lucide-react'

const triggers = ['contact_added', 'contact_updated', 'message_received', 'appointment_booked', 'order_created', 'review_received']
const actions = ['send_whatsapp', 'send_email', 'send_sms', 'add_tag', 'remove_tag', 'update_stage', 'create_task', 'notify_team']

export default function AutomationPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [formData, setFormData] = useState({ name: '', trigger: '', action: '', conditions: '', enabled: true })

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation', 'rules'],
    queryFn: () => automationAPI.getRules().then((r) => r.data),
  })

  const { data: runs } = useQuery({
    queryKey: ['automation', 'runs'],
    queryFn: () => automationAPI.getRuns().then((r) => r.data),
    enabled: showHistory,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => automationAPI.createRule(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      setShowCreate(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => automationAPI.updateRule(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] })
      setShowCreate(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationAPI.deleteRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => automationAPI.toggleRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation'] }),
  })

  const resetForm = () => {
    setFormData({ name: '', trigger: '', action: '', conditions: '', enabled: true })
    setEditing(null)
  }

  const openEdit = (rule: any) => {
    setEditing(rule)
    setFormData({ name: rule.name, trigger: rule.trigger, action: rule.action, conditions: rule.conditions || '', enabled: rule.enabled })
    setShowCreate(true)
  }

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('automation.title')}</h1>
          <p className="text-gray-400">{t('automation.subtitle', { total: rules?.length ?? 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
            <History className="w-5 h-5" />
            {t('automation.history')}
          </button>
          <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
            <Plus className="w-5 h-5" />
            {t('automation.create')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rules?.map((rule: any) => (
          <div key={rule.id} className="glass-effect rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${rule.enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  <Zap className={`w-6 h-6 ${rule.enabled ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">{rule.trigger}</span>
                    <span className="text-gray-500">→</span>
                    <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400">{rule.action}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleMutation.mutate(rule.id)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${rule.enabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'}`}>
                  {rule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(rule)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                <button onClick={() => deleteMutation.mutate(rule.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {rule.conditions && <p className="mt-3 text-sm text-gray-400">{t('automation.conditions')}: {rule.conditions}</p>}
            <p className="mt-1 text-xs text-gray-500">{t('automation.runs')}: {rule.runCount ?? 0}</p>
          </div>
        ))}
        {rules?.length === 0 && (
          <div className="text-center py-12">
            <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">{t('automation.noRules')}</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editing ? t('automation.edit') : t('automation.create')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('automation.ruleName')} />
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('automation.trigger')}</label>
                <select value={formData.trigger} onChange={(e) => setFormData({ ...formData, trigger: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                  <option value="">{t('automation.selectTrigger')}</option>
                  {triggers.map((tr) => <option key={tr} value={tr}>{t(`automation.triggers.${tr}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('automation.action')}</label>
                <select value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                  <option value="">{t('automation.selectAction')}</option>
                  {actions.map((ac) => <option key={ac} value={ac}>{t(`automation.actions.${ac}`)}</option>)}
                </select>
              </div>
              <input value={formData.conditions} onChange={(e) => setFormData({ ...formData, conditions: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('automation.conditionsPlaceholder')} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('automation.runHistory')}</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {runs?.map((run: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                  {run.success ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                  <div className="flex-1">
                    <p className="text-sm text-white">{run.ruleName}</p>
                    <p className="text-xs text-gray-500">{run.trigger}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(run.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {runs?.length === 0 && <p className="text-center text-gray-500 py-4">{t('automation.noRuns')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
