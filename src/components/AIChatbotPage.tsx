import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatbotAPI, aiAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, Play, Pause, MessageSquare, X, Send, Bot, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AIChatbotPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [showTest, setShowTest] = useState(false)
  const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([])
  const [testInput, setTestInput] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '', enabled: true, nodes: [] })

  const { data: flows, isLoading } = useQuery({
    queryKey: ['chatbot', 'flows'],
    queryFn: () => chatbotAPI.getFlows().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => chatbotAPI.createFlow(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot'] })
      setShowCreate(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => chatbotAPI.updateFlow(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot'] })
      setShowCreate(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatbotAPI.deleteFlow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatbot'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => chatbotAPI.toggleFlow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatbot'] }),
  })

  const testMutation = useMutation({
    mutationFn: (data: any) => aiAPI.reply(data).then((r) => r.data),
    onSuccess: (data) => {
      setTestMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    },
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', enabled: true, nodes: [] })
    setEditing(null)
  }

  const openEdit = (flow: any) => {
    setEditing(flow)
    setFormData({ name: flow.name, description: flow.description, enabled: flow.enabled, nodes: flow.nodes || [] })
    setShowCreate(true)
  }

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleTestSend = () => {
    if (testInput.trim()) {
      setTestMessages((prev) => [...prev, { role: 'user', content: testInput }])
      testMutation.mutate({ message: testInput, flowId: editing?.id })
      setTestInput('')
    }
  }

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('chatbot.title')}</h1>
          <p className="text-gray-400">{t('chatbot.subtitle', { total: flows?.length ?? 0 })}</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
          <Plus className="w-5 h-5" />
          {t('chatbot.createFlow')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flows?.map((flow: any) => (
          <div key={flow.id} className="glass-effect rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${flow.enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  <Bot className={`w-6 h-6 ${flow.enabled ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{flow.name}</h3>
                  <p className="text-sm text-gray-400">{flow.description}</p>
                </div>
              </div>
              <button onClick={() => toggleMutation.mutate(flow.id)} className="text-gray-400 hover:text-white">
                {flow.enabled ? <ToggleRight className="w-8 h-8 text-green-400" /> : <ToggleLeft className="w-8 h-8 text-gray-500" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditing(flow); setShowTest(true); setTestMessages([]) }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium">
                <MessageSquare className="w-4 h-4" />{t('chatbot.test')}
              </button>
              <button onClick={() => openEdit(flow)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-blue-400"><Edit className="w-4 h-4" /></button>
              <button onClick={() => deleteMutation.mutate(flow.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500">{t('chatbot.nodes')}: {flow.nodes?.length ?? 0}</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editing ? t('chatbot.editFlow') : t('chatbot.createFlow')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('chatbot.flowName')} />
              <input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('chatbot.description')} />
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} className="rounded border-gray-600 bg-gray-800 text-green-500" />
                <span className="text-white">{t('chatbot.enableFlow')}</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('chatbot.testChat')}</h3>
              <button onClick={() => setShowTest(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[400px]">
              {testMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {testMutation.isPending && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-lg bg-gray-700 text-white">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input value={testInput} onChange={(e) => setTestInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTestSend()} className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('chatbot.typeMessage')} />
              <button onClick={handleTestSend} disabled={!testInput.trim() || testMutation.isPending} className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"><Send className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
