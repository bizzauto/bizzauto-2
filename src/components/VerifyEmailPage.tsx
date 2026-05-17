import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'manual'>('loading')
  const [message, setMessage] = useState('')
  const [manualToken, setManualToken] = useState('')

  const verifyMutation = useMutation({
    mutationFn: (t: string) => authAPI.verifyEmail(t).then((r) => r.data),
    onSuccess: () => {
      setStatus('success')
      setMessage(t('verify.success'))
      setTimeout(() => navigate('/login'), 3000)
    },
    onError: (err: any) => {
      setStatus('error')
      setMessage(err.response?.data?.error || t('verify.error'))
    },
  })

  const manualMutation = useMutation({
    mutationFn: (t: string) => authAPI.verifyEmail(t).then((r) => r.data),
    onSuccess: () => {
      setStatus('success')
      setMessage(t('verify.success'))
      setTimeout(() => navigate('/login'), 3000)
    },
    onError: (err: any) => {
      setMessage(err.response?.data?.error || t('verify.error'))
    },
  })

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token)
    } else {
      setStatus('manual')
    }
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-2xl p-8 shadow-2xl text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('verify.loading')}</h2>
              <p className="text-gray-400">{t('verify.loadingDesc')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('verify.success')}</h2>
              <p className="text-gray-400">{message}</p>
              <p className="text-sm text-gray-500 mt-4">{t('verify.redirecting')}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('verify.errorTitle')}</h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('verify.enterToken')}
                />
                <button
                  onClick={() => manualToken && manualMutation.mutate(manualToken)}
                  disabled={!manualToken || manualMutation.isPending}
                  className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {manualMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t('verify.submit')}
                </button>
              </div>
            </>
          )}

          {status === 'manual' && (
            <>
              <Mail className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('verify.manualTitle')}</h2>
              <p className="text-gray-400 mb-4">{t('verify.manualDesc')}</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('verify.enterToken')}
                />
                <button
                  onClick={() => manualToken && manualMutation.mutate(manualToken)}
                  disabled={!manualToken || manualMutation.isPending}
                  className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {manualMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t('verify.submit')}
                </button>
              </div>
            </>
          )}

          {manualMutation.isError && (
            <p className="mt-4 text-sm text-red-400">{message}</p>
          )}

          <Link to="/login" className="mt-6 inline-block text-blue-400 hover:text-blue-300 font-medium">
            {t('verify.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
