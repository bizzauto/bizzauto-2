import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '../lib/api'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'

export default function NotificationCenter() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list().then((r) => r.data.data),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : notifications?.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          notifications?.map((notif: any) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition ${
                notif.isRead
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{notif.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1 ml-4">
                  {!notif.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(notif.id)}
                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
