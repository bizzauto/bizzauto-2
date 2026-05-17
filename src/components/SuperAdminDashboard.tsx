import { useQuery } from '@tanstack/react-query'
import { superAdminAPI } from '../lib/api'
import { Users, Building2, TrendingUp, DollarSign } from 'lucide-react'

export default function SuperAdminDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: () => superAdminAPI.dashboard().then((r) => r.data.data),
  })

  const { data: businesses } = useQuery({
    queryKey: ['super-admin-businesses'],
    queryFn: () => superAdminAPI.getBusinesses().then((r) => r.data.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1>
        <p className="text-gray-500 dark:text-gray-400">Platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Businesses</p>
              <p className="text-2xl font-bold">{isLoading ? '...' : dashboard?.totalBusinesses || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{isLoading ? '...' : dashboard?.totalUsers || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-bold">{isLoading ? '...' : dashboard?.activeSubscriptions || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <DollarSign size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold">₹{isLoading ? '...' : dashboard?.totalRevenue || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">Recent Businesses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {businesses?.slice(0, 10).map((b: any) => (
                <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4">{b.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded text-xs">
                      {b.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
