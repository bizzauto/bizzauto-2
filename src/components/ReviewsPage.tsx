import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Star, RefreshCw, MessageSquare, Filter, X, AlertCircle, CheckCircle } from 'lucide-react'

const platforms = ['google', 'facebook', 'yelp', 'trustpilot']

export default function ReviewsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [platformFilter, setPlatformFilter] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', platformFilter],
    queryFn: () => reviewsAPI.list({ platform: platformFilter }).then((r) => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['reviews', 'stats'],
    queryFn: () => reviewsAPI.stats().then((r) => r.data),
  })

  const replyMutation = useMutation({
    mutationFn: (data: any) => reviewsAPI.reply(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setReplyingTo(null)
      setReplyText('')
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => reviewsAPI.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats'] })
    },
  })

  const handleReply = (reviewId: string) => {
    if (replyText.trim()) {
      replyMutation.mutate({ reviewId, reply: replyText.trim() })
    }
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
      ))}
    </div>
  )

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('reviews.title')}</h1>
          <p className="text-gray-400">{t('reviews.subtitle', { total: reviews?.total ?? 0 })}</p>
        </div>
        <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">
          <RefreshCw className={`w-5 h-5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {t('reviews.sync')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{stats?.averageRating?.toFixed(1) ?? '0.0'}</p>
          <div className="flex justify-center mt-1">{renderStars(Math.round(stats?.averageRating ?? 0))}</div>
          <p className="text-sm text-gray-400 mt-1">{t('reviews.avgRating')}</p>
        </div>
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{stats?.totalReviews ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">{t('reviews.totalReviews')}</p>
        </div>
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-green-400">{stats?.positiveReviews ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">{t('reviews.positive')}</p>
        </div>
        <div className="glass-effect rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-red-400">{stats?.negativeReviews ?? 0}</p>
          <p className="text-sm text-gray-400 mt-1">{t('reviews.negative')}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setPlatformFilter('')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!platformFilter ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>{t('reviews.all')}</button>
        {platforms.map((p) => (
          <button key={p} onClick={() => setPlatformFilter(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${platformFilter === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>{p}</button>
        ))}
      </div>

      <div className="space-y-3">
        {reviews?.items?.map((review: any) => (
          <div key={review.id} className="glass-effect rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {renderStars(review.rating)}
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300 capitalize">{review.platform}</span>
                </div>
                <p className="text-white">{review.content}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span>{review.author}</span>
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                {review.reply && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-400 font-medium">{t('reviews.yourReply')}</p>
                    <p className="text-sm text-white">{review.reply}</p>
                  </div>
                )}
              </div>
              {!review.reply && (
                <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-sm">
                  <MessageSquare className="w-4 h-4" />
                  {t('reviews.reply')}
                </button>
              )}
            </div>
            {replyingTo === review.id && (
              <div className="mt-4 space-y-2">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder={t('reviews.replyPlaceholder')} />
                <div className="flex gap-2">
                  <button onClick={() => handleReply(review.id)} disabled={!replyText.trim() || replyMutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">{t('reviews.sendReply')}</button>
                  <button onClick={() => { setReplyingTo(null); setReplyText('') }} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium">{t('common.cancel')}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {reviews?.items?.length === 0 && (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">{t('reviews.noReviews')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
