import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappAPI, contactsAPI } from '../lib/api'
import { useAuthStore } from '../lib/authStore'
import { useTranslation } from 'react-i18next'
import { Send, Paperclip, Smile, FileText, Settings, Phone, Video, Search, X, Check, Image } from 'lucide-react'

export default function WhatsAppModule() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAutoReply, setShowAutoReply] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [templateData, setTemplateData] = useState({ name: '', content: '' })
  const [autoReplyData, setAutoReplyData] = useState({ enabled: false, message: '', delay: 5 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')

  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'whatsapp'],
    queryFn: () => contactsAPI.list({ limit: 50 }).then((r) => r.data),
  })

  const { data: messages, isLoading: msgLoading } = useQuery({
    queryKey: ['whatsapp', 'messages', selectedContact],
    queryFn: () => selectedContact ? whatsappAPI.getMessages(selectedContact).then((r) => r.data) : null,
    enabled: !!selectedContact,
    refetchInterval: 5000,
  })

  const { data: templates } = useQuery({
    queryKey: ['whatsapp', 'templates'],
    queryFn: () => whatsappAPI.getTemplates().then((r) => r.data),
  })

  const { data: autoReply } = useQuery({
    queryKey: ['whatsapp', 'auto-reply'],
    queryFn: () => whatsappAPI.getAutoReply().then((r) => r.data),
  })

  useEffect(() => {
    if (autoReply) setAutoReplyData(autoReply)
  }, [autoReply])

  const sendTextMutation = useMutation({
    mutationFn: (data: any) => whatsappAPI.sendText(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] })
      setMessage('')
    },
  })

  const sendTemplateMutation = useMutation({
    mutationFn: (data: any) => whatsappAPI.sendTemplate(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] })
      setShowTemplates(false)
    },
  })

  const sendMediaMutation = useMutation({
    mutationFn: (data: any) => whatsappAPI.sendMedia(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] })
      setShowMedia(false)
    },
  })

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => whatsappAPI.createTemplate(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] })
      setTemplateData({ name: '', content: '' })
    },
  })

  const updateAutoReplyMutation = useMutation({
    mutationFn: (data: any) => whatsappAPI.updateAutoReply(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'auto-reply'] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (message.trim() && selectedContact) {
      sendTextMutation.mutate({ contactId: selectedContact, message: message.trim() })
    }
  }

  const handleTemplateSelect = (template: any) => {
    if (selectedContact) {
      sendTemplateMutation.mutate({ contactId: selectedContact, templateId: template.id })
    }
  }

  const filteredContacts = contacts?.items?.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  ) ?? []

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('whatsapp.searchContacts')} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((contact: any) => (
            <button key={contact.id} onClick={() => setSelectedContact(contact.id)} className={`w-full p-4 text-left border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${selectedContact === contact.id ? 'bg-blue-500/10' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{contact.name}</p>
                  <p className="text-sm text-gray-400 truncate">{contact.phone}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{contacts?.items?.find((c: any) => c.id === selectedContact)?.name}</p>
                  <p className="text-sm text-green-400">{t('whatsapp.online')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplates(true)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"><FileText className="w-5 h-5" /></button>
                <button onClick={() => setShowAutoReply(true)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"><Settings className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className={`h-12 rounded-lg animate-pulse ${i % 2 === 0 ? 'bg-gray-700/50 w-3/4' : 'bg-green-500/20 w-2/3 ml-auto'}`} />)}</div>
              ) : messages?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('whatsapp.noMessages')}</p>
              ) : (
                messages?.map((msg: any, i: number) => (
                  <div key={i} className={`max-w-[70%] p-3 rounded-lg ${msg.incoming ? 'bg-gray-700/50 rounded-tl-none' : 'bg-green-500/20 rounded-tr-none ml-auto'}`}>
                    <p className="text-white text-sm">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMedia(true)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"><Paperclip className="w-5 h-5" /></button>
                <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('whatsapp.typeMessage')} />
                <button onClick={handleSend} disabled={!message.trim() || sendTextMutation.isPending} className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{t('whatsapp.selectContact')}</p>
            </div>
          </div>
        )}
      </div>

      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('whatsapp.templates')}</h3>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {templates?.map((template: any) => (
                <button key={template.id} onClick={() => handleTemplateSelect(template)} className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-left">
                  <p className="text-white font-medium">{template.name}</p>
                  <p className="text-sm text-gray-400">{template.content}</p>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">{t('whatsapp.createTemplate')}</h4>
              <input value={templateData.name} onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" placeholder={t('whatsapp.templateName')} />
              <textarea value={templateData.content} onChange={(e) => setTemplateData({ ...templateData, content: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={3} placeholder={t('whatsapp.templateContent')} />
              <button onClick={() => createTemplateMutation.mutate(templateData)} disabled={!templateData.name || !templateData.content} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{t('common.create')}</button>
            </div>
          </div>
        </div>
      )}

      {showAutoReply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('whatsapp.autoReply')}</h3>
              <button onClick={() => setShowAutoReply(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={autoReplyData.enabled} onChange={(e) => setAutoReplyData({ ...autoReplyData, enabled: e.target.checked })} className="rounded border-gray-600 bg-gray-800 text-green-500" />
              <span className="text-white">{t('whatsapp.enableAutoReply')}</span>
            </label>
            <textarea value={autoReplyData.message} onChange={(e) => setAutoReplyData({ ...autoReplyData, message: e.target.value })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" rows={3} placeholder={t('whatsapp.autoReplyMessage')} />
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('whatsapp.delaySeconds')}</label>
              <input type="number" value={autoReplyData.delay} onChange={(e) => setAutoReplyData({ ...autoReplyData, delay: parseInt(e.target.value) })} className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white" min={1} max={60} />
            </div>
            <button onClick={() => updateAutoReplyMutation.mutate(autoReplyData)} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">{t('common.save')}</button>
          </div>
        </div>
      )}

      {showMedia && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('whatsapp.sendMedia')}</h3>
              <button onClick={() => setShowMedia(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'image', icon: Image, label: t('whatsapp.image') },
                { type: 'document', icon: FileText, label: t('whatsapp.document') },
                { type: 'video', icon: Video, label: t('whatsapp.video') },
              ].map((item) => (
                <button key={item.type} onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = item.type === 'image' ? 'image/*' : item.type === 'video' ? 'video/*' : '.pdf,.doc,.docx'
                  input.onchange = (e: any) => {
                    const file = e.target.files[0]
                    if (file && selectedContact) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        sendMediaMutation.mutate({ contactId: selectedContact, type: item.type, media: reader.result, caption: message })
                      }
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                }} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 text-center">
                  <item.icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <span className="text-sm text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
