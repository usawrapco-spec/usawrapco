'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import {
  Menu, Search, Bell, Plus, ChevronDown, X,
  Briefcase, Users, FileText, ShoppingCart, CheckSquare, UserPlus,
  Clock, LogOut, User, Settings, Download, BellOff,
  MessageCircle, Palette, UserCheck, CalendarDays,
  DollarSign, BarChart3, Trophy, Factory, Wrench,
  ClipboardList, Layers, Wand2, ImageIcon, FileBarChart,
  Hammer, ShoppingBag, Banknote, MessageSquare,
  Map, Package, BookOpen, Phone, TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { ProductTour, WhatsNewModal, useTour } from '@/components/tour/ProductTour'
import DesignIntakeLinkModal from '@/components/design-intake/DesignIntakeLinkModal'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { SideNav } from '@/components/layout/SideNav'
import { QuickPermissionsWidget } from '@/components/ui/QuickPermissionsWidget'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DropdownItem { href: string; label: string; icon: LucideIcon; description?: string }

// ── Nav definitions ───────────────────────────────────────────────────────────
const QUICK_CREATE: DropdownItem[] = [
  { href: '/estimates/new',      label: 'New Estimate',   icon: FileText,    description: 'Create a quote' },
  { href: '/sales-orders?new=1', label: 'Sales Order',    icon: ShoppingCart, description: 'Convert to order' },
  { href: '/pipeline?new=true',  label: 'New Wrap Job',   icon: Briefcase,   description: 'Start a wrap job' },
  { href: '/customers?new=true', label: 'New Customer',   icon: Users,       description: 'Add a customer' },
  { href: '/tasks?new=true',     label: 'New Task',       icon: CheckSquare, description: 'Assign a task' },
  { href: '/timeclock',          label: 'Clock In',       icon: Clock,       description: 'Start your shift' },
]

const JOBS_ITEMS: DropdownItem[] = [
  { href: '/pipeline',    label: 'Pipeline',    icon: Briefcase,    description: 'Kanban job board' },
  { href: '/jobs',        label: 'All Jobs',    icon: ClipboardList, description: 'Full job list' },
  { href: '/timeline',    label: 'Timeline',    icon: Clock,        description: 'Visual timeline' },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy,       description: 'Team rankings' },
]

const PRODUCTION_ITEMS: DropdownItem[] = [
  { href: '/production',   label: 'Production Board', icon: Factory,  description: 'Production overview' },
  { href: '/design',       label: 'Design Studio',    icon: Palette,  description: 'Design workspace' },
  { href: '/mockup',       label: 'Mockup Tool',      icon: Wand2,    description: 'Vehicle mockups' },
  { href: '/media',        label: 'Media Library',    icon: ImageIcon, description: 'Files & assets' },
]

const PRODUCTION_PATHS = ['/production', '/design', '/mockup', '/media']

const SALES_ACTIONS: { id: string; label: string; icon: LucideIcon; description: string }[] = [
  { id: 'new_estimate',       label: 'New Estimate',            icon: FileText, description: 'Create a new quote' },
  { id: 'design_intake_link', label: 'Send Design Intake Link', icon: Palette,  description: 'White-glove design intake' },
]

const SALES_NAV_ITEMS: DropdownItem[] = [
  { href: '/pipeline',   label: 'Pipeline',   icon: Briefcase },
  { href: '/customers',  label: 'Customers',  icon: Users },
  { href: '/prospects',  label: 'Prospects',  icon: UserPlus },
  { href: '/analytics',  label: 'Analytics',  icon: BarChart3 },
  { href: '/reports',    label: 'Reports',    icon: FileBarChart },
]

const SALES_PATHS = ['/estimates', '/sales-orders', '/prospects', '/campaigns', '/network', '/contacts', '/bids', '/pipeline', '/customers', '/analytics', '/reports']

