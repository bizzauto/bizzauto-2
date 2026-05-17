import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Edit, Trash2, Mail, Phone, User, Upload, Download, X, AlertTriangle, Check } from 'lucide-react'

export default function ContactPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', tags: '' })
  const limit = 10

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search, filter],
    queryFn: () => contactsAPI.list({ page, limit, search, filter }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => contactsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contactsAPI.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowModal(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowDelete(false)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => contactsAPI.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setSelected([])
    },
  })

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', company: '', tags: '' })
    setEditing(null)
  }

  const openEdit = (contact: any) => {
    setEditing(contact)
    setFormData({ name: contact.name, email: contact.email, phone: contact.phone, company: contact.company, tags: contact.tags?.join(', ') || '' })
    setShowModal(true)
  }

  const handleSubmit = () => {
    const data = { ...formData, tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean) }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const selectAll = () => {
    const ids = data?.items?.map((c: any) => c.id) ?? []
    setSelected(selected.length === ids.length ? [] : ids)
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit)

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('contacts.title')}</h1>
          <p className="text-gray-400">{t('contacts.subtitle', { total: data?.total ?? 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
            <Upload className="w-5 h-5" />
            {t('contacts.import')}
          </button>
          <button onClick={() => contactsAPI.export().then((r) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(r.data)])); a.download = 'contacts.json'; a.click() })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
            <Download className="w-5 h-5" />
            {t('contacts.export')}
          </button>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
            <Plus className="w-5 h-5" />
            {t('contacts.add')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('contacts.search')} />
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1) }} className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">{t('contacts.allStatus')}</option>
          <option value="active">{t('contacts.active')}</option>
          <option value="inactive">{t('contacts.inactive')}</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span className="text-sm text-blue-400">{selected.length} {t('contacts.selected')}</span>
          <button onClick={() => bulkDeleteMutation.mutate(selected)} className="flex items-center gap-1 px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm">
            <Trash2 className="w-4 h-4" />
            {t('contacts.deleteSelected')}
          </button>
        </div>
      )}

      <div className="glass-effect rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-4 text-left">
                  <input type="checkbox" checked={selected.length === data?.items?.length} onChange={selectAll} className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                </th>
                <th className="p-4 text-left text-sm font-medium text-gray-400">{t('contacts.name')}</th>
                <th className="p-4 text-left text-sm font-medium text-gray-400 hidden md:table-cell">{t('contacts.email')}</th>
                <th className="p-4 text-left text-sm font-medium text-gray-400 hidden lg:table-cell">{t('contacts.phone')}</th>
                <th className="p-4 text-left text-sm font-medium text-gray-400 hidden lg:table-cell">{t('contacts.company')}</th>
                <th className="p-4 text-left text-sm font-medium text-gray-400">{t('contacts.status')}</th>
                <th className="p-4 text-right text-sm font-medium text-gray-400">{t('contacts.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((contact: any) => (
                <tr key={contact.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <input type="checkbox" checked={selected.includes(contact.id)} onChange={() => toggleSelect(contact.id)} className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium">{contact.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 hidden md:table-cell">{contact.email}</td>
                  <td className="p-4 text-gray-400 hidden lg:table-cell">{contact.phone}</td>
                  <td className="p-4 text-gray-400 hidden lg:table-cell">{contact.company}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${contact.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(contact)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditing(contact); setShowDelete(true) }} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">{t('contacts.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, data?.total ?? 0), total: data?.total })}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50">
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1
              return <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-lg font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white'}`}>{p}</button>
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editing ? t('contacts.edit') : t('contacts.add')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('contacts.name')} />
              <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('contacts.email')} />
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('contacts.phone')} />
              <input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('contacts.company')} />
              <input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('contacts.tags')} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-sm text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-semibold text-white">{t('contacts.confirmDelete')}</h3>
            <p className="text-gray-400">{t('contacts.deleteMessage', { name: editing?.name })}</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(editing.id)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">{t('common.delete')}</button>
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('contacts.import')}</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">{t('contacts.dropFile')}</p>
              <input type="file" accept=".csv,.json" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target?.result as string)
                      contactsAPI.bulkImport(data).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['contacts'] })
                        setShowImport(false)
                      })
                    } catch {
                      alert('Invalid file format')
                    }
                  }
                  reader.readAsText(file)
                }
              }} className="hidden" id="import-file" />
              <label htmlFor="import-file" className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer">{t('contacts.selectFile')}</label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
