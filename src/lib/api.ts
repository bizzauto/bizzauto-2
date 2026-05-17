import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const { data } = await axios.post('/api/auth/refresh-token', {
          refreshToken,
        })

        localStorage.setItem('token', data.data.token)
        localStorage.setItem('refreshToken', data.data.refreshToken)

        originalRequest.headers.Authorization = `Bearer ${data.data.token}`
        return apiClient(originalRequest)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  verify2FA: (data: any) => apiClient.post('/auth/2fa/verify', data),
  setup2FA: () => apiClient.post('/auth/2fa/setup'),
  enable2FA: (data: any) => apiClient.post('/auth/2fa/enable', data),
  disable2FA: (data: any) => apiClient.post('/auth/2fa/disable', data),
  forgotPassword: (data: any) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data: any) => apiClient.post('/auth/reset-password', data),
  verifyEmail: (token: string) => apiClient.post('/auth/verify-email', { token }),
  changePassword: (data: any) => apiClient.post('/auth/change-password', data),
  getMe: () => apiClient.get('/auth/me'),
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh-token', { refreshToken }),
}

// Business API
export const businessAPI = {
  get: () => apiClient.get('/business/me'),
  updateSettings: (data: any) => apiClient.put('/business/settings', data),
  updateWhatsAppConfig: (data: any) =>
    apiClient.put('/business/whatsapp-config', data),
  updateSocialConfig: (data: any) =>
    apiClient.put('/business/social-config', data),
  getLimits: () => apiClient.get('/business/limits'),
}

// Team API
export const teamAPI = {
  getMembers: () => apiClient.get('/team/members'),
  inviteMember: (data: any) => apiClient.post('/team/invite', data),
  updateRole: (id: string, data: any) => apiClient.put(`/team/${id}/role`, data),
  removeMember: (id: string) => apiClient.delete(`/team/${id}`),
  getApiKeys: () => apiClient.get('/team/api-keys'),
  createApiKey: (data: any) => apiClient.post('/team/api-keys', data),
  deleteApiKey: (id: string) => apiClient.delete(`/team/api-keys/${id}`),
  getAuditLogs: (params?: any) =>
    apiClient.get('/team/audit-logs', { params }),
}

// Subscription API
export const subscriptionAPI = {
  getPlan: () => apiClient.get('/subscriptions/plan'),
  upgrade: (data: any) => apiClient.post('/subscriptions/upgrade', data),
  cancel: () => apiClient.post('/subscriptions/cancel'),
  getInvoices: () => apiClient.get('/subscriptions/invoices'),
}

// Contacts API
export const contactsAPI = {
  list: (params?: any) => apiClient.get('/contacts', { params }),
  get: (id: string) => apiClient.get(`/contacts/${id}`),
  create: (data: any) => apiClient.post('/contacts', data),
  update: (id: string, data: any) => apiClient.put(`/contacts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/contacts/${id}`),
  bulkImport: (data: any) => apiClient.post('/contacts/bulk-import', data),
  bulkDelete: (ids: string[]) =>
    apiClient.post('/contacts/bulk-delete', { ids }),
  export: (params?: any) => apiClient.get('/contacts/export', { params }),
  stats: () => apiClient.get('/contacts/stats'),
}

// WhatsApp API
export const whatsappAPI = {
  sendText: (data: any) => apiClient.post('/whatsapp/send/text', data),
  sendTemplate: (data: any) => apiClient.post('/whatsapp/send/template', data),
  sendMedia: (data: any) => apiClient.post('/whatsapp/send/media', data),
  getMessages: (contactId: string) =>
    apiClient.get(`/whatsapp/messages/${contactId}`),
  getTemplates: () => apiClient.get('/whatsapp/templates'),
  createTemplate: (data: any) => apiClient.post('/whatsapp/templates', data),
  getAutoReply: () => apiClient.get('/whatsapp/auto-reply'),
  updateAutoReply: (data: any) =>
    apiClient.post('/whatsapp/auto-reply', data),
}

