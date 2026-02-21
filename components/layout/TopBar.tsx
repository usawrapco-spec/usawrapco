'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import {
  Flame, Zap, Search, Bell, Plus, X, ChevronDown,
  FileText, ShoppingCart, Briefcase, Users, CheckSquare,
} from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':             'Dashboard',
  '/pipeline':              'Job Board',
  '/jobs':                  'Jobs',
  '/tasks':                 'Task Queue',
  '/calendar':              'Calendar',
  '/inbox':                 'Inbox',
  '/inventory':             'Vinyl Inventory',
  '/inventory/remnants':    'Remnant Tracking',
  '/design':                'Design Studio',
  '/employees':             'Team Management',
  '/analytics':             'Analytics',
  '/settings':              'Settings',
  '/overhead':              'Shop Overhead',
  '/1099':                  '1099 Tax Calculator',
  '/catalog':               'Product Catalog',
  '/leaderboard':           'Leaderboard',
  '/production':            'Production Hub',
  '/production/printers':   'Printer Maintenance',
  '/production/print-schedule': 'Print Schedule',
  '/timeline':              'Timeline',
  '/installer-portal':      'Installer Portal',
  '/media':                 'Media Library',
  '/reports':               'Reports',
  '/mockup':                'Mockup Tool',
  '/customers':             'Customers',
  '/network':               'Network Map',
  '/bids':                  'Installer Bids',
  '/estimates':             'Estimates',
  '/sales-orders':          'Sales Orders',
  '/invoices':              'Invoices',
  '/payroll':               'Payroll',
  '/prospects':             'Prospecting Center',
  '/contacts':              'Contacts',
  '/portal':                'Customer Portal',
}

const QUICK_CREATE = [
  { label: 'Estimate', icon: FileText, href: '/estimates', action: 'estimate' },
  { label: 'Sales Order', icon: ShoppingCart, href: '/sales-orders', action: 'sales_order' },
  { label: 'Job', icon: Briefcase, href: '/jobs', action: 'job' },
  { label: 'Customer', icon: Users, href: '/customers', action: 'customer' },
  { label: 'Task', icon: CheckSquare, href: '/tasks', action: 'task' },
]

export function TopBar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const createRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const title = PAGE_TITLES[pathname] ||
    (pathname?.startsWith('/projects/') && pathname.endsWith('/edit') ? 'Edit Project' :
     pathname?.startsWith('/projects/') ? 'Job Detail' :
     pathname?.startsWith('/customers/') ? 'Customer Detail' :
     pathname?.startsWith('/estimates/') ? 'Estimate Detail' :
     pathname?.startsWith('/sales-orders/') ? 'Sales Order Detail' :
     pathname?.startsWith('/invoices/') ? 'Invoice Detail' :
     pathname?.startsWith('/jobs/') ? 'Job Detail' :
     'USA Wrap Co')

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'
  const xp = profile.xp || 0
  const level = profile.level || (xp > 0 ? Math.floor(Math.sqrt(xp / 50)) + 1 : 1)
  const streak = profile.current_streak || 0

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  return (
    <header style={{
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      gap: 12,
    }}>
      {/* Left: Title */}
      <h1 style={{
        fontSize: 17,
        fontWeight: 800,
        color: 'var(--text1)',
        fontFamily: 'Barlow Condensed, sans-serif',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {title}
      </h1>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Quick Create */}
        {(isAdminRole(profile.role) || profile.role === 'sales_agent') && (
          <div ref={createRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setCreateOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 12px', borderRadius: 8,
                background: 'var(--green)', color: '#fff',
                fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              <Plus size={13} />
              <span className="hidden sm:inline">New</span>
              <ChevronDown size={11} style={{ opacity: 0.7 }} />
            </button>
            {createOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 4, minWidth: 180, zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {QUICK_CREATE.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.action}
                      onClick={() => { setCreateOpen(false); router.push(item.href) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 7, width: '100%',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text2)', fontSize: 13, fontWeight: 500,
                        textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Icon size={14} style={{ color: 'var(--text3)' }} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative' }}>
          {searchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text3)', pointerEvents: 'none',
                }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search jobs, customers, estimates..."
                  style={{
                    width: 260, padding: '7px 10px 7px 32px',
                    borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface2)', color: 'var(--text1)',
                    fontSize: 13, outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }}
                />
              </div>
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8,
                background: 'none', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text3)',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
            >
              <Search size={14} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8, position: 'relative',
              background: 'none', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text3)',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            <Bell size={14} />
            {/* Badge */}
            <span style={{
              position: 'absolute', top: -3, right: -3,
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--red)', color: '#fff',
              fontSize: 9, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              3
            </span>
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 0, width: 320, zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Notifications</span>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--accent)', fontWeight: 600,
                }}>
                  Mark all read
                </button>
              </div>
              {[
                { text: 'Bob\'s Pizza proof approved', time: '5 min ago', type: 'success' },
                { text: 'New installer bid from Jake Martinez', time: '1 hour ago', type: 'info' },
                { text: 'Invoice INV-2001 overdue (3 days)', time: '3 hours ago', type: 'warning' },
              ].map((n, i) => (
                <div key={i} style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 13, color: 'var(--text1)', marginBottom: 2 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{n.time}</div>
                </div>
              ))}
              <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
              </div>
            </div>
          )}
        </div>

        {/* XP + Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden sm:flex">
          {xp > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 20,
              background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.2)',
            }}>
              <Zap size={10} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                Lv.{level}
              </span>
            </div>
          )}
          {streak >= 2 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 20,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <Flame size={10} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                {streak}d
              </span>
            </div>
          )}
        </div>

        {/* Greeting */}
        <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }} className="hidden md:inline">
          {greeting}, <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{profile.name?.split(' ')[0] || profile.email?.split('@')[0]}</span>
        </span>
      </div>
    </header>
  )
}
