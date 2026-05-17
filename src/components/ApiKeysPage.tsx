import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamAPI } from '../lib/api'
import { Key, Copy, Trash2, Plus } from 'lucide-react'
import { useState } from 'react'

export default function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => teamAPI.getApiKeys().then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => teamAPI.createApiKey({ name, permissions: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowCreate(false)
      setNewKeyName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamAPI.deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your API keys</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Key
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4">Create API Key</h3>
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
              Cancel
            </button>
            <button onClick={() => createMutation.mutate(newKeyName)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : keys?.length === 0 ? (
          <p className="text-gray-500">No API keys created</p>
        ) : (
          keys?.map((key: any) => (
            <div key={key.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-gray-500 font-mono">{key.prefix}••••••••</p>
                <p className="text-xs text-gray-400">
                  Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyKey(key.key)} className="p-2 text-gray-500 hover:text-blue-500">
                  <Copy size={16} />
                </button>
                <button onClick={() => deleteMutation.mutate(key.id)} className="p-2 text-gray-500 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
