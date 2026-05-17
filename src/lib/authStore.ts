import { create } from 'zustand'
import { authAPI } from '../lib/api'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  businessId: string | null
  twoFactorEnabled: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  verify2FA: (userId: string, token: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  refreshToken:
    typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })

      if (data.data.requiresTwoFactor) {
        set({
          isLoading: false,
          user: data.data.user,
        })
        return
      }

      localStorage.setItem('token', data.data.token)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      set({
        user: data.data.user,
        token: data.data.token,
        refreshToken: data.data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false,
      })
      throw error
    }
  },

  verify2FA: async (userId: string, token: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authAPI.verify2FA({ userId, token })

      localStorage.setItem('token', data.data.token)
      localStorage.setItem('refreshToken', data.data.refreshToken)

      set({
        user: data.data.user,
        token: data.data.token,
        refreshToken: data.data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || '2FA verification failed',
        isLoading: false,
      })
      throw error
    }
  },

  register: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authAPI.register(data)
      const responseData = response.data.data

      localStorage.setItem('token', responseData.token)
      localStorage.setItem('refreshToken', responseData.refreshToken)

      set({
        user: responseData.user,
        token: responseData.token,
        refreshToken: responseData.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false,
      })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    })
    window.location.href = '/login'
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.getMe()
      set({ user: data.data })
    } catch {
      get().logout()
    }
  },

  clearError: () => set({ error: null }),
}))
