import { useQuery } from '@tanstack/react-query'
import { teamAPI } from '../lib/api'
import { ScrollText, Filter } from 'lucide-react'
import { useState } from 'react'

export default function AuditLogPage() {
  const [filter, setFilter] = useState({ action: '', entity: '' })

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', filter],
    queryFn: () => teamAPI.getAuditLogs(filter).then((r) => r.data.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="text-gray-500 dark:text-gray-400">Track all activity</p>
      </div>

      <div className="flex gap-2">
        <select
          value={filter.action}
          onChange={(e) => setFilter((prev) => ({ ...prev, action: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
        </select>
        <select
          value={filter.entity}
          onChange={(e) => setFilter((prev) => ({ ...prev, entity: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">All Entities</option>
          <option value="contact">Contact</option>
          <option value="campaign">Campaign</option>
          <option value="user">User</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4">Action</th>
                <th className="text-left py-3 px-4">Entity</th>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-left py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : logs?.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No logs found</td></tr>
              ) : (
                logs?.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.action === 'create' ? 'bg-green-100 text-green-700' :
                        log.action === 'delete' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize">{log.entity}</td>
                    <td className="py-3 px-4">{log.userEmail || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{log.description || '-'}</td>
                    <td className="py-3 px-4">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
