import { useQuery } from '@tanstack/react-query'
import { businessAPI } from '../lib/api'
import { Building2, Star, Globe, Link, ExternalLink } from 'lucide-react'

export default function GoogleBusinessPage() {
  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: () => businessAPI.get().then((r) => r.data.data),
  })

  const isConnected = business?.gbpAccessToken && business?.gbpAccountId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Google Business Profile</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your Google presence</p>
      </div>

      {!isConnected ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Connect Google Business Profile</h3>
          <p className="text-gray-500 mb-6">
            Link your Google Business Profile to manage posts and reviews
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto">
            <Globe size={18} />
            Connect with Google
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Star size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold">Connected</p>
                <p className="text-sm text-gray-500">Account ID: {business?.gbpAccountId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                <p className="font-medium">Create Post</p>
                <p className="text-sm text-gray-500">Publish an update</p>
              </button>
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                <p className="font-medium">View Reviews</p>
                <p className="text-sm text-gray-500">Manage customer reviews</p>
              </button>
              <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                <p className="font-medium">Update Info</p>
                <p className="text-sm text-gray-500">Edit business details</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
