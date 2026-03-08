'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Phone, Users, MessageSquare, Menu, X,
  Briefcase, BarChart3, ListChecks, Brain, Settings,
  ChevronRight, Mail,
} from 'lucide-react'

export interface SalesPortalCtx {
  profile: {
    id: string
    name: string
    email: string
    phone: string | null
    role: string
    org_id: string
    avatar_url: string | null
    xp: number
    level: number
  }
  unreadMessages: number
  pendingTasks: number
}

const BASE = '/sales-portal'

const C = {
  bg: '#0d0f14',
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
}

export default function SalesPortalShell({
  ctx,
  children,
}: {
  ctx: SalesPortalCtx
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const navItems = [
    { key: 'home', label: 'Home', icon: Home, href: '' },
    { key: 'dialer', label: 'Dialer', icon: Phone, href: '/dialer' },
    { key: 'leads', label: 'Leads', icon: Users, href: '/leads' },
    { key: 'messages', label: 'Messages', icon: MessageSquare, href: '/referrals' },
    { key: 'more', label: 'More', icon: Menu, href: '#more' },
  ]

  const moreItems = [
    { label: 'Referrals & Jobs', icon: Briefcase, href: `${BASE}/referrals`, color: C.green },
    { label: 'Communications', icon: Mail, href: `${BASE}/comms`, color: C.cyan },
    { label: 'Call History', icon: Phone, href: `${BASE}/calls`, color: C.accent },
    { label: 'Tasks', icon: ListChecks, href: `${BASE}/tasks`, color: C.amber },
    { label: 'AI Coaching', icon: Brain, href: `${BASE}/coaching`, color: C.purple },
    { label: 'Performance', icon: BarChart3, href: `${BASE}/coaching`, color: C.green },
    { label: 'Settings', icon: Settings, href: `${BASE}/settings`, color: C.text2 },
  ]

  function isActive(href: string) {
    if (!pathname) return false
    if (href === '') return pathname === BASE || pathname === BASE + '/'
    if (href === '#more') return false
    return pathname.startsWith(BASE + href)
  }

  const firstName = ctx.profile.name?.split(' ')[0] || 'Agent'

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text1, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 2,
              color: C.accent, textTransform: 'uppercase',
              fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
            }}>
              Sales Command Center
            </div>
            <div style={{
              fontSize: 17, fontWeight: 600, marginTop: 1,
              fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
            }}>
              {firstName}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {ctx.pendingTasks > 0 && (
              <Link href={`${BASE}/tasks`} style={{
                padding: '5px 10px', borderRadius: 20,
                background: `${C.amber}15`, border: `1px solid ${C.amber}30`,
                fontSize: 12, fontWeight: 700, color: C.amber,
                fontFamily: 'JetBrains Mono, monospace',
                textDecoration: 'none',
              }}>
                {ctx.pendingTasks} tasks
              </Link>
            )}
            <div style={{
              padding: '5px 10px', borderRadius: 20,
              background: `${C.purple}15`, border: `1px solid ${C.purple}30`,
              fontSize: 12, fontWeight: 700, color: C.purple,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              Lv{ctx.profile.level}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.surface, borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 0 env(safe-area-inset-bottom, 8px)', zIndex: 50,
      }}>
        {navItems.map((item) => {
          const active = isActive(item.href)
          const isMore = item.key === 'more'
          const Icon = item.icon
          const badge = item.key === 'messages' ? ctx.unreadMessages : 0

          if (isMore) {
            return (
              <button
                key={item.key}
                onClick={() => setMoreOpen(true)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '6px 10px', minWidth: 44, minHeight: 44, justifyContent: 'center',
                  color: moreOpen ? C.accent : C.text3,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: moreOpen ? 600 : 400, fontFamily: 'inherit',
                }}
              >
                <Icon size={20} strokeWidth={moreOpen ? 2.2 : 1.5} />
                <span>{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href === '' ? BASE : `${BASE}${item.href}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 10px', minWidth: 44, minHeight: 44, justifyContent: 'center',
                color: active ? C.accent : C.text3,
                textDecoration: 'none', fontSize: 10,
                fontWeight: active ? 600 : 400, position: 'relative',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
              <span>{item.label}</span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: C.red, color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* More Drawer */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: C.surface, borderTop: `1px solid ${C.border}`,
            borderRadius: '16px 16px 0 0', zIndex: 70,
            padding: '16px 16px env(safe-area-inset-bottom, 16px)',
            maxHeight: '70dvh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                More
              </span>
              <button onClick={() => setMoreOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.text3 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {moreItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => { setMoreOpen(false); router.push(item.href) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 12px', background: 'none', border: 'none',
                      cursor: 'pointer', color: C.text1, fontSize: 15, fontWeight: 500,
                      fontFamily: 'inherit', borderRadius: 10, width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${item.color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={18} color={item.color} strokeWidth={1.8} />
                    </div>
                    {item.label}
                    <ChevronRight size={16} color={C.text3} style={{ marginLeft: 'auto' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
