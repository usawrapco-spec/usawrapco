"""
Script to atomically update SideNav.tsx and types/index.ts
then immediately run git add + commit.
"""
import os, subprocess, sys

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SIDENAV = """\
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile, UserRole } from '@/types'
import { isAdminRole } from '@/types'
import {
  ChevronDown, ChevronRight, ChevronLeft, X,
  FileText, Receipt,
  LayoutDashboard, ClipboardList, CalendarDays, Palette,
  Users, Inbox, Clock, Factory, FileInput,
  BarChart3, TrendingUp, DollarSign, Settings,
  Map, Kanban, Brain,
  Trophy, UserPlus,
  Printer, Truck,
  Shield, Rocket, UserCheck,
  Globe, LayoutGrid,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: UserRole[]
  badge?: string
}

interface NavSection {
  id: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    label: 'MAIN',
    icon: LayoutDashboard,
    roles: ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'],
    items: [
      { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/jobs',       label: 'Jobs',        icon: ClipboardList },
      { href: '/pipeline',   label: 'Pipeline',    icon: Kanban,   roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/estimates',  label: 'Estimates',   icon: FileText, roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/customers',  label: 'Customers',   icon: Users,    roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/invoices',   label: 'Invoices',    icon: Receipt,  roles: ['owner', 'admin', 'sales_agent'] },
    ],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    icon: CalendarDays,
    roles: ['owner', 'admin', 'sales_agent', 'production', 'installer'],
    items: [
      { href: '/calendar',    label: 'Calendar',          icon: CalendarDays, roles: ['owner', 'admin', 'sales_agent'] },
      { href: '/schedule',    label: 'Schedule',          icon: Clock,        roles: ['owner', 'admin', 'production', 'installer'] },
      { href: '/production',  label: 'Production Queue',  icon: Factory,      roles: ['owner', 'admin', 'production'] },
      { href: '/employees',   label: 'Team',              icon: Users,        roles: ['owner', 'admin'] },
      { href: '/payroll',     label: 'Payroll',           icon: DollarSign,   roles: ['owner', 'admin', 'installer'] },
    ],
  },
  {
    id: 'sales',
    label: 'SALES',
    icon: TrendingUp,
    roles: ['owner', 'admin', 'sales_agent'],
    items: [
      { href: '/prospects',  label: 'Leads',        icon: UserPlus },
      { href: '/inbox',      label: 'Inbox',        icon: Inbox },
      { href: '/campaigns',  label: 'Outbound CRM', icon: Globe },
    ],
  },
  {
    id: 'design',
    label: 'DESIGN',
    icon: Palette,
    roles: ['owner', 'admin', 'designer', 'sales_agent'],
    items: [
      { href: '/design',          label: 'Design Studio', icon: LayoutGrid, roles: ['owner', 'admin', 'designer'] },
      { href: '/design/intakes',  label: 'Design Intake', icon: FileInput,  badge: 'intakes' },
    ],
  },
  {
    id: 'admin_controls',
    label: 'ADMIN CONTROLS',
    icon: Shield,
    roles: ['owner', 'admin'],
    items: [
      { href: '/admin/access',   label: 'Access Manager',    icon: UserCheck },
      { href: '/admin/portals',  label: 'Employee Portals',  icon: Printer },
      { href: '/settings',       label: 'System Settings',   icon: Settings },
    ],
  },
  {
    id: 'advanced',
    label: 'ADVANCED',
    icon: Rocket,
    roles: ['owner', 'admin'],
    items: [
      { href: '/analytics',   label: 'Analytics',   icon: BarChart3 },
      { href: '/fleet-map',   label: 'Fleet',        icon: Map },
      { href: '/leaderboard', label: 'Leaderboard',  icon: Trophy },
      { href: '/engine',      label: 'V.I.N.Y.L.',   icon: Brain },
    ],
  },
]

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

let badgeCacheValue = 0
let badgeCacheTime = 0

async function fetchIntakeBadge(): Promise<number> {
  const now = Date.now()
  if (now - badgeCacheTime < 30000) return badgeCacheValue
  try {
    const res = await fetch('/api/design-intakes?status=new', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      badgeCacheValue = Array.isArray(data) ? data.length : 0
      badgeCacheTime = now
    }
  } catch { /* silent */ }
  return badgeCacheValue
}

interface SideNavProps {
  profile: Profile
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

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
  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchIntakeBadge().then(count => {
      if (count > 0) setBadges(b => ({ ...b, intakes: count }))
    })
  }, [])

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

  const isExpanded = !collapsed || hoverExpanded || mobileOpen
  const W = isExpanded ? 240 : 48
  const ACC = '#4f7fff'

  const visibleSections = NAV_SECTIONS.filter(s => canSeeSection(s, profile.role))

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 39 }}
          className="md:hidden"
        />
      )}

      <nav
        onMouseEnter={() => { if (collapsed && !mobileOpen) setHoverExpanded(true) }}
        onMouseLeave={() => setHoverExpanded(false)}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: W,
          background: 'var(--surface)', borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', zIndex: 40,
          transition: 'width 0.2s ease, transform 0.25s ease',
          overflowX: 'hidden', overflowY: 'auto', scrollbarWidth: 'none',
        }}
        className={mobileOpen ? 'translate-x-0' : 'max-md:-translate-x-full'}
      >
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: isExpanded ? '0 10px 0 12px' : '0 0 0 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, gap: 8,
        }}>
          <Truck size={20} color={ACC} style={{ flexShrink: 0 }} />
          {isExpanded && (
            <Link href="/dashboard" style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text1)', letterSpacing: '0.03em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                USA WRAP CO
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                v6.2
              </div>
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', flexShrink: 0 }}
            className="hidden md:flex"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
          <button
            onClick={onMobileClose}
            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', flexShrink: 0 }}
            className="md:hidden"
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {visibleSections.map(section => {
            const SIcon = section.icon
            const isOpen = openSections[section.id] !== false
            const sectionItems = section.items.filter(item => canSeeItem(item, profile.role))
            if (sectionItems.length === 0) return null
            const anyActive = sectionItems.some(item => isActiveRoute(pathname, item.href))

            return (
              <div key={section.id} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => isExpanded && toggleSection(section.id)}
                  title={!isExpanded ? section.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%', height: 30,
                    padding: isExpanded ? '0 10px 0 14px' : '0 0 0 16px',
                    border: 'none',
                    background: section.id === 'admin_controls' ? 'rgba(139,92,246,0.06)' : 'transparent',
                    cursor: isExpanded ? 'pointer' : 'default', gap: 8,
                  }}
                >
                  <SIcon
                    size={13}
                    color={anyActive ? ACC : section.id === 'admin_controls' ? '#8b5cf6' : 'var(--text3)'}
                    style={{ flexShrink: 0 }}
                  />
                  {isExpanded && (
                    <>
                      <span style={{
                        flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: anyActive ? ACC : section.id === 'admin_controls' ? '#8b5cf6' : 'var(--text3)',
                      }}>
                        {section.label}
                      </span>
                      {isOpen ? <ChevronDown size={11} color="var(--text3)" /> : <ChevronRight size={11} color="var(--text3)" />}
                    </>
                  )}
                </button>

                {(isOpen || !isExpanded) && sectionItems.map(item => {
                  const IIcon = item.icon
                  const active = isActiveRoute(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      title={!isExpanded ? item.label : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', height: 34,
                        padding: isExpanded ? '0 10px 0 26px' : '0 0 0 16px',
                        gap: 10, textDecoration: 'none',
                        borderRadius: isExpanded ? '0 6px 6px 0' : 0,
                        marginRight: isExpanded ? 8 : 0,
                        background: active ? (ACC + '18') : 'transparent',
                        borderLeft: active ? ('2px solid ' + ACC) : '2px solid transparent',
                        transition: 'background 0.12s',
                      }}
                    >
                      <IIcon size={15} color={active ? ACC : 'var(--text2)'} style={{ flexShrink: 0 }} />
                      {isExpanded && (
                        <>
                          <span style={{ fontSize: 13, color: active ? 'var(--text1)' : 'var(--text2)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', flex: 1 }}>
                            {item.label}
                          </span>
                          {item.badge && badges[item.badge] > 0 && (
                            <span style={{ background: '#f25a5a', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, lineHeight: '16px', flexShrink: 0 }}>
                              {badges[item.badge]}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{
          padding: isExpanded ? '12px 16px' : '12px 0 12px 10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()
            }
          </div>
          {isExpanded && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.name ?? profile.email}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' }}>
                {profile.role.replace('_', ' ')}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
"""

with open('components/layout/SideNav.tsx', 'w', encoding='utf-8') as f:
    f.write(SIDENAV)

print('SideNav written:', len(SIDENAV), 'bytes')

# Update types/index.ts
with open('types/index.ts', 'r', encoding='utf-8') as f:
    types_content = f.read()

if 'feature_permissions' not in types_content:
    types_content = types_content.replace(
        '  settings?: Record<string, any> | null\n  email_signature?: string | null\n  created_at: string\n  updated_at: string\n}',
        '  feature_permissions?: Record<string, boolean> | null\n  settings?: Record<string, any> | null\n  email_signature?: string | null\n  created_at: string\n  updated_at: string\n}'
    )
    with open('types/index.ts', 'w', encoding='utf-8') as f:
        f.write(types_content)
    print('types/index.ts updated')
else:
    print('types/index.ts already has feature_permissions')

# Verify
with open('components/layout/SideNav.tsx', 'r') as f:
    check = f.read()
print('Verify id main:', "'id: 'main'" in check)
print('Verify bytes:', len(check))
