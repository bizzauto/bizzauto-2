import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Sparkles, Copy, History, CreditCard, X, Wand2, Hash, MessageSquare, Image } from 'lucide-react'

const contentTypes = [
  { id: 'caption', label: 'Caption', icon: MessageSquare },
  { id: 'hashtags', label: 'Hashtags', icon: Hash },
  { id: 'reply', label: 'Reply', icon: MessageSquare },
  { id: 'poster', label: 'Poster', icon: Image },
]

export default function CreativeGeneratorPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [contentType, setContentType] = useState('caption')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<any>(null)
  const [showHistory, setShowHistory] = useState(false)

  const { data: credits } = useQuery({
    queryKey: ['ai', 'credits'],
    queryFn: () => aiAPI.credits().then((r) => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['ai', 'history'],
    queryFn: () => aiAPI.history().then((r) => r.data),
    enabled: showHistory,
  })

  const generateMutation = useMutation({
    mutationFn: (data: any) => aiAPI.generate(data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['ai', 'credits'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] })
    },
  })

  const hashtagsMutation = useMutation({
    mutationFn: (data: any) => aiAPI.hashtags(data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['ai', 'credits'] })
    },
  })

  const replyMutation = useMutation({
    mutationFn: (data: any) => aiAPI.reply(data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['ai', 'credits'] })
    },
  })

  const posterMutation = useMutation({
    mutationFn: (data: any) => aiAPI.poster(data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['ai', 'credits'] })
    },
  })

  const handleGenerate = () => {
    const data = { prompt, type: contentType }
    switch (contentType) {
      case 'caption': generateMutation.mutate(data); break
      case 'hashtags': hashtagsMutation.mutate(data); break
      case 'reply': replyMutation.mutate(data); break
      case 'poster': posterMutation.mutate(data); break
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const isPending = generateMutation.isPending || hashtagsMutation.isPending || replyMutation.isPending || posterMutation.isPending

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('creative.title')}</h1>
          <p className="text-gray-400">{t('creative.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">{credits?.remaining ?? 0}</span>
          <span className="text-gray-400 text-sm">{t('creative.creditsLeft')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {contentTypes.map((type) => (
          <button key={type.id} onClick={() => setContentType(type.id)} className={`p-4 rounded-xl border transition-colors text-center ${contentType === type.id ? 'bg-purple-500/20 border-purple-500/40' : 'bg-gray-800/30 border-gray-700 hover:bg-gray-700/30'}`}>
            <type.icon className={`w-8 h-8 mx-auto mb-2 ${contentType === type.id ? 'text-purple-400' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-white">{type.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-effect rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">{t('creative.generate', { type: contentTypes.find((c) => c.id === contentType)?.label })}</h3>
        </div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" rows={4} placeholder={t('creative.promptPlaceholder')} />
        <button onClick={handleGenerate} disabled={!prompt.trim() || isPending} className="w-full py-3 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {t('creative.generate')}
        </button>
      </div>

      {result && (
        <div className="glass-effect rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{t('creative.result')}</h3>
            <button onClick={() => copyToClipboard(result.content || result.reply || result.hashtags?.join(' ') || '')} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-sm">
              <Copy className="w-4 h-4" />
              {t('creative.copy')}
            </button>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/30">
            {result.hashtags ? (
              <div className="flex flex-wrap gap-2">
                {result.hashtags.map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">#{tag}</span>
                ))}
              </div>
            ) : result.imageUrl ? (
              <img src={result.imageUrl} alt="Generated" className="w-full rounded-lg" />
            ) : (
              <p className="text-white whitespace-pre-wrap">{result.content || result.reply}</p>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
        <History className="w-5 h-5" />
        {t('creative.history')}
      </button>

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('creative.history')}</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {history?.map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-gray-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-400">{item.type}</span>
                    <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{item.prompt}</p>
                  <p className="text-sm text-white mt-1 line-clamp-2">{item.content || item.reply}</p>
                </div>
              ))}
              {history?.length === 0 && <p className="text-center text-gray-500 py-4">{t('creative.noHistory')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
