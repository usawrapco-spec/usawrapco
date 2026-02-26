'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  CheckSquare,
  Calendar,
  X,
  Briefcase,
  Palette,
  Factory,
  Package,
  Users,
  Trophy,
  Settings,
  BarChart3,
  Hammer,
  Image as ImageIcon,
  Wand2,
  BookOpen,
  FileText,
  MessageCircle,
  DollarSign,
  UserPlus,
  Plus,
  Printer,
  Clock,
  Globe,
  Map,
  MessageSquare,
  Receipt,
  ShoppingCart,
  PlusCircle,
  MoreHorizontal,
  Kanban,
  Waves,
  Glasses,
  Target,
  Zap,
  Phone,
  Bot,
  Car,
  Truck,
  Workflow,
  Activity,
  ShoppingBag,
  Gauge,
  Wrench,
  ClipboardList,
  CalendarDays,
  Filter,
  Store,
  Box,
  FileInput,
  Layers,
  CreditCard,
} from 'lucide-react'

/* ─── Quick create items for the bottom sheet ─────────────────────── */
const CREATE_ITEMS = [
  { href: '/estimates?new=true', label: 'New Estimate',  icon: FileText },
  { href: '/pipeline?new=true',  label: 'New Job',       icon: Briefcase },
  { href: '/customers?new=true', label: 'New Customer',  icon: Users },
  { href: '/tasks?new=true',     label: 'New Task',      icon: CheckSquare },
  { href: '/prospects?new=true', label: 'New Prospect',  icon: UserPlus },
]

/* ─── More panel — organized by section ───────────────────────────── */
interface MoreSection {
  label: string
  items: { href: string; label: string; icon: React.ElementType }[]
}

