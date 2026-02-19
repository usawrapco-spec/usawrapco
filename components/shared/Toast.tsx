'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type'], action?: ToastItem['action']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((
    message: string,
    type: ToastItem['type'] = 'success',
    action?: ToastItem['action']
  ) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, action }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const icons: Record<string, string> = {
    success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
  }
  const colors: Record<string, string> = {
    success: 'bg-green/20 border-green/40 text-green',
    error:   'bg-red/20 border-red/40 text-red',
    info:    'bg-accent/20 border-accent/40 text-accent',
    warning: 'bg-amber/20 border-amber/40 text-amber',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto anim-fade-up flex items-center gap-3',
              'px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl',
              'text-sm font-600 min-w-64 max-w-sm',
              colors[t.type]
            )}
          >
            <span className="text-base">{icons[t.type]}</span>
            <span className="flex-1 text-text1">{t.message}</span>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="text-accent font-700 text-xs hover:underline shrink-0"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