const INSTALL_ITEMS: DropdownItem[] = [
  { href: '/installer-portal', label: 'Install Board',  icon: Hammer,        description: 'Manage installs' },
  { href: '/bids',             label: 'Installer Bids', icon: ClipboardList, description: 'Bid management' },
  { href: '/calendar',         label: 'Schedule',       icon: CalendarDays,  description: 'Install calendar' },
]

const INSTALL_PATHS = ['/installer-portal']

const MORE_NAV: DropdownItem[] = [
  { href: '/payroll',    label: 'Payroll',    icon: DollarSign },
  { href: '/inventory',  label: 'Inventory',  icon: Package },
  { href: '/catalog',    label: 'Catalog',    icon: BookOpen },
  { href: '/overhead',   label: 'Overhead',   icon: TrendingUp },
  { href: '/settings',   label: 'Settings',   icon: Settings },
]

// ── Search result types ───────────────────────────────────────────────────────
interface SearchResult {
  type: 'job' | 'customer' | 'estimate' | 'contact'
  id: string
  title: string
  subtitle?: string
  href: string
}

const SEARCH_TYPE_ICON: Record<string, LucideIcon> = {
  job: Briefcase, customer: Users, estimate: FileText, contact: User,
}
const SEARCH_TYPE_COLOR: Record<string, string> = {
  job: 'var(--accent)', customer: 'var(--green)', estimate: 'var(--amber)', contact: 'var(--cyan)',
}

// ── Sidebar widths ────────────────────────────────────────────────────────────
const SIDEBAR_EXPANDED  = 240
const SIDEBAR_COLLAPSED = 48

