'use client'

import { LayoutDashboard, Briefcase, Plus, Gauge, MoreHorizontal } from 'lucide-react'

type View = 'pipeline' | 'engine'

const TABS: { key: View | 'new' | 'more'; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'pipeline', label: 'Home',   icon: LayoutDashboard },
  { key: 'pipeline', label: 'Jobs',   icon: Briefcase },
  { key: 'new',      label: 'New',    icon: Plus },
  { key: 'engine',   label: 'Engine', icon: Gauge },
  { key: 'more',     label: 'More',   icon: MoreHorizontal },
]

export default function MobileBottomNav({
  active,
  onNavigate,
}: {
  active: View
  onNavigate: (v: View) => void
}) {
  return (
    <div style={{
      display: 'flex',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      flexShrink: 0,
    }}>
      {TABS.map((tab, i) => {
        const isNew = tab.key === 'new'
        const isActive = !isNew && tab.key !== 'more' && tab.key === active
        const Icon = tab.icon

        return (
          <button
            key={i}
            onClick={() => {
              if (tab.key === 'pipeline' || tab.key === 'engine') {
                onNavigate(tab.key)
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 0 6px',
              border: 'none',
              background: isNew ? 'none' : 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--purple)' : 'var(--text3)',
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {isNew ? (
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -12,
              }}>
                <Plus size={20} color="#fff" />
              </div>
            ) : (
              <Icon size={20} />
            )}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
