import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { reportsAPI } from '../lib/api'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, Calendar, FileText, Users, Megaphone, ShoppingCart } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function ReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [exportType, setExportType] = useState('contacts')

  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports-summary', dateRange],
    queryFn: () => reportsAPI.summary().then((r) => r.data.data),
  })

  const exportMutation = useMutation({
    mutationFn: (type: string) => {
      switch (type) {
        case 'contacts':
          return reportsAPI.exportContacts(dateRange)
        case 'campaigns':
          return reportsAPI.exportCampaigns(dateRange)
        case 'orders':
          return reportsAPI.exportOrders(dateRange)
        default:
          return Promise.reject(new Error('Invalid export type'))
      }
    },
    onSuccess: (data) => {
      const blob = new Blob([data.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    },
  })

  const contactGrowthData =
    summary?.contactGrowth?.map((item: any) => ({
      name: format(new Date(item.date), 'MMM dd'),
      contacts: item.count,
    })) || []

  const campaignData =
    summary?.campaignPerformance?.map((item: any) => ({
      name: item.name,
      sent: item.sent,
      delivered: item.delivered,
      read: item.read,
    })) || []

  const revenueByCategory =
    summary?.revenueByCategory?.map((item: any, i: number) => ({
      name: item.category,
      value: item.amount,
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('reports.title') || 'Reports'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Analytics and export tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Contacts</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : summary?.totalContacts || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Megaphone size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Campaigns</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : summary?.totalCampaigns || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShoppingCart size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : summary?.totalOrders || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FileText size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold">
                {isLoading ? '...' : `₹${summary?.totalRevenue || 0}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Contact Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contactGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="contacts" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label
              >
                {revenueByCategory.map((_entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Export Data</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value="contacts">Contacts</option>
            <option value="campaigns">Campaigns</option>
            <option value="orders">Orders</option>
          </select>
          <button
            onClick={() => exportMutation.mutate(exportType)}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={16} />
            {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}
