import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { socialAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, Calendar, Send, Facebook, Instagram, Twitter, Linkedin, Edit, Trash2, X, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'blue' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'pink' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'sky' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'blue' },
]

export default function SocialMediaPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({ content: '', platforms: [] as string[], schedule: '', media: null as File | null })

  const { data: posts, isLoading } = useQuery({
    queryKey: ['social', 'posts'],
    queryFn: () => socialAPI.getPosts().then((r) => r.data),
  })

  const { data: platformStatus } = useQuery({
    queryKey: ['social', 'platforms'],
    queryFn: () => socialAPI.getPlatformStatus().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => socialAPI.createPost(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social'] })
      setShowCreate(false)
      setFormData({ content: '', platforms: [], schedule: '', media: null })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => socialAPI.publishPost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => socialAPI.deletePost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social'] }),
  })

  const togglePlatform = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id) ? prev.platforms.filter((p) => p !== id) : [...prev.platforms, id],
    }))
  }

  const handleSubmit = () => {
    if (formData.content && formData.platforms.length > 0) {
      createMutation.mutate(formData)
    }
  }

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('social.title')}</h1>
          <p className="text-gray-400">{t('social.subtitle', { total: posts?.total ?? 0 })}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
          <Plus className="w-5 h-5" />
          {t('social.createPost')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {platforms.map((platform) => {
          const status = platformStatus?.find((p: any) => p.platform === platform.id)
          return (
            <div key={platform.id} className={`glass-effect rounded-xl p-4 ${status?.connected ? 'border-green-500/20' : 'border-gray-700'}`}>
              <div className="flex items-center gap-3">
                <platform.icon className={`w-8 h-8 text-${platform.color}-400`} />
                <div>
                  <p className="text-white font-medium">{platform.name}</p>
                  <span className={`text-xs ${status?.connected ? 'text-green-400' : 'text-gray-500'}`}>
                    {status?.connected ? t('social.connected') : t('social.notConnected')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {posts?.items?.map((post: any) => (
          <div key={post.id} className="glass-effect rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-white">{post.content}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {post.platforms?.map((p: string) => {
                    const platform = platforms.find((pl) => pl.id === p)
                    return platform ? <span key={p} className={`px-2 py-1 rounded-full text-xs bg-${platform.color}-500/20 text-${platform.color}-400`}>{platform.name}</span> : null
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {post.status === 'draft' && (
                  <button onClick={() => publishMutation.mutate(post.id)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                    <Send className="w-4 h-4" />{t('social.publish')}
                  </button>
                )}
                <button onClick={() => deleteMutation.mutate(post.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                {post.status === 'published' ? <CheckCircle className="w-4 h-4 text-green-400" /> : post.status === 'scheduled' ? <Calendar className="w-4 h-4 text-yellow-400" /> : <Clock className="w-4 h-4 text-gray-400" />}
                {post.status}
              </span>
              {post.scheduledAt && <span>{new Date(post.scheduledAt).toLocaleString()}</span>}
              <span>{new Date(post.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('social.createPost')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" rows={4} placeholder={t('social.postContent')} />
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('social.platforms')}</label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${formData.platforms.includes(platform.id) ? `bg-${platform.color}-500/20 border-${platform.color}-500/40` : 'bg-gray-800/30 border-gray-700'}`}>
                    <platform.icon className={`w-5 h-5 text-${platform.color}-400`} />
                    <span className="text-sm text-white">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('social.schedule')}</label>
              <input type="datetime-local" value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={!formData.content || formData.platforms.length === 0 || createMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
