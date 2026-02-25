'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import {
  Truck, Plus, Search, Bell, Settings, ChevronDown, X, Menu,
  LayoutDashboard, Briefcase, CheckSquare, Calendar, Users,
  FileText, ShoppingCart, Receipt, DollarSign, BarChart3, Trophy,
  Inbox, LogOut, UserPlus, Zap, Flame, Palette, Clock, User, HelpCircle,
  Bot, Building2, Globe, TrendingUp, Layers, Map, Package, MessageSquare, CreditCard,
  type LucideIcon,
} from 'lucide-react'
import GenieFAB from '@/components/genie/GenieFAB'
import { ProductTour, WhatsNewModal, useTour } from '@/components/tour/ProductTour'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DropdownItem {
  href: string
  label: string
  icon: LucideIcon
  description?: string
}

// ── Nav definitions ───────────────────────────────────────────────────────────
const QUICK_CREATE: DropdownItem[] = [
  { href: '/estimates/new', label: 'Estimate',  icon: FileText, description: 'Create a quote' },
  { href: '/sales-orders?new=true', label: 'Sales Order', icon: ShoppingCart, description: 'Convert to order' },
  { href: '/jobs?new=true',     label: 'Job',       icon: Briefcase, description: 'Start a new job' },
  { href: '/customers?new=true',label: 'Customer',  icon: Users, description: 'Add a customer' },
  { href: '/tasks?new=true',    label: 'Task',      icon: CheckSquare, description: 'Assign a task' },
]

const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Pipeline',   icon: Layers },
  { href: '/jobs',        label: 'Jobs',       icon: Briefcase },
  { href: '/tasks',       label: 'Tasks',      icon: CheckSquare },
  { href: '/customers',   label: 'Customers',  icon: Users },
  { href: '/engine',      label: 'Engine',     icon: TrendingUp },
  { href: '/design',      label: 'Design',     icon: Palette },
  { href: '/inbox',       label: 'Inbox',      icon: Inbox },
]

const MORE_NAV: DropdownItem[] = [
  { href: '/estimates',    label: 'Estimates',    icon: FileText },
  { href: '/sales-orders', label: 'Sales Orders', icon: ShoppingCart },
  { href: '/invoices',     label: 'Invoices',     icon: Receipt },
  { href: '/comms',        label: 'Comms',        icon: MessageSquare },
  { href: '/contacts',     label: 'Contacts',     icon: Users },
  { href: '/prospects',    label: 'Prospects',    icon: UserPlus },
  { href: '/campaigns',    label: 'Campaigns',    icon: Globe },
  { href: '/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/leaderboard',  label: 'Leaderboard',  icon: Trophy },
  { href: '/payroll',      label: 'Payroll',      icon: DollarSign },
  { href: '/production',   label: 'Production',   icon: Package },
  { href: '/inventory',    label: 'Inventory',    icon: Package },
  { href: '/sourcing',     label: 'Sourcing',     icon: Globe },
  { href: '/network',      label: 'Network',      icon: Map },
  { href: '/calendar',     label: 'Calendar',     icon: Calendar },
  { href: '/workflow',     label: 'Workflow',     icon: Briefcase },
  { href: '/wrapup',       label: 'WrapUp',       icon: Truck },
]

const SETTINGS_ITEMS: DropdownItem[] = [
  { href: '/settings',              label: 'General',            icon: Settings },
  { href: '/settings/defaults',     label: 'Defaults & Pricing', icon: Settings },
  { href: '/settings/commissions',  label: 'Commission Rates',   icon: Receipt },
  { href: '/employees',             label: 'Team & Roles',       icon: Users },
  { href: '/settings/vehicles',     label: 'Vehicle Database',   icon: Truck },
  { href: '/overhead',              label: 'Shop Expenses',      icon: DollarSign },
  { href: '/1099',                  label: '1099 / Payroll',     icon: Receipt },
  { href: '/timeclock',             label: 'Time Clock',         icon: Clock },
  { href: '/settings/playbook',     label: 'Sales Playbook',     icon: Zap },
  { href: '/settings/ai',           label: 'AI Settings',        icon: Bot },
  { href: '/settings/payments',     label: 'Payments & Stripe',  icon: CreditCard },
  { href: '/integrations',          label: 'Integrations',       icon: Zap },
  { href: '/enterprise',            label: 'Enterprise Hub',     icon: Building2 },
]