// Campaigns API
export const campaignsAPI = {
  list: (params?: any) => apiClient.get('/campaigns', { params }),
  get: (id: string) => apiClient.get(`/campaigns/${id}`),
  create: (data: any) => apiClient.post('/campaigns', data),
  update: (id: string, data: any) => apiClient.put(`/campaigns/${id}`, data),
  delete: (id: string) => apiClient.delete(`/campaigns/${id}`),
  start: (id: string) => apiClient.post(`/campaigns/${id}/start`),
  pause: (id: string) => apiClient.post(`/campaigns/${id}/pause`),
  resume: (id: string) => apiClient.post(`/campaigns/${id}/resume`),
  stats: (id: string) => apiClient.get(`/campaigns/${id}/stats`),
}

// AI API
export const aiAPI = {
  generate: (data: any) => apiClient.post('/ai/generate', data),
  hashtags: (data: any) => apiClient.post('/ai/hashtags', data),
  reply: (data: any) => apiClient.post('/ai/reply', data),
  poster: (data: any) => apiClient.post('/ai/poster', data),
  history: (params?: any) => apiClient.get('/ai/history', { params }),
  credits: () => apiClient.get('/ai/credits'),
  purchaseCredits: (data: any) => apiClient.post('/ai/credits/purchase', data),
}

// Social API
export const socialAPI = {
  getPosts: (params?: any) => apiClient.get('/social/posts', { params }),
  createPost: (data: any) => apiClient.post('/social/posts', data),
  updatePost: (id: string, data: any) =>
    apiClient.put(`/social/posts/${id}`, data),
  deletePost: (id: string) => apiClient.delete(`/social/posts/${id}`),
  publishPost: (id: string) =>
    apiClient.post(`/social/posts/${id}/publish`),
  getPlatformStatus: () => apiClient.get('/social/platforms/status'),
}

// E-Commerce API
export const ecommerceAPI = {
  getProducts: (params?: any) => apiClient.get('/ecommerce/products', { params }),
  createProduct: (data: any) => apiClient.post('/ecommerce/products', data),
  updateProduct: (id: string, data: any) =>
    apiClient.put(`/ecommerce/products/${id}`, data),
  deleteProduct: (id: string) => apiClient.delete(`/ecommerce/products/${id}`),
  getOrders: (params?: any) => apiClient.get('/ecommerce/orders', { params }),
  createOrder: (data: any) => apiClient.post('/ecommerce/orders', data),
  updateOrderStatus: (id: string, data: any) =>
    apiClient.put(`/ecommerce/orders/${id}/status`, data),
  getCoupons: () => apiClient.get('/ecommerce/coupons'),
  createCoupon: (data: any) => apiClient.post('/ecommerce/coupons', data),
  checkout: (data: any) => apiClient.post('/ecommerce/checkout', data),
}

// Documents API
export const documentsAPI = {
  list: (params?: any) => apiClient.get('/documents', { params }),
  get: (id: string) => apiClient.get(`/documents/${id}`),
  create: (data: any) => apiClient.post('/documents', data),
  update: (id: string, data: any) => apiClient.put(`/documents/${id}`, data),
  delete: (id: string) => apiClient.delete(`/documents/${id}`),
  generate: (id: string) => apiClient.post(`/documents/${id}/generate`),
  send: (id: string, data: any) =>
    apiClient.post(`/documents/${id}/send`, data),
  getTemplates: () => apiClient.get('/documents/templates'),
  createTemplate: (data: any) => apiClient.post('/documents/templates', data),
}

// Reviews API
export const reviewsAPI = {
  list: (params?: any) => apiClient.get('/reviews', { params }),
  reply: (data: any) => apiClient.post('/reviews/reply', data),
  stats: () => apiClient.get('/reviews/stats'),
  sync: () => apiClient.post('/reviews/sync'),
}

// Appointments API
export const appointmentsAPI = {
  list: (params?: any) => apiClient.get('/appointments', { params }),
  get: (id: string) => apiClient.get(`/appointments/${id}`),
  create: (data: any) => apiClient.post('/appointments', data),
  update: (id: string, data: any) =>
    apiClient.put(`/appointments/${id}`, data),
  delete: (id: string) => apiClient.delete(`/appointments/${id}`),
  getAvailableSlots: (params?: any) =>
    apiClient.get('/appointments/available-slots', { params }),
}

