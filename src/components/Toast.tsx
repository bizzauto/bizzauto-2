import { useState, useEffect } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  type: ToastType
  title: string
  message?: string
  duration?: number
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const colors = {
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
}

function ToastComponent({ options, onClose }: { options: ToastOptions; onClose: () => void }) {
  const Icon = icons[options.type]

  useEffect(() => {
    const timer = setTimeout(onClose, options.duration || 4000)
    return () => clearTimeout(timer)
  }, [options.duration, onClose])

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm ${colors[options.type]}`}
      role="alert"
    >
      <Icon size={20} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{options.title}</p>
        {options.message && <p className="text-sm mt-1 opacity-80">{options.message}</p>}
      </div>
      <button onClick={onClose} className="p-0.5 hover:opacity-70" aria-label="Close">
        <X size={16} />
      </button>
    </div>
  )
}

const toastContainer = document.createElement('div')
toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2'
document.body.appendChild(toastContainer)

let toastRoot: Root | null = null
let toasts: ToastOptions[] = []

function renderToasts() {
  if (!toastRoot) {
    toastRoot = createRoot(toastContainer)
  }
  toastRoot.render(
    <>
      {toasts.map((toast, i) => (
        <ToastComponent
          key={i}
          options={toast}
          onClose={() => {
            toasts = toasts.filter((_, idx) => idx !== i)
            renderToasts()
          }}
        />
      ))}
    </>
  )
}

export function toast(options: ToastOptions) {
  toasts = [...toasts, options]
  renderToasts()
}

export function toastSuccess(title: string, message?: string) {
  toast({ type: 'success', title, message })
}

export function toastError(title: string, message?: string) {
  toast({ type: 'error', title, message })
}

export function toastWarning(title: string, message?: string) {
  toast({ type: 'warning', title, message })
}

export function toastInfo(title: string, message?: string) {
  toast({ type: 'info', title, message })
}

export default toast