const MORE_SECTIONS: MoreSection[] = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
      { href: '/pipeline',   label: 'Pipeline',    icon: Kanban },
      { href: '/inbox',      label: 'Inbox',       icon: MessageCircle },
      { href: '/tasks',      label: 'Tasks',       icon: CheckSquare },
      { href: '/calendar',   label: 'Calendar',    icon: Calendar },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/estimates',    label: 'Estimates',    icon: FileText },
      { href: '/sales-orders', label: 'Sales Orders', icon: ShoppingCart },
      { href: '/invoices',     label: 'Invoices',     icon: Receipt },
      { href: '/deposit',      label: 'Payments',     icon: CreditCard },
      { href: '/prospects',    label: 'Prospects',    icon: UserPlus },
      { href: '/campaigns',    label: 'Campaigns',    icon: Globe },
      { href: '/outreach',     label: 'Outreach',     icon: Zap },
      { href: '/roi',          label: 'ROI Engine',   icon: Target },
      { href: '/funnel',       label: 'Lead Funnel',  icon: Filter },
      { href: '/network',      label: 'Network',      icon: Map },
      { href: '/bids',         label: 'Bids',         icon: Hammer },
      { href: '/shop',         label: 'Shop',         icon: Store },
    ],
  },
  {
    label: 'Jobs',
    items: [
      { href: '/jobs',      label: 'All Jobs',       icon: ClipboardList },
      { href: '/timeline',  label: 'Timeline',       icon: Clock },
      { href: '/engine',    label: 'Revenue Engine', icon: TrendingUp },
      { href: '/decking',   label: 'Decking',        icon: Waves },
      { href: '/tinting',   label: 'Tinting',        icon: Glasses },
    ],
  },
  {
    label: 'Customers',
    items: [
      { href: '/customers', label: 'Customers',  icon: Users },
      { href: '/contacts',  label: 'Contacts',   icon: Users },
      { href: '/comms',     label: 'Comms Hub',   icon: MessageSquare },
      { href: '/ai-comms',  label: 'AI Comms',    icon: Bot },
      { href: '/phone',     label: 'Phone',       icon: Phone },
    ],
  },
  {
    label: 'Design',
    items: [
      { href: '/design',        label: 'Design Studio',   icon: Palette },
      { href: '/mockup',        label: 'Mockup Tool',     icon: Wand2 },
      { href: '/configurator',  label: '3D Configurator', icon: Box },
      { href: '/media',         label: 'Media Library',   icon: ImageIcon },
      { href: '/design/proofs', label: 'Proofs',          icon: CheckSquare },
      { href: '/design/briefs', label: 'Briefs',          icon: FileInput },
    ],
  },
  {
    label: 'Production',
    items: [
      { href: '/production',               label: 'Production Hub', icon: Factory },
      { href: '/production/print-schedule', label: 'Print Schedule', icon: Printer },
      { href: '/production/printers',       label: 'Printers',      icon: Printer },
      { href: '/catalog',                   label: 'Catalog',       icon: BookOpen },
    ],
  },
  {
    label: 'Install',
    items: [
      { href: '/install',          label: 'Install Board',    icon: Hammer },
      { href: '/install/schedule', label: 'Install Schedule', icon: CalendarDays },
      { href: '/install/bids',     label: 'Installer Bids',   icon: ClipboardList },
      { href: '/installer-portal', label: 'Installer Portal', icon: Hammer },
      { href: '/inventory',        label: 'Inventory',        icon: Package },
    ],
  },
  {
    label: 'Team',
    items: [
      { href: '/employees',   label: 'Staff',          icon: Users },
      { href: '/schedule',    label: 'Schedule',       icon: CalendarDays },
      { href: '/timeclock',   label: 'Time Clock',     icon: Clock },
      { href: '/leaderboard', label: 'Leaderboard',    icon: Trophy },
      { href: '/mileage',     label: 'Mileage',        icon: Car },
      { href: '/expenses',    label: 'Expenses',       icon: Receipt },
      { href: '/vehicles',    label: 'Fleet',          icon: Truck },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', label: 'Analytics',  icon: BarChart3 },
      { href: '/reports',   label: 'Reports',    icon: BarChart3 },
      { href: '/payroll',   label: 'Payroll',    icon: DollarSign },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/settings',     label: 'Settings',     icon: Settings },
      { href: '/integrations', label: 'Integrations', icon: Globe },
      { href: '/automations',  label: 'Automations',  icon: Workflow },
      { href: '/sourcing',     label: 'Sourcing',     icon: ShoppingBag },
    ],
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // Close sheets on route change
  useEffect(() => {
    setMoreOpen(false)
    setCreateOpen(false)
  }, [pathname])

  const closeAll = useCallback(() => {
    setMoreOpen(false)
    setCreateOpen(false)
  }, [])

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <>
      {/* ── Overlay for More or Create sheets ─────────────────── */}
      {(moreOpen || createOpen) && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={closeAll}
        />
      )}

      {/* ── Create bottom sheet ───────────────────────────────── */}
      {createOpen && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Handle bar */}
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '10px 0 4px',
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--border)',
            }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 16px 12px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              Quick Create
            </span>
            <button
              onClick={() => setCreateOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 8,
                minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Create items */}
          <div style={{ padding: '8px 12px' }}>
            {CREATE_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => { setCreateOpen(false); router.push(item.href) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', padding: '14px 12px', borderRadius: 10,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text1)', fontSize: 15, fontWeight: 500,
                    textAlign: 'left', transition: 'background 0.12s',
                    minHeight: 48,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(79,127,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── More menu panel ───────────────────────────────────── */}
      {moreOpen && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '75vh',
          overflowY: 'auto',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Handle bar */}
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '10px 0 4px',
            position: 'sticky', top: 0, background: 'var(--surface)',
            borderRadius: '16px 16px 0 0',
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--border)',
            }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 16px 12px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4,
            position: 'sticky', top: 18, background: 'var(--surface)',
            zIndex: 1,
          }}>
            <span style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              All Features
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 8,
                minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sections */}
          {MORE_SECTIONS.map(section => (
            <div key={section.label}>
              {/* Section label */}
              <div style={{
                padding: '10px 16px 4px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text3)',
              }}>
                {section.label}
              </div>

              {/* Section grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 2, padding: '0 8px 4px',
              }}>
                {section.items.map(item => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 3, padding: '10px 4px', borderRadius: 10,
                        background: active ? 'rgba(79,127,255,0.1)' : 'transparent',
                        textDecoration: 'none',
                        minHeight: 44,
                      }}
                    >
                      <Icon size={18} style={{ color: active ? 'var(--accent)' : 'var(--text3)' }} />
                      <span style={{
                        fontSize: 9, fontWeight: active ? 700 : 500,
                        color: active ? 'var(--accent)' : 'var(--text2)',
                        textAlign: 'center', lineHeight: 1.2,
                      }}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Bottom spacer */}
          <div style={{ height: 8 }} />
        </div>
      )}

      {/* ── Bottom tab bar (mobile only) ───────────────────────── */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'stretch',
          height: 56,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Home */}
        <Link
          href="/dashboard"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', minHeight: 44,
          }}
        >
          <LayoutDashboard size={22} style={{ color: isActive('/dashboard') ? 'var(--accent)' : 'var(--text3)' }} />
        </Link>

        {/* Pipeline */}
        <Link
          href="/pipeline"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', minHeight: 44,
          }}
        >
          <Briefcase size={22} style={{ color: isActive('/pipeline') ? 'var(--accent)' : 'var(--text3)' }} />
        </Link>

        {/* +New — opens create sheet */}
        <button
          onClick={() => { setCreateOpen(v => !v); setMoreOpen(false) }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', minHeight: 44,
          }}
        >
          <PlusCircle size={28} style={{ color: 'var(--accent)' }} />
        </button>

        {/* Inbox */}
        <Link
          href="/inbox"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', minHeight: 44,
          }}
        >
          <MessageCircle size={22} style={{ color: isActive('/inbox') ? 'var(--accent)' : 'var(--text3)' }} />
        </Link>

        {/* More — opens bottom sheet */}
        <button
          onClick={() => { setMoreOpen(v => !v); setCreateOpen(false) }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', minHeight: 44,
          }}
        >
          <MoreHorizontal size={22} style={{ color: moreOpen ? 'var(--accent)' : 'var(--text3)' }} />
        </button>
      </nav>
    </>
  )
}