// ── Search result types ───────────────────────────────────────────────────────
interface SearchResult {
  type: 'job' | 'customer' | 'estimate' | 'contact'
  id: string
  title: string
  subtitle?: string
  href: string
}

// ── Main TopNav ──────────────────────────────────────────────────────────────
export function TopNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const { tourOpen, whatsNewOpen, newCommits, startTour, closeTour, closeWhatsNew } = useTour()

  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching]         = useState(false)
  const [createOpen, setCreateOpen]       = useState(false)
  const [moreOpen, setMoreOpen]           = useState(false)
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [profileOpen, setProfileOpen]     = useState(false)
  const [notifOpen, setNotifOpen]         = useState(false)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifsLoaded, setNotifsLoaded]   = useState(false)

  const createRef   = useRef<HTMLDivElement>(null)
  const moreRef     = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const profileRef  = useRef<HTMLDivElement>(null)
  const notifRef    = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)

  const xp      = profile.xp || 0
  const level   = profile.level || (xp > 0 ? Math.floor(Math.sqrt(xp / 50)) + 1 : 1)
  const streak  = profile.current_streak || 0
  const initial = (profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()

  // ── Outside click ───────────────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const refs = [createRef, moreRef, settingsRef, profileRef, notifRef]
      const setters = [setCreateOpen, setMoreOpen, setSettingsOpen, setProfileOpen, setNotifOpen]
      refs.forEach((ref, i) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setters[i](false)
        }
      })
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Keyboard shortcut (Ctrl+K for search) ──────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // ── Notifications ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications || []); setNotifsLoaded(true) })
      .catch(() => setNotifsLoaded(true))
  }, [])

  // ── Mobile drawer: close on route change, open via event ───────────────────
  useEffect(() => { setDrawerOpen(false) }, [pathname])
  useEffect(() => {
    function onOpenDrawer() { setDrawerOpen(true) }
    window.addEventListener('open-nav-drawer', onOpenDrawer)
    return () => window.removeEventListener('open-nav-drawer', onOpenDrawer)
  }, [])

  // ── Global search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const q = searchQuery.toLowerCase()
        const [jobsRes, customersRes, estimatesRes] = await Promise.all([
          supabase.from('projects').select('id, title, customer:customer_id(name)').eq('org_id', profile.org_id).ilike('title', `%${q}%`).limit(5),
          supabase.from('customers').select('id, name, contact_name, company_name, email').eq('org_id', profile.org_id).or(`name.ilike.%${q}%,contact_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
          supabase.from('estimates').select('id, title, customer:customer_id(name)').eq('org_id', profile.org_id).ilike('title', `%${q}%`).limit(5),
        ])
        const results: SearchResult[] = [
          ...(jobsRes.data || []).map((j: any) => ({
            type: 'job' as const, id: j.id,
            title: j.title || `Job #${j.id.slice(0, 8)}`,
            subtitle: (j.customer as any)?.name,
            href: `/projects/${j.id}`,
          })),
          ...(customersRes.data || []).map((c: any) => ({
            type: 'customer' as const, id: c.id,
            title: c.contact_name || c.name || c.company_name || c.email || 'Unknown',
            subtitle: c.email,
            href: `/customers/${c.id}`,
          })),
          ...(estimatesRes.data || []).map((e: any) => ({
            type: 'estimate' as const, id: e.id,
            title: e.title || `Estimate #${e.id.slice(0, 8)}`,
            subtitle: (e.customer as any)?.name,
            href: `/estimates/${e.id}`,
          })),
        ]
        setSearchResults(results)
      } catch {}
      setSearching(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, profile.org_id])

  async function markAllRead() {
    const ids = notifications.map(n => n.id).filter(id => !String(id).startsWith('sb-') && !String(id).startsWith('od-'))
    if (ids.length) {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
    }
    setNotifications([])
  }

  function relTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  function closeAll() {
    setCreateOpen(false); setMoreOpen(false); setSettingsOpen(false)
    setProfileOpen(false); setNotifOpen(false)
  }

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SEARCH_TYPE_ICON: Record<string, LucideIcon> = {
    job: Briefcase, customer: Users, estimate: FileText, contact: User,
  }
  const SEARCH_TYPE_COLOR: Record<string, string> = {
    job: 'var(--accent)', customer: 'var(--green)', estimate: 'var(--amber)', contact: 'var(--cyan)',
  }

  return (
    <>
    <header style={{
      height: 56,
      background: 'linear-gradient(180deg, var(--card-bg) 0%, var(--surface) 100%)',
      borderBottom: '1px solid var(--card-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 8,
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>

      {/* ── Mobile hamburger (shown only on < md) ─────────────── */}
      <button
        className="md:hidden"
        onClick={() => setDrawerOpen(true)}
        style={{
          width: 44, height: 44, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)',
        }}
      >
        <Menu size={20} />
      </button>

      {/* ── Logo ──────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', flexShrink: 0, marginRight: 4,
        }}
      >
        <img
          src="/images/usawrapco-logo-white.png"
          alt="USA WRAP CO"
          style={{ height: 30, width: 'auto', display: 'block', objectFit: 'contain' }}
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement
            t.style.display = 'none'
            const fallback = t.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
        <span style={{
          display: 'none', alignItems: 'center', gap: 6,
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 16, fontWeight: 900,
          letterSpacing: '0.02em',
          color: 'var(--text1)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          <Truck size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          USA WRAP CO
        </span>
      </Link>

      {/* ── + New Button (always visible, green, prominent) ──── */}
      <div ref={createRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          data-tour="new-button"
          onClick={() => { closeAll(); setCreateOpen(v => !v) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8,
            background: 'var(--green)', color: '#fff',
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(34, 192, 122, 0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(34, 192, 122, 0.45)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 192, 122, 0.3)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span className="hidden sm:inline">New</span>
          <ChevronDown size={11} style={{ opacity: 0.7, transform: createOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {createOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 12, padding: 6, minWidth: 220,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            animation: 'fadeUp .15s ease',
          }}>
            <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Quick Create
            </div>
            {QUICK_CREATE.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => { setCreateOpen(false); router.push(item.href) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 10px', borderRadius: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text1)', fontSize: 13, fontWeight: 500,
                    textAlign: 'left', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'rgba(34, 192, 122, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={14} style={{ color: 'var(--green)' }} />
                  </div>
                  <div>
                    <div style={{ lineHeight: 1.2 }}>{item.label}</div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.description}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Icon Nav Links (desktop only) ─────────────────────── */}
      <nav
        className="hidden md:flex"
        style={{ alignItems: 'center', gap: 1, marginLeft: 4 }}
      >
        {NAV_LINKS.map(link => {
          const active = isActive(link.href)
          const Icon = link.icon
          const tourId = link.href === '/jobs' ? 'nav-jobs' : link.href === '/inbox' ? 'nav-inbox' : link.href === '/tasks' ? 'nav-tasks' : undefined
          return (
            <Link
              key={link.href}
              href={link.href}
              data-tour={tourId}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 8,
                fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? 'var(--accent)' : 'var(--text2)',
                background: active ? 'rgba(79,127,255,0.1)' : 'transparent',
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface2)'
                  e.currentTarget.style.color = 'var(--text1)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text2)'
                }
              }}
            >
              <Icon size={14} style={{ opacity: active ? 1 : 0.7 }} />
              <span className="hidden lg:inline">{link.label}</span>
            </Link>
          )
        })}

        {/* More dropdown */}
        <div ref={moreRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { closeAll(); setMoreOpen(v => !v) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '6px 8px', borderRadius: 8, border: 'none',
              background: moreOpen ? 'var(--surface2)' : 'transparent',
              color: moreOpen ? 'var(--text1)' : 'var(--text3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!moreOpen) e.currentTarget.style.background = 'var(--surface2)' }}
            onMouseLeave={e => { if (!moreOpen) e.currentTarget.style.background = 'transparent' }}
          >
            More
            <ChevronDown size={11} style={{ opacity: 0.6, transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {moreOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 12, padding: 6, minWidth: 200,
              maxHeight: 400, overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              animation: 'fadeUp .15s ease',
            }}>
              {MORE_NAV.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => { setMoreOpen(false); router.push(item.href) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 10px', borderRadius: 7,
                      background: active ? 'rgba(79,127,255,0.08)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: active ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      textAlign: 'left', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = active ? 'rgba(79,127,255,0.08)' : 'none')}
                  >
                    <Icon size={14} style={{ color: active ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* ── Center: Global Search Bar ─────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 12px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: searchFocused ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.15s',
            pointerEvents: 'none',
          }} />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search jobs, customers, estimates..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 10,
              border: searchFocused ? '1px solid var(--accent)' : '1px solid var(--card-border)',
              background: searchFocused ? 'var(--surface2)' : 'var(--surface)',
              color: 'var(--text1)',
              fontSize: 13, outline: 'none',
              transition: 'all 0.2s',
              boxShadow: searchFocused ? '0 0 0 3px rgba(79,127,255,0.1)' : 'none',
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setSearchQuery(''); (e.target as HTMLInputElement).blur() }
            }}
          />
          <kbd style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            padding: '2px 6px', borderRadius: 4,
            background: 'var(--surface2)', border: '1px solid var(--card-border)',
            fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace',
            opacity: searchFocused ? 0 : 0.7, transition: 'opacity 0.15s',
            pointerEvents: 'none',
          }}>
            {navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
          </kbd>

          {/* Search results dropdown */}
          {searchFocused && searchQuery.length >= 2 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden', animation: 'fadeUp .15s ease',
            }}>
              {searching && (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Searching...</div>
              )}
              {!searching && searchResults.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>No results found</div>
              )}
              {!searching && searchResults.map(r => {
                const Icon = SEARCH_TYPE_ICON[r.type] || Briefcase
                const color = SEARCH_TYPE_COLOR[r.type] || 'var(--accent)'
                return (
                  <button
                    key={r.id}
                    onMouseDown={(e) => { e.preventDefault(); router.push(r.href); setSearchQuery('') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text1)', fontSize: 13, fontWeight: 500,
                      textAlign: 'left', transition: 'background 0.12s',
                      borderBottom: '1px solid var(--card-border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: `${color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      {r.subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.subtitle}</div>}
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 4,
                      background: `${color}12`, color,
                    }}>
                      {r.type}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right side ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

        {/* XP + Streak pills */}
        {xp > 0 && (
          <div
            className="hidden lg:flex"
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.15)',
            }}
          >
            <Zap size={10} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
              Lv.{level}
            </span>
          </div>
        )}
        {streak >= 2 && (
          <div
            className="hidden lg:flex"
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <Flame size={10} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
              {streak}d
            </span>
          </div>
        )}

        {/* Notifications Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { closeAll(); setNotifOpen(v => !v) }}
            title="Notifications"
            className="w-[44px] h-[44px] md:w-[34px] md:h-[34px]"
            style={{
              borderRadius: 8, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: notifOpen ? 'var(--surface2)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: notifOpen ? 'var(--text1)' : 'var(--text3)',
              flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text1)' }}
            onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
          >
            <Bell size={16} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, borderRadius: 8,
                background: 'var(--red)', color: '#fff',
                fontSize: 9, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 0 0 2px var(--card-bg)',
              }}>
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 14, width: 340, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden', animation: 'fadeUp .15s ease',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--card-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Notifications</span>
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}
                >
                  Mark all read
                </button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {!notifsLoaded ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Loading...</div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                    All caught up
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={n.id ?? i} style={{
                      padding: '10px 16px', borderBottom: '1px solid var(--card-border)',
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 500, marginBottom: 2 }}>{n.title || n.message}</div>
                      {n.title && n.message && (
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>{n.message}</div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{n.created_at ? relTime(n.created_at) : ''}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help/Tour */}
        <button
          onClick={startTour}
          title="Product Tour"
          className="hidden md:flex"
          style={{
            width: 34, height: 34, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' }}
        >
          <HelpCircle size={16} />
        </button>

        {/* Settings */}
        <div ref={settingsRef} style={{ position: 'relative' }} className="hidden md:block">
          <button
            onClick={() => { closeAll(); setSettingsOpen(v => !v) }}
            title="Settings"
            style={{
              width: 34, height: 34, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: settingsOpen ? 'var(--surface2)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: settingsOpen ? 'var(--text1)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text1)' }}
            onMouseLeave={e => { if (!settingsOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
          >
            <Settings size={16} style={{ transition: 'transform 0.3s', transform: settingsOpen ? 'rotate(90deg)' : 'none' }} />
          </button>
          {settingsOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 12, padding: 6, minWidth: 220, maxHeight: 400, overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              animation: 'fadeUp .15s ease',
            }}>
              <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Settings & Admin
              </div>
              {SETTINGS_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    onClick={() => { setSettingsOpen(false); router.push(item.href) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 10px', borderRadius: 7,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: 13, fontWeight: 500,
                      textAlign: 'left', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Icon size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Profile avatar */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { closeAll(); setProfileOpen(v => !v) }}
            className="w-[44px] h-[44px] md:w-[34px] md:h-[34px]"
            style={{
              borderRadius: '50%',
              background: profileOpen ? 'rgba(79,127,255,0.2)' : 'rgba(79,127,255,0.12)',
              border: `2px solid ${profileOpen ? 'var(--accent)' : 'rgba(79,127,255,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'var(--accent)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.2s',
            }}
            title={profile.name ?? profile.email}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.borderColor = 'rgba(79,127,255,0.3)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            {initial}
          </button>
          {profileOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 14, width: 240, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden', animation: 'fadeUp .15s ease',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(79,127,255,0.15)', border: '2px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: 'var(--accent)',
                }}>
                  {initial}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {profile.name ?? profile.email}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>
                    {profile.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>
              {[
                { label: 'View Profile',    icon: User,       href: '/employees' },
                { label: 'Clock In / Out',  icon: Clock,      href: '/timeclock' },
                { label: 'My Payroll',      icon: DollarSign, href: '/payroll' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    onClick={() => { setProfileOpen(false); router.push(item.href) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: 13, fontWeight: 500,
                      textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Icon size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}
              <div style={{ borderTop: '1px solid var(--card-border)' }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--red)', fontSize: 13, fontWeight: 600,
                    textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,90,90,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={14} style={{ flexShrink: 0 }} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    <GenieFAB userName={profile.name || profile.email || 'User'} userRole={profile.role} />
    <ProductTour userName={profile.name || profile.email || 'User'} open={tourOpen} onClose={closeTour} />
    {whatsNewOpen && <WhatsNewModal commits={newCommits} onClose={closeWhatsNew} />}

    {/* ── Mobile left slide-out drawer ──────────────────────── */}
    {drawerOpen && (
      <>
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 401,
          width: 280,
          background: 'var(--surface)',
          borderRight: '1px solid var(--card-border)',
          animation: 'slideInLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Drawer header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--card-border)',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 18, fontWeight: 900, color: 'var(--text1)',
              letterSpacing: '0.02em',
            }}>
              USA WRAP CO
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none',
                background: 'var(--surface2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text2)',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ padding: 8, flex: 1 }}>
            {NAV_LINKS.map(link => {
              const active = isActive(link.href)
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    textDecoration: 'none', marginBottom: 2,
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    background: active ? 'rgba(79,127,255,0.1)' : 'transparent',
                    fontSize: 14, fontWeight: active ? 700 : 500,
                  }}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {link.label}
                </Link>
              )
            })}

            <div style={{ height: 1, background: 'var(--card-border)', margin: '8px 4px' }} />

            {MORE_NAV.slice(0, 8).map(item => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    textDecoration: 'none', marginBottom: 2,
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    background: active ? 'rgba(79,127,255,0.1)' : 'transparent',
                    fontSize: 14, fontWeight: active ? 700 : 500,
                  }}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div style={{ padding: 8, borderTop: '1px solid var(--card-border)', flexShrink: 0 }}>
            <button
              onClick={() => { setDrawerOpen(false); handleSignOut() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--red)', fontSize: 14, fontWeight: 600,
                textAlign: 'left',
              }}
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </div>
      </>
    )}
    </>
  )
}
