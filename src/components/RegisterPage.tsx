import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, User, Mail, Lock, Building, Phone, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  businessName: z.string().min(2, 'Business name required'),
  businessType: z.string().min(1, 'Select business type'),
  phone: z.string().min(10, 'Valid phone required'),
})

type RegisterForm = z.infer<typeof registerSchema>

const businessTypes = ['retail', 'restaurant', 'salon', 'clinic', 'gym', 'education', 'realestate', 'ecommerce', 'services', 'other']

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const registerAction = useAuthStore((s) => s.register)
  const error = useAuthStore((s) => s.error)
  const isLoading = useAuthStore((s) => s.isLoading)
  const clearError = useAuthStore((s) => s.clearError)

  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const mutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      await registerAction(data)
    },
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    },
  })

  const onSubmit = handleSubmit((data) => {
    clearError()
    mutation.mutate(data)
  })

  const displayError = error || mutation.error?.message

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
        <div className="glass-effect rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('register.success.title')}</h2>
          <p className="text-gray-400">{t('register.success.message')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="glass-effect rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{t('register.title')}</h1>
            <p className="text-gray-400">{t('register.subtitle')}</p>
          </div>

          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{displayError}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('register.name')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('name')} className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" disabled={isLoading} />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('register.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('email')} type="email" className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" disabled={isLoading} />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('register.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('register.businessName')}</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('businessName')} className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="My Business" disabled={isLoading} />
              </div>
              {errors.businessName && <p className="mt-1 text-sm text-red-400">{errors.businessName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('register.businessType')}</label>
              <select {...register('businessType')} className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading}>
                <option value="">{t('register.selectType')}</option>
                {businessTypes.map((bt) => (
                  <option key={bt} value={bt}>{t(`businessTypes.${bt}`)}</option>
                ))}
              </select>
              {errors.businessType && <p className="mt-1 text-sm text-red-400">{errors.businessType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('register.phone')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input {...register('phone')} type="tel" className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+91 9876543210" disabled={isLoading} />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>}
            </div>

            <button type="submit" disabled={isLoading || mutation.isPending} className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {(isLoading || mutation.isPending) && <Loader2 className="w-5 h-5 animate-spin" />}
              {t('register.submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {t('register.hasAccount')}{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">{t('register.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
