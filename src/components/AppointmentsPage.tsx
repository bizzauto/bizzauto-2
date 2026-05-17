import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsAPI, contactsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Plus, Edit, Trash2, X, AlertCircle, User, Phone, CheckCircle } from 'lucide-react'

export default function AppointmentsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [formData, setFormData] = useState({ contactId: '', date: '', time: '', duration: 30, notes: '', type: 'meeting' })
  const [conflictError, setConflictError] = useState('')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsAPI.list().then((r) => r.data),
  })

  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'appointments'],
    queryFn: () => contactsAPI.list({ limit: 100 }).then((r) => r.data),
  })

  const { data: availableSlots } = useQuery({
    queryKey: ['appointments', 'slots', formData.date],
    queryFn: () => formData.date ? appointmentsAPI.getAvailableSlots({ date: formData.date }).then((r) => r.data) : null,
    enabled: !!formData.date,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => appointmentsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setShowCreate(false)
      resetForm()
      setConflictError('')
    },
    onError: (err: any) => {
      setConflictError(err.response?.data?.error || t('appointments.conflict'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => appointmentsAPI.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setShowCreate(false)
      resetForm()
      setConflictError('')
    },
    onError: (err: any) => {
      setConflictError(err.response?.data?.error || t('appointments.conflict'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const resetForm = () => {
    setFormData({ contactId: '', date: '', time: '', duration: 30, notes: '', type: 'meeting' })
    setEditing(null)
  }

  const openEdit = (apt: any) => {
    setEditing(apt)
    setFormData({ contactId: apt.contactId, date: apt.date?.split('T')[0], time: apt.time, duration: apt.duration, notes: apt.notes, type: apt.type })
    setShowCreate(true)
  }

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (isLoading) return <div className="p-6"><div className="h-8 w-48 bg-gray-700 rounded animate-pulse" /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('appointments.title')}</h1>
          <p className="text-gray-400">{t('appointments.subtitle', { total: appointments?.total ?? 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'list' ? 'calendar' : 'list')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
            {view === 'list' ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            {view === 'list' ? t('appointments.calendar') : t('appointments.list')}
          </button>
          <button onClick={() => { resetForm(); setShowCreate(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
            <Plus className="w-5 h-5" />
            {t('appointments.book')}
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-3">
          {appointments?.items?.map((apt: any) => (
            <div key={apt.id} className="glass-effect rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{apt.contactName}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>{new Date(apt.date).toLocaleDateString()}</span>
                      <span>{apt.time}</span>
                      <span>{apt.duration}min</span>
                    </div>
                    {apt.notes && <p className="text-sm text-gray-500 mt-1">{apt.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>{apt.status}</span>
                  <button onClick={() => openEdit(apt)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => deleteMutation.mutate(apt.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {appointments?.items?.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{t('appointments.noAppointments')}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-effect rounded-xl p-5">
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-sm font-medium text-gray-400 py-2">{d}</div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const date = new Date()
              date.setDate(date.getDate() - date.getDay() + i)
              const dateStr = date.toISOString().split('T')[0]
              const dayAppointments = appointments?.items?.filter((a: any) => a.date?.startsWith(dateStr)) ?? []
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <div key={i} className={`p-2 rounded-lg min-h-[80px] ${isToday ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gray-800/30'}`}>
                  <p className={`text-sm font-medium ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>{date.getDate()}</p>
                  {dayAppointments.slice(0, 2).map((apt: any) => (
                    <div key={apt.id} className="mt-1 px-1 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 truncate">{apt.time} {apt.contactName}</div>
                  ))}
                  {dayAppointments.length > 2 && <p className="text-xs text-gray-500">+{dayAppointments.length - 2} more</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editing ? t('appointments.edit') : t('appointments.book')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {conflictError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 text-sm">{conflictError}</p>
              </div>
            )}
            <div className="space-y-3">
              <select value={formData.contactId} onChange={(e) => setFormData({ ...formData, contactId: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="">{t('appointments.selectContact')}</option>
                {contacts?.items?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" />
              {availableSlots && (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot: string) => (
                    <button key={slot} onClick={() => setFormData({ ...formData, time: slot })} className={`px-3 py-1 rounded-lg text-sm ${formData.time === slot ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>{slot}</button>
                  ))}
                </div>
              )}
              <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" />
              <select value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="meeting">{t('appointments.meeting')}</option>
                <option value="call">{t('appointments.call')}</option>
                <option value="consultation">{t('appointments.consultation')}</option>
              </select>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={2} placeholder={t('appointments.notes')} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.save')}</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
