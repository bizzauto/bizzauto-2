import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, Download, Send, X, Edit, Trash2, Search, FileSpreadsheet, FileCheck, Mail, MessageSquare } from 'lucide-react'

export default function DocumentsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({ name: '', templateId: '', contactId: '', data: '' })
  const [sendData, setSendData] = useState({ method: 'email', recipient: '' })
  const [templateData, setTemplateData] = useState({ name: '', content: '' })

  const { data: documents } = useQuery({
    queryKey: ['documents', search],
    queryFn: () => documentsAPI.list({ search }).then((r) => r.data),
  })

  const { data: templates } = useQuery({
    queryKey: ['documents', 'templates'],
    queryFn: () => documentsAPI.getTemplates().then((r) => r.data),
    enabled: showTemplates || showCreate,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => documentsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setShowCreate(false)
      setFormData({ name: '', templateId: '', contactId: '', data: '' })
    },
  })

  const generateMutation = useMutation({
    mutationFn: (id: string) => documentsAPI.generate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const sendMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => documentsAPI.send(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setShowSend(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => documentsAPI.createTemplate(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'templates'] })
      setTemplateData({ name: '', content: '' })
    },
  })

  const handleGenerate = (id: string) => generateMutation.mutate(id)

  const handleSend = () => {
    if (selectedDoc) {
      sendMutation.mutate({ id: selectedDoc.id, data: sendData })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('documents.title')}</h1>
          <p className="text-gray-400">{t('documents.subtitle', { total: documents?.total ?? 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium">
            <FileSpreadsheet className="w-5 h-5" />{t('documents.templates')}
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Plus className="w-5 h-5" />{t('documents.create')}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('documents.search')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents?.items?.map((doc: any) => (
          <div key={doc.id} className="glass-effect rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{doc.name}</h3>
                <p className="text-sm text-gray-400">{doc.templateName}</p>
                <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              {!doc.generated && (
                <button onClick={() => handleGenerate(doc.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
                  <FileCheck className="w-4 h-4" />{t('documents.generate')}
                </button>
              )}
              {doc.generated && (
                <>
                  <button onClick={() => { setSelectedDoc(doc); setShowSend(true) }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                    <Send className="w-4 h-4" />{t('documents.send')}
                  </button>
                  <button className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white"><Download className="w-4 h-4" /></button>
                </>
              )}
              <button onClick={() => deleteMutation.mutate(doc.id)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
            <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${doc.generated ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {doc.generated ? t('documents.generated') : t('documents.pending')}
            </span>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('documents.create')}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('documents.documentName')} />
              <select value={formData.templateId} onChange={(e) => setFormData({ ...formData, templateId: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white">
                <option value="">{t('documents.selectTemplate')}</option>
                {templates?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <textarea value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={4} placeholder={t('documents.dataJson')} />
            </div>
            <button onClick={() => createMutation.mutate(formData)} disabled={!formData.name || !formData.templateId} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
          </div>
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('documents.send')}</h3>
              <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSendData({ ...sendData, method: 'email' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${sendData.method === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <Mail className="w-5 h-5" />{t('documents.email')}
              </button>
              <button onClick={() => setSendData({ ...sendData, method: 'whatsapp' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${sendData.method === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                <MessageSquare className="w-5 h-5" />{t('documents.whatsapp')}
              </button>
            </div>
            <input value={sendData.recipient} onChange={(e) => setSendData({ ...sendData, recipient: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={sendData.method === 'email' ? 'email@example.com' : '+91 9876543210'} />
            <button onClick={handleSend} disabled={!sendData.recipient || sendMutation.isPending} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('documents.send')}</button>
          </div>
        </div>
      )}

      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('documents.templates')}</h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {templates?.map((template: any) => (
                <div key={template.id} className="p-4 rounded-lg bg-gray-800/30">
                  <p className="text-white font-medium">{template.name}</p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.content}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">{t('documents.createTemplate')}</h4>
              <input value={templateData.name} onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('documents.templateName')} />
              <textarea value={templateData.content} onChange={(e) => setTemplateData({ ...templateData, content: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={4} placeholder={t('documents.templateContent')} />
              <button onClick={() => createTemplateMutation.mutate(templateData)} disabled={!templateData.name || !templateData.content} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
