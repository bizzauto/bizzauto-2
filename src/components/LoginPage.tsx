import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { authAPI } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Mail, Lock, Loader2, Shield, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const twoFASchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
})

type LoginForm = z.infer<typeof loginSchema>
type TwoFAForm = z.infer<typeof twoFASchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const verify2FA = useAuthStore((s) => s.verify2FA)
  const error = useAuthStore((s) => s.error)
  const isLoading = useAuthStore((s) => s.isLoading)
  const clearError = useAuthStore((s) => s.clearError)

  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: register2FA,
    handleSubmit: handleSubmit2FA,
    formState: { errors: errors2FA },
  } = useForm<TwoFAForm>({
    resolver: zodResolver(twoFASchema),
  })

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      await login(data.email, data.password)
    },
    onSuccess: () => {
      const state = useAuthStore.getState()
      if (state.user && !state.isAuthenticated) {
        setUserId(state.user.id)
        setShow2FA(true)
      } else {
        navigate('/dashboard')
      }
    },
  })

  const twoFAMutation = useMutation({
    mutationFn: async (data: TwoFAForm) => {
      if (!userId) throw new Error('No user ID')
      await verify2FA(userId, data.token)
    },
    onSuccess: () => {
      navigate('/dashboard')
    },
  })

  const onSubmit = handleSubmit((data) => {
    clearError()
    loginMutation.mutate(data)
  })

  const on2FASubmit = handleSubmit2FA((data) => {
    clearError()
    twoFAMutation.mutate(data)
  })

  const displayError = error || loginMutation.error?.message || twoFAMutation.error?.message

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-4">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">BizzAuto</h1>
            <p className="text-gray-400">{t('login.subtitle')}</p>
          </div>

          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{displayError}</p>
            </div>
          )}

          {!show2FA ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('login.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500" />
                  <span className="text-sm text-gray-400">{t('login.remember')}</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                  {t('login.forgot')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading || loginMutation.isPending}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(isLoading || loginMutation.isPending) && <Loader2 className="w-5 h-5 animate-spin" />}
                {t('login.submit')}
              </button>
            </form>
          ) : (
            <form onSubmit={on2FASubmit} className="space-y-4">
              <div className="text-center mb-4">
                <Shield className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">{t('login.2fa.description')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('login.2fa.token')}
                </label>
                <input
                  {...register2FA('token')}
                  type="text"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000000"
                  disabled={isLoading}
                />
                {errors2FA.token && (
                  <p className="mt-1 text-sm text-red-400">{errors2FA.token.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || twoFAMutation.isPending}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(isLoading || twoFAMutation.isPending) && <Loader2 className="w-5 h-5 animate-spin" />}
                {t('login.2fa.verify')}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-400">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
