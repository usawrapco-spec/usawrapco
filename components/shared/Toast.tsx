'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { CheckCircle, XCircle, Info, AlertTriangle, Zap, Medal } from 'lucide-react'

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

interface BadgeToastItem {
  id: number
  label: string
}

export const BADGE_LABELS: Record<string, string> = {
  hot_streak:      'Hot Streak',
  early_bird:      'Early Bird',
  marathon:        'Marathon',
  elite:           'Elite',
  closer:          'Closer',
  sharpshooter:    'Sharpshooter',
  shutterbug:      'Shutterbug',
  team_player:     'Team Player',
  speed_demon:     'Speed Demon',
  material_wizard: 'Material Wizard',
  zero_waste:      'Zero Waste',
  top_dog:         'Top Dog',
  pixel_perfect:   'Pixel Perfect',
  perfect_brief:   'Perfect Brief',
}

interface LevelUpItem {
  id: number
  newLevel: number
  amount: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type'], action?: ToastItem['action']) => void
  xpToast: (amount: number, label?: string, leveledUp?: boolean, newLevel?: number) => void
  badgeToast: (badges: string[]) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, xpToast: () => {}, badgeToast: () => {} })
export const useToast = () => useContext(ToastContext)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [xpToasts, setXPToasts] = useState<XPToastItem[]>([])
  const [badgeToasts, setBadgeToasts] = useState<BadgeToastItem[]>([])
  const [levelUp, setLevelUp] = useState<LevelUpItem | null>(null)

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

    // Show full-screen level-up modal
    if (leveledUp && newLevel) {
      const luId = ++toastId
      setLevelUp({ id: luId, newLevel, amount })
      setTimeout(() => setLevelUp(prev => prev?.id === luId ? null : prev), 5000)
    }
  }, [])

  const badgeToast = useCallback((badges: string[]) => {
    badges.forEach((badge, i) => {
      setTimeout(() => {
        const id = ++toastId
        const label = BADGE_LABELS[badge] || badge
        setBadgeToasts(prev => [...prev, { id, label }])
        setTimeout(() => setBadgeToasts(prev => prev.filter(t => t.id !== id)), 4500)
      }, i * 700 + 400) // stagger after XP toast
    })
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
    <ToastContext.Provider value={{ toast, xpToast, badgeToast }}>
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

        {/* Badge unlock toasts */}
        {badgeToasts.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(34,192,122,0.95), rgba(16,185,129,0.95))',
              border: '1px solid rgba(34,192,122,0.7)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.3s ease',
              minWidth: 180,
            }}
          >
            <Medal size={16} style={{ color: '#fff', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>
                Badge Unlocked!
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                {t.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Level-Up Celebration Modal */}
      {levelUp && (
        <div
          onClick={() => setLevelUp(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease',
            cursor: 'pointer',
          }}
        >
          {/* Confetti particles */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                background: ['#4f7fff', '#22c07a', '#f59e0b', '#8b5cf6', '#22d3ee', '#f25a5a', '#ff6b6b', '#fbbf24'][i % 8],
                animation: `confettiFall ${2 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: 0.9,
              }}
            />
          ))}

          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1a1040 0%, #0d0f14 50%, #0a1628 100%)',
              border: '2px solid rgba(139,92,246,0.5)',
              borderRadius: 24, padding: '48px 40px', textAlign: 'center',
              maxWidth: 400, width: '90%',
              boxShadow: '0 0 80px rgba(139,92,246,0.3), 0 0 200px rgba(79,127,255,0.15)',
              animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Level badge */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #8b5cf6, #4f7fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(139,92,246,0.5)',
              animation: 'pulse 1.5s infinite',
            }}>
              <span style={{
                fontSize: 32, fontWeight: 900, color: '#fff',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {levelUp.newLevel}
              </span>
            </div>

            <div style={{
              fontSize: 14, fontWeight: 800, color: '#8b5cf6',
              textTransform: 'uppercase', letterSpacing: 4, marginBottom: 8,
            }}>
              Level Up
            </div>

            <div style={{
              fontSize: 28, fontWeight: 900, color: '#fff',
              fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8,
            }}>
              You reached Level {levelUp.newLevel}!
            </div>

            <div style={{
              fontSize: 16, fontWeight: 700, color: 'rgba(245,158,11,0.9)',
              fontFamily: 'JetBrains Mono, monospace', marginBottom: 20,
            }}>
              +{levelUp.amount} XP
            </div>

            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Click anywhere to dismiss
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
