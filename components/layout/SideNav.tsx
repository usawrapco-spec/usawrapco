'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile, UserRole } from '@/types'
import { isAdminRole } from '@/types'
import {
  ChevronDown, ChevronRight, ChevronLeft, X,
  FileText, ShoppingCart, Receipt, CreditCard, Briefcase,
  LayoutDashboard, ClipboardList, CalendarDays, Palette,
  Users, MessageSquare, Clock, Package, Layers, ShoppingBag,
  BarChart3, TrendingUp, DollarSign, Settings, Globe,
  Truck, Car, LayoutGrid, FileInput, Box, Image as ImageIcon,
  CheckSquare, Bot, Wrench, Navigation, Waves, Glasses,
  Trophy, Filter, Store, Kanban, Hammer, UserPlus,
  Printer, Map, Factory, BookOpen, MessageCircle, Phone,
  Zap, Activity, Target, Gauge, Workflow, Sparkles,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: UserRole[]
}

interface NavSection {
  id: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  items: NavItem[]
}

// ── Section definitions ────────────────────────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'core',
    label: 'CORE',
    icon: LayoutDashboard,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/pipeline',   label: 'Pipeline',     icon: Kanban },
      { href: '/inbox',      label: 'Inbox',        icon: MessageCircle },
      { href: '/tasks',      label: 'Tasks',        icon: CheckSquare },
    ],
  },
  {
    id: 'sales',
    label: 'SALES',
    icon: DollarSign,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/estimates',    label: 'Estimates',    icon: FileText },
      { href: '/sales-orders', label: 'Sales Orders', icon: ShoppingCart },
      { href: '/invoices',     label: 'Invoices',     icon: Receipt },
      { href: '/deposit',      label: 'Payments',     icon: CreditCard,  roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/prospects',    label: 'Prospects',    icon: UserPlus },
      { href: '/campaigns',    label: 'Campaigns',    icon: Globe,       roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/outreach',     label: 'Outreach',     icon: Zap,         roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/roi',          label: 'ROI Engine',   icon: Target,      roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/funnel',       label: 'Lead Funnel',  icon: Filter,      roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/network',      label: 'Network Map',  icon: Map },
      { href: '/bids',         label: 'Bids',         icon: Hammer,      roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/shop',         label: 'Shop',         icon: Store },
    ],
  },
  {
    id: 'jobs',
    label: 'JOBS',
    icon: Briefcase,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/jobs',         label: 'All Jobs',       icon: ClipboardList },
      { href: '/timeline',     label: 'Timeline',       icon: Clock },
      { href: '/engine',       label: 'Revenue Engine', icon: TrendingUp },
      { href: '/decking',      label: 'Decking',        icon: Waves },
      { href: '/tinting',      label: 'Tinting',        icon: Glasses },
    ],
  },
  {
    id: 'customers',
    label: 'CUSTOMERS',
    icon: Users,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/customers',    label: 'All Customers', icon: Users },
      { href: '/contacts',     label: 'Contacts',      icon: Users },
      { href: '/comms',        label: 'Comms Hub',     icon: MessageSquare },
      { href: '/ai-comms',     label: 'AI Comms',      icon: Bot,    roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/phone',        label: 'Phone',         icon: Phone,  roles: ['owner', 'admin', 'sales_agent'] },
    ],
  },
  {
    id: 'design',
    label: 'DESIGN',
    icon: Palette,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/design',           label: 'Design Studio',   icon: LayoutGrid },
      { href: '/design/manage',    label: 'Design Manager',  icon: Kanban,      roles: ['owner', 'admin', 'designer'] },
      { href: '/design/briefs',    label: 'Briefs',          icon: FileInput },
      { href: '/design/materials', label: 'Materials',        icon: Layers },
      { href: '/design/proofs',    label: 'Proofs',          icon: CheckSquare },
      { href: '/mockup',           label: 'Mockup Tool',     icon: ImageIcon },
      { href: '/configurator',     label: '3D Configurator', icon: Box },
      { href: '/media',            label: 'Media Library',   icon: ImageIcon },
    ],
  },
  {
    id: 'production',
    label: 'PRODUCTION',
    icon: Factory,
    roles: ['owner', 'admin', 'designer', 'production', 'installer'],
    items: [
      { href: '/production',               label: 'Production Hub',   icon: Factory },
      { href: '/production/print-schedule', label: 'Print Schedule',   icon: Printer },
      { href: '/production/printers',       label: 'Printers',         icon: Printer },
      { href: '/catalog',                   label: 'Material Catalog', icon: BookOpen },
    ],
  },
  {
    id: 'install',
    label: 'INSTALL',
    icon: Hammer,
    roles: ['owner', 'admin', 'production', 'installer'],
    items: [
      { href: '/install',            label: 'Install Board',    icon: Hammer },
      { href: '/install/bids',       label: 'Installer Bids',   icon: ClipboardList },
      { href: '/install/schedule',   label: 'Install Schedule', icon: CalendarDays },
      { href: '/install/supplies',   label: 'Supply Requests',  icon: ShoppingBag },
      { href: '/install/earnings',   label: 'Earnings',         icon: DollarSign },
      { href: '/install/reports',    label: 'Shop Reports',     icon: BarChart3 },
      { href: '/install/chat',       label: 'Installer Chat',   icon: MessageSquare },
      { href: '/installer-portal',   label: 'Installer Portal', icon: Hammer },
    ],
  },
  {
    id: 'inventory',
    label: 'INVENTORY',
    icon: Package,
    roles: ['owner', 'admin', 'production', 'installer'],
    items: [
      { href: '/inventory',          label: 'Vinyl Inventory', icon: Layers },
      { href: '/inventory/remnants', label: 'Remnants',        icon: Package },
    ],
  },
  {
    id: 'team',
    label: 'TEAM',
    icon: Users,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/employees',    label: 'Staff',           icon: Users,       roles: ['owner', 'admin'] },
      { href: '/calendar',     label: 'Calendar',        icon: CalendarDays },
      { href: '/schedule',     label: 'Schedule',        icon: CalendarDays },
      { href: '/timeclock',    label: 'Time Clock',      icon: Clock },
      { href: '/leaderboard',  label: 'Leaderboard',     icon: Trophy },
      { href: '/mileage',      label: 'Mileage',         icon: Car },
      { href: '/expenses',     label: 'Expenses',        icon: Receipt },
      { href: '/vehicles',     label: 'Fleet Vehicles',  icon: Truck,       roles: ['owner', 'admin'] },
      { href: '/fleet',        label: 'Fleet Hub',       icon: Truck,       roles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'analytics',
    label: 'ANALYTICS',
    icon: BarChart3,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/analytics',        label: 'Analytics',    icon: TrendingUp },
      { href: '/reports',           label: 'Reports',      icon: BarChart3 },
      { href: '/reports/revenue',   label: 'Revenue',      icon: DollarSign, roles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'admin',
    label: 'ADMIN',
    icon: Settings,
    roles: ['owner', 'admin'],
    items: [
      { href: '/settings',      label: 'Settings',      icon: Settings },
      { href: '/integrations',  label: 'Integrations',  icon: Globe },
      { href: '/automations',   label: 'Automations',   icon: Workflow },
      { href: '/workflow',       label: 'Workflows',     icon: Activity },
      { href: '/payroll',       label: 'Payroll',       icon: DollarSign },
      { href: '/overhead',      label: 'Overhead',      icon: Gauge },
      { href: '/sourcing',      label: 'Sourcing',      icon: ShoppingBag },
      { href: '/maintenance',   label: 'Maintenance',   icon: Wrench },
      { href: '/agents',        label: 'AI Agents',     icon: Sparkles },
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function canSeeSection(section: NavSection, role: string): boolean {
  if (isAdminRole(role)) return true
  return section.roles.includes(role as UserRole)
}

function canSeeItem(item: NavItem, role: string): boolean {
  if (!item.roles) return true
  if (isAdminRole(role)) return true
  return item.roles.includes(role as UserRole)
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
  if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/')
  return pathname === href || pathname.startsWith(href + '/')
}

const defaultOpen = Object.fromEntries(NAV_SECTIONS.map(s => [s.id, true]))

// ── Props ─────────────────────────────────────────────────────────────────────
interface SideNavProps {
  profile: Profile
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SideNav({
  profile,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SideNavProps) {
  const pathname = usePathname()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultOpen)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidenav-sections')
      if (stored) setOpenSections(JSON.parse(stored))
    } catch {}
  }, [])

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem('sidenav-sections', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const W = collapsed ? 64 : 240
  const ACC = '#4f7fff'

  const visibleSections = NAV_SECTIONS.filter(s => canSeeSection(s, profile.role))

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 39,
          }}
          className="md:hidden"
        />
      )}

      <nav
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: W,
          background: 'var(--surface)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          transition: 'width 0.2s ease, transform 0.25s ease',
          overflowX: 'hidden',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
        className={mobileOpen ? 'translate-x-0' : 'max-md:-translate-x-full'}
      >
        {/* ── Brand / Logo ────────────────────────────────────────────────── */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 0 0 20px' : '0 10px 0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <Truck size={20} color={ACC} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <Link
              href="/dashboard"
              style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
            >
              <div
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--text1)',
                  letterSpacing: '0.03em',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                USA WRAP CO
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                v6.2
              </div>
            </Link>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text3)',
              flexShrink: 0,
            }}
            className="hidden md:flex"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>

          {/* Close — mobile only */}
          <button
            onClick={onMobileClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text3)',
              flexShrink: 0,
            }}
            className="md:hidden"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            padding: '6px 0',
            overflowY: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {visibleSections.map(section => {
            const SIcon = section.icon
            const isOpen = openSections[section.id] !== false
            const sectionItems = section.items.filter(item =>
              canSeeItem(item, profile.role)
            )
            const anyActive = sectionItems.some(item =>
              isActiveRoute(pathname, item.href)
            )

            return (
              <div key={section.id} style={{ marginBottom: 2 }}>
                {/* Section header */}
                <button
                  onClick={() => !collapsed && toggleSection(section.id)}
                  title={collapsed ? section.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    height: 30,
                    padding: collapsed ? '0 0 0 22px' : '0 10px 0 14px',
                    border: 'none',
                    background: 'transparent',
                    cursor: collapsed ? 'default' : 'pointer',
                    gap: 8,
                  }}
                >
                  <SIcon
                    size={13}
                    color={anyActive ? ACC : 'var(--text3)'}
                    style={{ flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <>
                      <span
                        style={{
                          flex: 1,
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: anyActive ? ACC : 'var(--text3)',
                        }}
                      >
                        {section.label}
                      </span>
                      {isOpen ? (
                        <ChevronDown size={11} color="var(--text3)" />
                      ) : (
                        <ChevronRight size={11} color="var(--text3)" />
                      )}
                    </>
                  )}
                </button>

                {/* Section items */}
                {(isOpen || collapsed) &&
                  sectionItems.map(item => {
                    const IIcon = item.icon
                    const active = isActiveRoute(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 34,
                          padding: collapsed
                            ? '0 0 0 20px'
                            : '0 10px 0 26px',
                          gap: 10,
                          textDecoration: 'none',
                          borderRadius: collapsed ? 0 : '0 6px 6px 0',
                          marginRight: collapsed ? 0 : 8,
                          background: active ? `${ACC}18` : 'transparent',
                          borderLeft: active
                            ? `2px solid ${ACC}`
                            : '2px solid transparent',
                          transition: 'background 0.12s',
                        }}
                      >
                        <IIcon
                          size={15}
                          color={active ? ACC : 'var(--text2)'}
                          style={{ flexShrink: 0 }}
                        />
                        {!collapsed && (
                          <span
                            style={{
                              fontSize: 13,
                              color: active ? 'var(--text1)' : 'var(--text2)',
                              fontWeight: active ? 600 : 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    )
                  })}
              </div>
            )
          })}
        </div>

        {/* ── User footer ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: collapsed ? '12px 0 12px 16px' : '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: ACC,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text1)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile.name ?? profile.email}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text3)',
                  textTransform: 'capitalize',
                }}
              >
                {profile.role.replace('_', ' ')}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
