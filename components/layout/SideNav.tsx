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
  Zap, Activity, Target, Gauge, Workflow, Sparkles, Brain, Anchor, Send,
  Shield, Compass, Rocket, Star, Fish, MapPin, Radio,
  UserCheck, Inbox, Tag, Banknote, GitBranch, Search,
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

// ── Section definitions ───────────────────────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'sales',
    label: 'SALES',
    icon: DollarSign,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/sales',         label: 'Sales Hub',    icon: DollarSign },
      { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/pipeline',      label: 'Pipeline',     icon: Kanban },
      { href: '/estimates',     label: 'Estimates',    icon: FileText },
      { href: '/sales-orders',  label: 'Sales Orders', icon: ShoppingCart,  roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/proposals',     label: 'Proposals',    icon: Send,          roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/bids',          label: 'Bids',         icon: ShoppingBag,   roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/customers',     label: 'Customers',    icon: Users },
      { href: '/contacts',      label: 'Contacts',     icon: UserCheck,     roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/inbox',         label: 'Inbox',        icon: Inbox },
      { href: '/calendar',      label: 'Calendar',     icon: CalendarDays },
    ],
  },
  {
    id: 'production',
    label: 'PRODUCTION',
    icon: Factory,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer'],
    items: [
      { href: '/jobs',                       label: 'Jobs',              icon: ClipboardList },
      { href: '/production',                 label: 'Production Queue',  icon: Factory },
      { href: '/timeline',                   label: 'Timeline',          icon: Activity },
      { href: '/install/schedule',           label: 'Install Schedule',  icon: CalendarDays },
      { href: '/production/print-schedule',  label: 'QC',                icon: CheckSquare },
      { href: '/production/printers',        label: 'Printers',          icon: Printer,       roles: ['owner', 'admin', 'production'] },
      { href: '/installer-portal',           label: 'Installer Portal',  icon: Hammer,        roles: ['owner', 'admin', 'installer'] },
    ],
  },
  {
    id: 'design',
    label: 'DESIGN',
    icon: Palette,
    roles: ['owner', 'admin', 'designer', 'production'],
    items: [
      { href: '/design',   label: 'Design Studio', icon: LayoutGrid },
      { href: '/media',    label: 'Media Library',  icon: ImageIcon },
      { href: '/mockup',   label: 'Mockups',        icon: Palette },
    ],
  },
  {
    id: 'inventory',
    label: 'INVENTORY',
    icon: Package,
    roles: ['owner', 'admin', 'production', 'installer'],
    items: [
      { href: '/inventory',           label: 'Vinyl Inventory',  icon: Package },
      { href: '/inventory/remnants',  label: 'Remnants',         icon: Layers },
      { href: '/catalog',             label: 'Catalog',          icon: Tag },
    ],
  },
  {
    id: 'finance',
    label: 'FINANCE',
    icon: Receipt,
    roles: ['owner', 'admin'],
    items: [
      { href: '/invoices',             label: 'Invoices',        icon: Receipt,    roles: ['owner', 'admin'] },
      { href: '/payments',             label: 'Payments',        icon: CreditCard, roles: ['owner', 'admin'] },
      { href: '/deposit',              label: 'Deposits',        icon: Banknote,   roles: ['owner', 'admin'] },
      { href: '/transactions',         label: 'Transactions',    icon: Activity,   roles: ['owner', 'admin'] },
      { href: '/expenses',             label: 'Expenses',        icon: FileText,   roles: ['owner', 'admin'] },
      { href: '/payroll',              label: 'Payroll',         icon: DollarSign, roles: ['owner', 'admin'] },
      { href: '/payroll/employees',    label: 'Pay Settings',    icon: Users,      roles: ['owner', 'admin'] },
      { href: '/payroll/history',      label: 'Payroll History', icon: Clock,      roles: ['owner', 'admin'] },
      { href: '/payroll/gusto',        label: 'Gusto Export',    icon: FileInput,  roles: ['owner', 'admin'] },
      { href: '/1099',                 label: '1099',            icon: FileText,   roles: ['owner', 'admin'] },
      { href: '/settings/commissions', label: 'Commission',      icon: TrendingUp, roles: ['owner', 'admin'] },
      { href: '/analytics',            label: 'Analytics',       icon: BarChart3,  roles: ['owner', 'admin'] },
      { href: '/reports',              label: 'Reports',         icon: BarChart3,  roles: ['owner', 'admin'] },
      { href: '/overhead',             label: 'Overhead',        icon: Briefcase,  roles: ['owner', 'admin'] },
      { href: '/ventures',             label: 'Ventures',        icon: Rocket,     roles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'team',
    label: 'TEAM',
    icon: Users,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer'],
    items: [
      { href: '/employees',   label: 'Staff',         icon: Users,  roles: ['owner', 'admin'] },
      { href: '/tasks',       label: 'Tasks',         icon: CheckSquare },
      { href: '/leaderboard', label: 'Leaderboard',   icon: Trophy },
      { href: '/timeclock',   label: 'Time Tracking', icon: Clock },
    ],
  },
  {
    id: 'marketing',
    label: 'MARKETING',
    icon: Globe,
    roles: ['owner', 'admin', 'sales_agent'],
    items: [
      { href: '/network',    label: 'Affiliates',   icon: Map },
      { href: '/prospects',  label: 'Outbound CRM', icon: UserPlus },
      { href: '/campaigns',  label: 'Campaigns',    icon: Globe },
    ],
  },
  {
    id: 'fleet',
    label: 'FLEET',
    icon: Map,
    roles: ['owner', 'admin', 'sales_agent'],
    items: [
      { href: '/fleet-map', label: 'Fleet Live Map', icon: Map, roles: ['owner', 'admin', 'sales_agent'] },
    ],
  },
  {
    id: 'sourcing',
    label: 'SOURCING',
    icon: Search,
    roles: ['owner', 'admin'],
    items: [
      { href: '/sourcing',           label: 'Sourcing',   icon: Search },
      { href: '/sourcing/monitor',   label: 'Monitor',    icon: Gauge },
      { href: '/sourcing/suppliers', label: 'Suppliers',  icon: Store },
      { href: '/sourcing/orders',    label: 'Orders',     icon: ShoppingCart },
    ],
  },
  {
    id: 'marine',
    label: 'MARINE / FISHING',
    icon: Anchor,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/fishing',             label: 'Dashboard',     icon: Anchor },
      { href: '/fishing/catch-log',   label: 'Catch Log',     icon: Fish },
      { href: '/fishing/spots',       label: 'Fishing Spots', icon: MapPin },
      { href: '/fishing/reports',     label: 'Reports',       icon: FileText },
      { href: '/fishing/regulations', label: 'Regulations',   icon: BookOpen },
      { href: '/fishing/tides',       label: 'Tides',         icon: Waves },
      { href: '/fishing/marinas',     label: 'Marinas',       icon: Navigation },
      { href: '/fishing/boating',     label: 'Boating Zones', icon: Compass },
      { href: '/fishing/vhf',         label: 'VHF Channels',  icon: Radio },
    ],
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    icon: Settings,
    roles: ['owner', 'admin'],
    items: [
      { href: '/settings',             label: 'General',          icon: Settings },
      { href: '/settings/defaults',    label: 'Defaults',         icon: Wrench },
      { href: '/settings/playbook',    label: 'Playbook',         icon: BookOpen },
      { href: '/settings/vehicles',    label: 'Vehicles',         icon: Car },
      { href: '/settings/reviews',     label: 'Review Requests',  icon: Star },
      { href: '/workflow',             label: 'Workflow',         icon: Workflow },
      { href: '/engine',              label: 'AI Engine',        icon: Brain },
      { href: '/process',             label: 'Process Guide',    icon: BookOpen },
      { href: '/integrations',        label: 'Integrations',     icon: Globe },
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

function isActiveRoute(pathname: string | null, href: string): boolean {
  if (!pathname) return false
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
  const [hoverExpanded, setHoverExpanded] = useState(false)

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

  // Visual width: collapsed=48, expanded=240, hover-expanded=240
  const isExpanded = !collapsed || hoverExpanded || mobileOpen
  const W = isExpanded ? 240 : 48
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
        onMouseEnter={() => { if (collapsed && !mobileOpen) setHoverExpanded(true) }}
        onMouseLeave={() => setHoverExpanded(false)}
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
            padding: isExpanded ? '0 10px 0 12px' : '0 0 0 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <Truck size={20} color={ACC} style={{ flexShrink: 0 }} />
          {isExpanded && (
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
                  onClick={() => isExpanded && toggleSection(section.id)}
                  title={!isExpanded ? section.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    height: 30,
                    padding: isExpanded ? '0 10px 0 14px' : '0 0 0 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: isExpanded ? 'pointer' : 'default',
                    gap: 8,
                  }}
                >
                  <SIcon
                    size={13}
                    color={anyActive ? ACC : 'var(--text3)'}
                    style={{ flexShrink: 0 }}
                  />
                  {isExpanded && (
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
                {(isOpen || !isExpanded) &&
                  sectionItems.map(item => {
                    const IIcon = item.icon
                    const active = isActiveRoute(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        title={!isExpanded ? item.label : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 34,
                          padding: isExpanded
                            ? '0 10px 0 26px'
                            : '0 0 0 16px',
                          gap: 10,
                          textDecoration: 'none',
                          borderRadius: isExpanded ? '0 6px 6px 0' : 0,
                          marginRight: isExpanded ? 8 : 0,
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
                        {isExpanded && (
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
            padding: isExpanded ? '12px 16px' : '12px 0 12px 10px',
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
          {isExpanded && (
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