// ── TopNav Component ──────────────────────────────────────────────────────────
export function TopNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const { tourOpen, whatsNewOpen, newCommits, closeTour, closeWhatsNew } = useTour()

  // Sidebar state — default collapsed
  const [sideCollapsed, setSideCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('sidenav-collapsed')
    return stored === null ? true : stored === 'true'
  })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Nav dropdowns
  const [jobsOpen,       setJobsOpen]       = useState(false)
  const [productionOpen, setProductionOpen] = useState(false)
  const [salesOpen,      setSalesOpen]      = useState(false)
  const [installOpen,    setInstallOpen]    = useState(false)
  const [moreOpen,       setMoreOpen]       = useState(false)

  // Action dropdowns
  const [createOpen,  setCreateOpen]  = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen,   setNotifOpen]   = useState(false)

  // Search
  const [searchFocused,  setSearchFocused]  = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<SearchResult[]>([])
  const [searching,      setSearching]      = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifsLoaded,  setNotifsLoaded]  = useState(false)

  // Inbox unread count
  const [inboxUnread, setInboxUnread] = useState(0)

  // Misc
  const [showDesignIntakeModal, setShowDesignIntakeModal] = useState(false)
  const [installPrompt,         setInstallPrompt]         = useState<any>(null)
  const [isInstalled,           setIsInstalled]           = useState(false)

  const jobsRef       = useRef<HTMLDivElement>(null)
  const productionRef = useRef<HTMLDivElement>(null)
  const salesRef      = useRef<HTMLDivElement>(null)
  const installRef    = useRef<HTMLDivElement>(null)
  const moreRef       = useRef<HTMLDivElement>(null)
  const createRef     = useRef<HTMLDivElement>(null)
  const profileRef    = useRef<HTMLDivElement>(null)
  const notifRef      = useRef<HTMLDivElement>(null)
  const searchRef     = useRef<HTMLInputElement>(null)

  const push = usePushNotifications()

  const initial = (profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()

  function closeAll() {
    setJobsOpen(false); setProductionOpen(false); setSalesOpen(false)
    setInstallOpen(false); setMoreOpen(false)
    setCreateOpen(false); setProfileOpen(false); setNotifOpen(false)
  }

  function isActive(href: string) {
    if (!pathname) return false
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/') || pathname.startsWith('/projects/')
    return pathname === href || pathname.startsWith(href + '/')
  }

  // ── Sidebar body-padding injection ─────────────────────────────────────────
  useEffect(() => {
    function apply() {
      const w = window.innerWidth
      if (w >= 768) {
        document.body.style.paddingLeft = `${sideCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`
      } else {
        document.body.style.paddingLeft = '0'
      }
      document.body.style.background = 'var(--bg)'
    }
    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      document.body.style.paddingLeft = '0'
    }
  }, [sideCollapsed])

  function toggleSideCollapse() {
    setSideCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidenav-collapsed', String(next))
      return next
    })
  }

  useEffect(() => {
    setMobileNavOpen(false)
    closeAll()
  }, [pathname])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const refs = [jobsRef, productionRef, salesRef, installRef, moreRef, createRef, profileRef, notifRef]
      const setters = [setJobsOpen, setProductionOpen, setSalesOpen, setInstallOpen, setMoreOpen, setCreateOpen, setProfileOpen, setNotifOpen]
      refs.forEach((ref, i) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setters[i](false)
      })
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications || []); setNotifsLoaded(true) })
      .catch(() => setNotifsLoaded(true))
  }, [])

  useEffect(() => {
    async function loadUnread() {
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('status', 'open')
        .gt('unread_count', 0)
      setInboxUnread(count || 0)
    }
    loadUnread()
  }, [profile.org_id])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }
    function onBefore(e: any) { e.preventDefault(); setInstallPrompt(e) }
    function onInstalled()    { setInstallPrompt(null); setIsInstalled(true) }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const q = searchQuery.toLowerCase()
        const [jobsR, custsR, estR] = await Promise.all([
          supabase.from('projects').select('id, title, customer:customer_id(name)').eq('org_id', profile.org_id).ilike('title', `%${q}%`).limit(5),
          supabase.from('customers').select('id, name, contact_name, company_name, email').eq('org_id', profile.org_id).or(`name.ilike.%${q}%,contact_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
          supabase.from('estimates').select('id, title, customer:customer_id(name)').eq('org_id', profile.org_id).ilike('title', `%${q}%`).limit(5),
        ])
        setSearchResults([
          ...(jobsR.data || []).map((j: any) => ({
            type: 'job' as const, id: j.id,
            title: j.title || `Job #${j.id.slice(0, 8)}`,
            subtitle: (j.customer as any)?.name,
            href: `/projects/${j.id}`,
          })),
          ...(custsR.data || []).map((c: any) => ({
            type: 'customer' as const, id: c.id,
            title: c.contact_name || c.name || c.company_name || c.email || 'Unknown',
            subtitle: c.email,
            href: `/customers/${c.id}`,
          })),
          ...(estR.data || []).map((e: any) => ({
            type: 'estimate' as const, id: e.id,
            title: e.title || `Estimate #${e.id.slice(0, 8)}`,
            subtitle: (e.customer as any)?.name,
            href: `/estimates/${e.id}`,
          })),
        ])
      } catch {}
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, profile.org_id])

  async function markAllRead() {
    const ids = notifications.map(n => n.id).filter((id: any) => !String(id).startsWith('sb-') && !String(id).startsWith('od-'))
    if (ids.length) {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
    }
    setNotifications([])
  }

  function relTime(ts: string) {
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // ── Shared dropdown panel style ──────────────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
    background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 6, minWidth: 210,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  }

  // ── Shared nav button style ───────────────────────────────────────────────
  function navBtnStyle(active: boolean): React.CSSProperties {
    return {
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 10px', borderRadius: 8, border: 'none',
      background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text2)',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      transition: 'all 0.15s',
    }
  }

  function dropItemStyle(active: boolean): React.CSSProperties {
    return {
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '8px 10px', borderRadius: 7,
      background: active ? 'rgba(79,127,255,0.08)' : 'none',
      border: 'none', cursor: 'pointer',
      color: active ? 'var(--accent)' : 'var(--text2)',
      fontSize: 13, fontWeight: active ? 600 : 500,
      textAlign: 'left' as const, transition: 'all 0.12s',
    }
  }

  return (
    <>
      <SideNav
        profile={profile}
        collapsed={sideCollapsed}
        onToggleCollapse={toggleSideCollapse}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <header
        style={{
          height: 56,
          background: 'var(--surface)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 4,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileNavOpen(true)}
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)',
          }}
        >
          <Menu size={20} />
        </button>

        {/* ── Green "+ New" button ─────────────────────────────────────────── */}
        <div ref={createRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => { closeAll(); setCreateOpen(v => !v) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--green)', color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(34,192,122,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">New</span>
            <ChevronDown size={11} style={{ opacity: 0.7, transform: createOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {createOpen && (
            <div style={{ ...dropdownStyle, minWidth: 220 }}>
              <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Create</div>
              {QUICK_CREATE.map(item => {
                const Icon = item.icon
                return (
                  <button key={item.href} onClick={() => { setCreateOpen(false); router.push(item.href) }}
                    style={dropItemStyle(false)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(34,192,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color="var(--green)" />
                    </div>
                    <div>
                      <div style={{ lineHeight: 1.2 }}>{item.label}</div>
                      {item.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.description}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Horizontal Dropdown Nav (desktop) ───────────────────────────── */}
        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 1, marginLeft: 4 }}>

          {/* Chat / Inbox */}
          <Link href="/inbox" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 8,
            fontSize: 12, fontWeight: isActive('/inbox') ? 700 : 500,
            color: isActive('/inbox') ? 'var(--accent)' : 'var(--text2)',
            background: isActive('/inbox') ? 'rgba(79,127,255,0.12)' : 'transparent',
            textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>
            <MessageCircle size={14} />
            <span className="hidden lg:inline">Chat</span>
            {inboxUnread > 0 && (
              <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, padding: '0 4px' }}>
                {inboxUnread > 99 ? '99+' : inboxUnread}
              </span>
            )}
          </Link>

          {/* Jobs dropdown */}
          <div ref={jobsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { closeAll(); setJobsOpen(v => !v) }}
              style={navBtnStyle(jobsOpen || ['/pipeline', '/jobs', '/timeline', '/leaderboard'].some(p => isActive(p)))}
              onMouseEnter={e => { if (!jobsOpen) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!jobsOpen) e.currentTarget.style.background = isActive('/pipeline') || isActive('/jobs') ? 'rgba(79,127,255,0.12)' : 'transparent' }}
            >
              <Briefcase size={14} />
              <span className="hidden lg:inline">Jobs</span>
              <ChevronDown size={11} style={{ opacity: 0.6, transform: jobsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {jobsOpen && (
              <div style={dropdownStyle}>
                {JOBS_ITEMS.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button key={item.href} onClick={() => { setJobsOpen(false); router.push(item.href) }}
                      style={dropItemStyle(active)}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
                    >
                      <Icon size={14} style={{ color: active ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }} />
                      <div>
                        <div>{item.label}</div>
                        {item.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.description}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Production dropdown */}
          <div ref={productionRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { closeAll(); setProductionOpen(v => !v) }}
              style={navBtnStyle(productionOpen || PRODUCTION_PATHS.some(p => isActive(p)))}
              onMouseEnter={e => { if (!productionOpen) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!productionOpen) e.currentTarget.style.background = PRODUCTION_PATHS.some(p => isActive(p)) ? 'rgba(79,127,255,0.12)' : 'transparent' }}
            >
              <Factory size={14} />
              <span className="hidden lg:inline">Production</span>
              <ChevronDown size={11} style={{ opacity: 0.6, transform: productionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {productionOpen && (
              <div style={dropdownStyle}>
                {PRODUCTION_ITEMS.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button key={item.href} onClick={() => { setProductionOpen(false); router.push(item.href) }}
                      style={dropItemStyle(active)}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
                    >
                      <Icon size={14} style={{ color: active ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }} />
                      <div>
                        <div>{item.label}</div>
                        {item.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.description}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sales dropdown */}
          <div ref={salesRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { closeAll(); setSalesOpen(v => !v) }}
              style={navBtnStyle(salesOpen || SALES_PATHS.some(p => pathname?.startsWith(p)))}
              onMouseEnter={e => { if (!salesOpen) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!salesOpen) e.currentTarget.style.background = SALES_PATHS.some(p => pathname?.startsWith(p)) ? 'rgba(79,127,255,0.12)' : 'transparent' }}
            >
              <DollarSign size={14} />
              <span className="hidden lg:inline">Sales</span>
              <ChevronDown size={11} style={{ opacity: 0.6, transform: salesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {salesOpen && (
              <div style={{ ...dropdownStyle, minWidth: 240 }}>
                <div style={{ padding: '6px 10px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actions</div>
                {SALES_ACTIONS.map(action => {
                  const Icon = action.icon
                  return (
                    <button key={action.id}
                      onClick={() => {
                        setSalesOpen(false)
                        if (action.id === 'new_estimate') router.push('/estimates/new')
                        else if (action.id === 'design_intake_link') setShowDesignIntakeModal(true)
                      }}
                      style={dropItemStyle(false)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(79,127,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} color="var(--accent)" />
                      </div>
                      <div>
                        <div style={{ lineHeight: 1.2 }}>{action.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{action.description}</div>
                      </div>
                    </button>
                  )
                })}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 6px' }} />
                <div style={{ padding: '6px 10px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Navigate</div>
                {SALES_NAV_ITEMS.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button key={item.href} onClick={() => { setSalesOpen(false); router.push(item.href) }}
                      style={dropItemStyle(active)}
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

          {/* Install dropdown */}
          <div ref={installRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { closeAll(); setInstallOpen(v => !v) }}
              style={navBtnStyle(installOpen || INSTALL_PATHS.some(p => pathname?.startsWith(p)))}
              onMouseEnter={e => { if (!installOpen) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!installOpen) e.currentTarget.style.background = INSTALL_PATHS.some(p => pathname?.startsWith(p)) ? 'rgba(79,127,255,0.12)' : 'transparent' }}
            >
              <Wrench size={14} />
              <span className="hidden lg:inline">Install</span>
              <ChevronDown size={11} style={{ opacity: 0.6, transform: installOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {installOpen && (
              <div style={dropdownStyle}>
                {INSTALL_ITEMS.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button key={item.href} onClick={() => { setInstallOpen(false); router.push(item.href) }}
                      style={dropItemStyle(active)}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
                    >
                      <Icon size={14} style={{ color: active ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }} />
                      <div>
                        <div>{item.label}</div>
                        {item.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.description}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* More dropdown */}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { closeAll(); setMoreOpen(v => !v) }}
              style={navBtnStyle(moreOpen)}
              onMouseEnter={e => { if (!moreOpen) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (!moreOpen) e.currentTarget.style.background = 'transparent' }}
            >
              More
              <ChevronDown size={11} style={{ opacity: 0.6, transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {moreOpen && (
              <div style={dropdownStyle}>
                {MORE_NAV.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button key={item.href} onClick={() => { setMoreOpen(false); router.push(item.href) }}
                      style={dropItemStyle(active)}
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

        <div style={{ flex: 1 }} />

        {/* ── Search ───────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', maxWidth: 320, width: '100%' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface2)',
            border: `1px solid ${searchFocused ? 'rgba(79,127,255,0.5)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 9, padding: '0 12px', height: 36, transition: 'border-color 0.15s',
          }}>
            <Search size={14} color={searchFocused ? 'var(--accent)' : 'var(--text3)'} style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => { setSearchFocused(false); setSearchQuery(''); setSearchResults([]) }, 200)}
              placeholder="Search... (Ctrl+K)"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text1)', minWidth: 0 }}
            />
            {searching && (
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
            )}
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>
          {searchFocused && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
              background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: 6, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}>
              {searchResults.map(r => {
                const Icon = SEARCH_TYPE_ICON[r.type]
                const color = SEARCH_TYPE_COLOR[r.type]
                return (
                  <Link key={r.id} href={r.href} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon size={14} color={color} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{r.title}</div>
                      {r.subtitle && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.subtitle}</div>}
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 10, color, textTransform: 'capitalize' }}>{r.type}</div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Alerts Bell ─────────────────────────────────────────────── */}
        <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => { closeAll(); setNotifOpen(v => !v) }}
            style={{
              width: 36, height: 36, borderRadius: 8, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: notifOpen ? 'var(--surface2)' : 'none',
              border: 'none', cursor: 'pointer', color: 'var(--text2)',
            }}>
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                background: 'var(--red)', color: '#fff',
                borderRadius: 10, fontSize: 9, fontWeight: 800,
                minWidth: 16, height: 16, padding: '0 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--bg)', lineHeight: 1,
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
              width: 340, background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Notifications</span>
                  {unreadCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{unreadCount}</span>}
                </div>
                {notifications.length > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11 }}>Mark all read</button>
                )}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {!notifsLoaded ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <BellOff size={28} color="var(--text3)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'var(--text3)' }}>All caught up!</p>
                  </div>
                ) : notifications.map((n, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: n.read ? 'transparent' : 'rgba(79,127,255,0.04)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: n.read ? 400 : 600 }}>{n.message || n.title || 'New notification'}</div>
                    {n.created_at && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{relTime(n.created_at)}</div>}
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Push notifications</span>
                <button onClick={push.isSubscribed ? push.unsubscribe : push.subscribe} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                  background: push.isSubscribed ? 'rgba(34,192,122,0.1)' : 'rgba(79,127,255,0.1)',
                  color: push.isSubscribed ? 'var(--green)' : 'var(--accent)',
                }}>
                  {push.isSubscribed ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User avatar / profile ─────────────────────────────────────── */}
        <div ref={profileRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => { closeAll(); setProfileOpen(v => !v) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: profileOpen ? 'var(--surface2)' : 'transparent',
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initial}
            </div>
            <ChevronDown size={11} className="hidden md:block" color="var(--text3)" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {profileOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
              width: 220, background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{profile.name ?? profile.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{profile.email}</div>
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(79,127,255,0.1)', fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'capitalize' }}>
                  {profile.role.replace('_', ' ')}
                </div>
              </div>
              {[
                { href: '/settings', label: 'Settings', icon: Settings },
                { href: '/settings/email-accounts', label: 'Email Signature', icon: UserCheck },
                ...(isAdminRole(profile.role) ? [{ href: '/enterprise', label: 'Enterprise Hub', icon: Palette }] : []),
                ...(!isInstalled && installPrompt ? [{ id: 'install', label: 'Install App', icon: Download }] : []),
              ].map((item: any) => {
                const Icon = item.icon
                return (
                  <button key={item.href || item.id} onClick={() => {
                    setProfileOpen(false)
                    if (item.id === 'install' && installPrompt) installPrompt.prompt()
                    else router.push(item.href)
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
                    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text2)',
                    fontSize: 13, fontWeight: 500, textAlign: 'left',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Icon size={14} style={{ flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
              <button onClick={handleSignOut} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
                border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red)',
                fontSize: 13, fontWeight: 500, textAlign: 'left',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,90,90,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={14} style={{ flexShrink: 0 }} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {showDesignIntakeModal && <DesignIntakeLinkModal profile={profile} onClose={() => setShowDesignIntakeModal(false)} />}
      {tourOpen && <ProductTour userName={profile.name ?? ''} open={tourOpen} onClose={closeTour} />}
      {whatsNewOpen && <WhatsNewModal commits={newCommits} onClose={closeWhatsNew} />}
      <QuickPermissionsWidget profile={profile} />
    </>
  )
}
