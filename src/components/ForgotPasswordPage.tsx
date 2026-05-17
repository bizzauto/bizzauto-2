import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetSchema = z.object({
  token: z.string().min(1, 'Token required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ForgotForm = z.infer<typeof forgotSchema>
type ResetForm = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [step, setStep] = useState<'forgot' | 'reset' | 'success'>('forgot')
  const [email, setEmail] = useState('')

  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) })
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  const forgotMutation = useMutation({
    mutationFn: (data: ForgotForm) => authAPI.forgotPassword(data).then((r) => r.data),
    onSuccess: (data, vars) => {
      setEmail(vars.email)
      setStep('reset')
    },
  })

  const resetMutation = useMutation({
    mutationFn: (data: ResetForm) => authAPI.resetPassword(data).then((r) => r.data),
    onSuccess: () => setStep('success'),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{t('forgot.title')}</h1>
            <p className="text-gray-400">{t('forgot.subtitle')}</p>
          </div>

          {forgotMutation.isError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm">{forgotMutation.error.message}</p>
            </div>
          )}

          {resetMutation.isError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm">{resetMutation.error.message}</p>
            </div>
          )}

          {step === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit((data) => forgotMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('forgot.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input {...forgotForm.register('email')} type="email" className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" disabled={forgotMutation.isPending} />
                </div>
                {forgotForm.formState.errors.email && <p className="mt-1 text-sm text-red-400">{forgotForm.formState.errors.email.message}</p>}
              </div>
              <button type="submit" disabled={forgotMutation.isPending} className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {forgotMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                {t('forgot.sendReset')}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={resetForm.handleSubmit((data) => resetMutation.mutate(data))} className="space-y-4">
              <p className="text-sm text-gray-400 text-center mb-4">{t('forgot.checkEmail', { email })}</p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('forgot.token')}</label>
                <input {...resetForm.register('token')} className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Reset token" disabled={resetMutation.isPending} />
                {resetForm.formState.errors.token && <p className="mt-1 text-sm text-red-400">{resetForm.formState.errors.token.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('forgot.newPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input {...resetForm.register('password')} type="password" className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" disabled={resetMutation.isPending} />
                </div>
                {resetForm.formState.errors.password && <p className="mt-1 text-sm text-red-400">{resetForm.formState.errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('forgot.confirmPassword')}</label>
                <input {...resetForm.register('confirmPassword')} type="password" className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" disabled={resetMutation.isPending} />
                {resetForm.formState.errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{resetForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={resetMutation.isPending} className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {resetMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                {t('forgot.resetPassword')}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{t('forgot.success.title')}</h2>
              <p className="text-gray-400 mb-4">{t('forgot.success.message')}</p>
              <Link to="/login" className="inline-block py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
                {t('forgot.backToLogin')}
              </Link>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-400">
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">{t('forgot.backToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
