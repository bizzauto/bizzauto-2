import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsAPI, contactsAPI, campaignsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Users, MessageSquare, Megaphone, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Plus, Zap } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsAPI.dashboard().then((r) => r.data),
  })

  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'stats'],
    queryFn: () => contactsAPI.stats().then((r) => r.data),
  })

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.list({ limit: 5 }).then((r) => r.data),
  })

  const stats = [
    { label: t('dashboard.contacts'), value: contacts?.total ?? 0, icon: Users, change: contacts?.growth ?? 0, color: 'blue' },
    { label: t('dashboard.messages'), value: dashboard?.messages ?? 0, icon: MessageSquare, change: 12, color: 'green' },
    { label: t('dashboard.campaigns'), value: campaigns?.total ?? 0, icon: Megaphone, change: 8, color: 'yellow' },
    { label: t('dashboard.revenue'), value: `₹${dashboard?.revenue ?? 0}`, icon: DollarSign, change: 15, color: 'purple' },
  ]

  const chartData = dashboard?.chartData ?? [
    { name: 'Mon', contacts: 40, messages: 24 },
    { name: 'Tue', contacts: 30, messages: 13 },
    { name: 'Wed', contacts: 20, messages: 38 },
    { name: 'Thu', contacts: 27, messages: 39 },
    { name: 'Fri', contacts: 18, messages: 48 },
    { name: 'Sat', contacts: 23, messages: 38 },
    { name: 'Sun', contacts: 34, messages: 43 },
  ]

  const pieData = dashboard?.pieData ?? [
    { name: 'WhatsApp', value: 400 },
    { name: 'Email', value: 300 },
    { name: 'SMS', value: 200 },
    { name: 'Social', value: 100 },
  ]

  const quickActions = [
    { label: t('dashboard.addContact'), icon: Plus, path: '/contacts', color: 'blue' },
    { label: t('dashboard.newCampaign'), icon: Megaphone, path: '/campaigns', color: 'green' },
    { label: t('dashboard.automation'), icon: Zap, path: '/automation', color: 'purple' },
  ]

  if (dashLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-gray-400">{t('dashboard.welcome', { name: user?.name })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass-effect rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-500/20`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <span className={`flex items-center text-sm ${stat.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(stat.change)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-effect rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.activityChart')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="contacts" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="messages" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-effect rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.channelSplit')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                {pieData.map((entry: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.revenueTrend')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="contacts" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-effect rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h3>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg bg-${action.color}-500/10 border border-${action.color}-500/20 hover:bg-${action.color}-500/20 transition-colors text-left`}
              >
                <action.icon className={`w-5 h-5 text-${action.color}-400`} />
                <span className="text-white font-medium">{action.label}</span>
                <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">{t('dashboard.recentActivity')}</h3>
        </div>
        <div className="space-y-3">
          {dashboard?.recentActivity?.map((activity: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-white">{activity.description}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          )) ?? (
            <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noActivity')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