// Analytics API
export const analyticsAPI = {
  dashboard: () => apiClient.get('/analytics/dashboard'),
  contacts: (params?: any) =>
    apiClient.get('/analytics/contacts', { params }),
  messages: (params?: any) =>
    apiClient.get('/analytics/messages', { params }),
  campaigns: (params?: any) =>
    apiClient.get('/analytics/campaigns', { params }),
  revenue: (params?: any) =>
    apiClient.get('/analytics/revenue', { params }),
}

// Reports API
export const reportsAPI = {
  summary: () => apiClient.get('/reports/summary'),
  exportContacts: (data: any) =>
    apiClient.post('/reports/export/contacts', data),
  exportCampaigns: (data: any) =>
    apiClient.post('/reports/export/campaigns', data),
  exportOrders: (data: any) => apiClient.post('/reports/export/orders', data),
}

// Settings API
export const settingsAPI = {
  get: () => apiClient.get('/settings'),
  updateBusiness: (data: any) => apiClient.put('/settings/business', data),
  updateAutopilot: (data: any) =>
    apiClient.put('/settings/autopilot', data),
  updateNotifications: (data: any) =>
    apiClient.put('/settings/notifications', data),
}

// Webhooks API
export const webhooksAPI = {
  list: () => apiClient.get('/webhooks'),
  create: (data: any) => apiClient.post('/webhooks', data),
  update: (id: string, data: any) =>
    apiClient.put(`/webhooks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/webhooks/${id}`),
  test: (id: string) => apiClient.post(`/webhooks/${id}/test`),
}

// Notifications API
export const notificationsAPI = {
  list: (params?: any) => apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
}

// Automation API
export const automationAPI = {
  getRules: () => apiClient.get('/automation/rules'),
  createRule: (data: any) => apiClient.post('/automation/rules', data),
  updateRule: (id: string, data: any) =>
    apiClient.put(`/automation/rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete(`/automation/rules/${id}`),
  toggleRule: (id: string) =>
    apiClient.post(`/automation/rules/${id}/toggle`),
  getRuns: () => apiClient.get('/automation/runs'),
}

// Chatbot API
export const chatbotAPI = {
  getFlows: () => apiClient.get('/chatbot/flows'),
  createFlow: (data: any) => apiClient.post('/chatbot/flows', data),
  updateFlow: (id: string, data: any) =>
    apiClient.put(`/chatbot/flows/${id}`, data),
  deleteFlow: (id: string) => apiClient.delete(`/chatbot/flows/${id}`),
  toggleFlow: (id: string) =>
    apiClient.post(`/chatbot/flows/${id}/toggle`),
  testFlow: (data: any) => apiClient.post('/chatbot/test', data),
}

// Integrations API
export const integrationsAPI = {
  list: () => apiClient.get('/integrations'),
  create: (data: any) => apiClient.post('/integrations', data),
  update: (id: string, data: any) =>
    apiClient.put(`/integrations/${id}`, data),
  delete: (id: string) => apiClient.delete(`/integrations/${id}`),
  sync: (id: string) => apiClient.post(`/integrations/${id}/sync`),
}

// Leads API
export const leadsAPI = {
  capture: (businessId: string, data: any) =>
    apiClient.post(`/leads/capture/${businessId}`, data),
  stats: () => apiClient.get('/leads/stats'),
  export: () => apiClient.get('/leads/export'),
}

// Super Admin API
export const superAdminAPI = {
  dashboard: () => apiClient.get('/super-admin/dashboard'),
  getBusinesses: (params?: any) =>
    apiClient.get('/super-admin/businesses', { params }),
  getBusiness: (id: string) =>
    apiClient.get(`/super-admin/businesses/${id}`),
  updateBusiness: (id: string, data: any) =>
    apiClient.put(`/super-admin/businesses/${id}`, data),
  getUsers: (params?: any) =>
    apiClient.get('/super-admin/users', { params }),
  updateUserRole: (id: string, data: any) =>
    apiClient.put(`/super-admin/users/${id}/role`, data),
  deleteUser: (id: string) =>
    apiClient.delete(`/super-admin/users/${id}`),
}

export default apiClient
