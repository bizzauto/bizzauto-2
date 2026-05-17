import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Plus, ChevronDown, ChevronUp, MoreVertical, Edit, Trash2, Mail, Phone, Building } from 'lucide-react'

const stages = [
  { id: 'lead', name: 'Lead', color: 'blue' },
  { id: 'qualified', name: 'Qualified', color: 'green' },
  { id: 'proposal', name: 'Proposal', color: 'yellow' },
  { id: 'negotiation', name: 'Negotiation', color: 'orange' },
  { id: 'won', name: 'Won', color: 'emerald' },
  { id: 'lost', name: 'Lost', color: 'red' },
]

export default function CRMPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draggedContact, setDraggedContact] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', dealValue: '', stage: 'lead' })

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', 'crm', search],
    queryFn: () => contactsAPI.list({ search, limit: 100 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => contactsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowCreate(false)
      setNewContact({ name: '', email: '', phone: '', company: '', dealValue: '', stage: 'lead' })
    },
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      contactsAPI.update(id, { stage }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  const handleDragStart = (id: string) => setDraggedContact(id)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (stage: string) => {
    if (draggedContact) {
      updateStageMutation.mutate({ id: draggedContact, stage })
      setDraggedContact(null)
    }
  }

  const handleCreate = () => {
    if (newContact.name && newContact.email) {
      createMutation.mutate({ ...newContact, dealValue: parseFloat(newContact.dealValue) || 0 })
    }
  }

  const totalDealValue = contacts?.items?.reduce((sum: number, c: any) => sum + (c.dealValue || 0), 0) ?? 0

  if (isLoading) {
    return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('crm.title')}</h1>
          <p className="text-gray-400">{t('crm.subtitle', { total: contacts?.total ?? 0 })}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
          <Plus className="w-5 h-5" />
          {t('crm.addDeal')}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('crm.search')} />
        </div>
        <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
          {t('crm.totalValue')}: ₹{totalDealValue.toLocaleString()}
        </div>
      </div>

      {showCreate && (
        <div className="glass-effect rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('crm.newDeal')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('crm.contactName')} />
            <input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('crm.email')} />
            <input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('crm.phone')} />
            <input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('crm.company')} />
            <input type="number" value={newContact.dealValue} onChange={(e) => setNewContact({ ...newContact, dealValue: e.target.value })} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('crm.dealValue')} />
            <select value={newContact.stage} onChange={(e) => setNewContact({ ...newContact, stage: e.target.value })} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createMutation.isPending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">{t('common.create')}</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          const stageContacts = contacts?.items?.filter((c: any) => c.stage === stage.id) ?? []
          const stageValue = stageContacts.reduce((sum: number, c: any) => sum + (c.dealValue || 0), 0)
          return (
            <div
              key={stage.id}
              className={`bg-${stage.color}-500/10 border border-${stage.color}-500/20 rounded-xl p-3 min-h-[300px]`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold text-${stage.color}-400`}>{stage.name}</h3>
                <span className="text-xs text-gray-400">{stageContacts.length}</span>
              </div>
              <p className="text-sm text-gray-500 mb-3">₹{stageValue.toLocaleString()}</p>
              <div className="space-y-2">
                {stageContacts.map((contact: any) => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={() => handleDragStart(contact.id)}
                    className="glass-effect rounded-lg p-3 cursor-move hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm font-medium text-white">{contact.name}</p>
                    <p className="text-xs text-gray-400">{contact.company}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-green-400">₹{(contact.dealValue || 0).toLocaleString()}</span>
                      <button onClick={() => deleteMutation.mutate(contact.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
