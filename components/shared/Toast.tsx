'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { CheckCircle, XCircle, Info, AlertTriangle, Zap } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  action?: { label: string; onClick: () => void }
}

interface XPToastItem {
  id: number
  amount: number
  label: string
  leveledUp?: boolean
  newLevel?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type'], action?: ToastItem['action']) => void
  xpToast: (amount: number, label?: string, leveledUp?: boolean, newLevel?: number) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, xpToast: () => {} })
export const useToast = () => useContext(ToastContext)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [xpToasts, setXPToasts] = useState<XPToastItem[]>([])

  const toast = useCallback((
    message: string,
    type: ToastItem['type'] = 'success',
    action?: ToastItem['action']
  ) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, action }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const xpToast = useCallback((
    amount: number,
    label: string = 'XP earned',
    leveledUp?: boolean,
    newLevel?: number,
  ) => {
    const id = ++toastId
    setXPToasts(prev => [...prev, { id, amount, label, leveledUp, newLevel }])
    setTimeout(() => setXPToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const icons: Record<string, ReactNode> = {
    success: <CheckCircle size={16} />,
    error:   <XCircle size={16} />,
    info:    <Info size={16} />,
    warning: <AlertTriangle size={16} />,
  }
  const colors: Record<string, string> = {
    success: 'bg-green/20 border-green/40 text-green',
    error:   'bg-red/20 border-red/40 text-red',
    info:    'bg-accent/20 border-accent/40 text-accent',
    warning: 'bg-amber/20 border-amber/40 text-amber',
  }

  return (
    <ToastContext.Provider value={{ toast, xpToast }}>
      {children}

      {/* Standard toasts */}
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

      {/* XP toasts — gamified, positioned top-right */}
      <div style={{
        position: 'fixed', top: 72, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {xpToasts.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 12,
              background: t.leveledUp
                ? 'linear-gradient(135deg, #7c3aed, #4f7fff)'
                : 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(251,191,36,0.95))',
              border: t.leveledUp ? '1px solid rgba(139,92,246,0.8)' : '1px solid rgba(245,158,11,0.6)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.3s ease',
              minWidth: 180,
            }}
          >
            <Zap size={16} style={{ color: t.leveledUp ? '#fff' : '#0d1117', flexShrink: 0 }} />
            <div>
              <div style={{
                fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
                color: t.leveledUp ? '#fff' : '#0d1117',
              }}>
                +{t.amount} XP
              </div>
              {t.leveledUp && t.newLevel ? (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                  LEVEL UP! You are now Level {t.newLevel}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>
                  {t.label}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
