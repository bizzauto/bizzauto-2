import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamAPI } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { Users, Mail, Shield, Trash2, Key, ScrollText, Plus } from 'lucide-react'

export default function TeamManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' })

  const { data: members } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => teamAPI.getMembers().then((r) => r.data.data),
  })

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => teamAPI.getApiKeys().then((r) => r.data.data),
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => teamAPI.getAuditLogs().then((r) => r.data.data),
  })

  const inviteMutation = useMutation({
    mutationFn: (data: any) => teamAPI.inviteMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setShowInvite(false)
      setInviteForm({ email: '', role: 'MEMBER' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => teamAPI.removeMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })

  const createKeyMutation = useMutation({
    mutationFn: (data: any) => teamAPI.createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => teamAPI.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settings.team') || 'Team Management'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your team</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Invite Member
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Invite Member</h3>
            <input
              type="email"
              placeholder="Email address"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mb-3"
            />
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mb-4"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => inviteMutation.mutate(inviteForm)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold flex items-center gap-2">
            <Users size={18} />
            Team Members
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {members?.map((member: any) => (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  {member.name?.charAt(0) || member.email.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{member.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  {member.role}
                </span>
                {member.role !== 'OWNER' && (
                  <button
                    onClick={() => removeMutation.mutate(member.id)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold flex items-center gap-2">
            <Key size={18} />
            API Keys
          </h3>
        </div>
        <div className="p-4">
          <button
            onClick={() =>
              createKeyMutation.mutate({ name: 'New Key', permissions: {} })
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Generate Key
          </button>
          <div className="mt-4 space-y-2">
            {apiKeys?.map((key: any) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-sm text-gray-500 font-mono">
                    {key.prefix}••••••••
                  </p>
                </div>
                <button
                  onClick={() => deleteKeyMutation.mutate(key.id)}
                  className="p-1 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold flex items-center gap-2">
            <ScrollText size={18} />
            Audit Log
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
          {auditLogs?.map((log: any) => (
            <div key={log.id} className="p-4">
              <div className="flex justify-between">
                <p className="text-sm">
                  <span className="font-medium">{log.action}</span>{' '}
                  {log.entity} {log.entityId?.slice(0, 8)}
                </p>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              {log.description && (
                <p className="text-xs text-gray-500 mt-1">{log.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
