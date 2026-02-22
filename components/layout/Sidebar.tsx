'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasPermission, type ModulePermission } from '@/lib/permissions'
import type { Profile } from '@/types'
import { useState } from 'react'
import NewProjectModal from '@/components/dashboard/NewProjectModal'
import GenieFAB from '@/components/genie/GenieFAB'
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Palette,
  Wand2,
  ImageIcon,
  Factory,
  Package,
  Hammer,
  Users,
  BarChart3,
  Trophy,
  Settings,
  LogOut,
  Plus,
  Truck,
  ChevronRight,
  CheckSquare,
  Calendar,
  Activity,
  Columns2,
  BookOpen,
  Network,
  FileText,
  MessageSquare,
  DollarSign,
  Inbox,
  UserPlus,
  Contact,
  Workflow,
  Globe,
  Mail,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'

// ── Nav types ────────────────────────────────────────────────
type NavChild = {
  href: string
  label: string
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  always?: boolean
  permission?: ModulePermission
  children?: NavChild[]
}

// ── Nav definition (spec Section 8) ─────────────────────────
const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    always: true,
  },
  {
    href: '/engine',
    label: 'Revenue Engine',
    icon: TrendingUp,
    always: true,
  },
  {
    href: '/workflow',
    label: 'Job Workflow',
    icon: Workflow,
    always: true,
  },
  {
    href: '/prospects',
    label: 'Prospects',
    icon: UserPlus,
    permission: 'sales.read',
  },
  {
    href: '/campaigns',
    label: 'Campaigns',
    icon: Mail,
    permission: 'sales.read',
  },
  {
    href: '/sourcing',
    label: 'Sourcing',
    icon: Globe,
    permission: 'sales.read',
    children: [
      { href: '/sourcing/monitor',    label: 'RFQ Monitor' },
      { href: '/sourcing/suppliers',  label: 'Suppliers' },
      { href: '/sourcing/orders',     label: 'Orders' },
    ],
  },
  {
    href: '/ventures',
    label: 'Ventures',
    icon: Lightbulb,
    permission: 'sales.read',
  },
  {
    href: '/inbox',
    label: 'Inbox',
    icon: Inbox,
    permission: 'sales.read',
  },
  {
    href: '/pipeline',
    label: 'Job Board',
    icon: Briefcase,
    permission: 'sales.read',
    children: [
      { href: '/pipeline',      label: 'Job Board' },
      { href: '/estimates',     label: 'Estimates' },
      { href: '/sales-orders',  label: 'Sales Orders' },
      { href: '/invoices',      label: 'Invoices' },
    ],
  },
  {
    href: '/jobs',
    label: 'Jobs',
    icon: Briefcase,
    permission: 'jobs.read',
  },
  {
    href: '/contacts',
    label: 'Contacts',
    icon: Contact,
    permission: 'sales.read',
  },
  {
    href: '/tasks',
    label: 'Task Queue',
    icon: CheckSquare,
    permission: 'jobs.read',
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: Calendar,
    permission: 'jobs.read',
  },
  {
    href: '/design',
    label: 'Design Studio',
    icon: Palette,
    permission: 'design.read',
  },
  {
    href: '/mockup',
    label: 'Mockup Tool',
    icon: Wand2,
    permission: 'design.read',
  },
  {
    href: '/media',
    label: 'Media Library',
    icon: ImageIcon,
    permission: 'design.read',
  },
  {
    href: '/timeline',
    label: 'Timeline',
    icon: Columns2,
    permission: 'production.read',
  },
  {
    href: '/production',
    label: 'Production',
    icon: Factory,
    permission: 'production.read',
    children: [
      { href: '/production/print-schedule', label: 'Print Schedule' },
      { href: '/production/printers',      label: 'Printer Maintenance' },
    ],
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: Package,
    permission: 'inventory.read',
    children: [
      { href: '/inventory/remnants',    label: 'Remnants' },
    ],
  },
  {
    href: '/catalog',
    label: 'Catalog',
    icon: BookOpen,
    permission: 'inventory.read',
  },
  {
    href: '/customers',
    label: 'Customers',
    icon: Users,
    permission: 'sales.read',
  },
  {
    href: '/network',
    label: 'Network Map',
    icon: Network,
    permission: 'sales.read',
  },
  {
    href: '/bids',
    label: 'Installer Bids',
    icon: Hammer,
    permission: 'bids.read',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: Activity,
    permission: 'finances.view',
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: FileText,
    permission: 'reports.view',
  },
  {
    href: '/payroll',
    label: 'Payroll',
    icon: DollarSign,
    permission: 'finances.view',
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
    always: true,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    permission: 'settings.locked',
    children: [
      { href: '/employees',  label: 'Team' },
      { href: '/settings',   label: 'Defaults' },
      { href: '/overhead',   label: 'Shop Expenses' },
      { href: '/1099',       label: 'Commissions' },
      { href: '/payroll',    label: 'Payroll' },
    ],
  },
]

// ── Role color map ───────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  owner:       '#f59e0b',
  admin:       '#8b5cf6',
  sales_agent: '#4f7fff',
  designer:    '#22d3ee',
  production:  '#22c07a',
  installer:   '#f59e0b',
  viewer:      '#5a6080',
}

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [showNewProject, setShowNewProject] = useState(false)

  // Sections that are expanded (by href key)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-open any section whose child is currently active
    const init: Record<string, boolean> = {}
    NAV.forEach(item => {
      if (item.children?.some(c => pathname?.startsWith(c.href))) {
        init[item.href] = true
      }
    })
    return init
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Permission gate — owner/admin bypass all checks
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  function canSee(item: NavItem): boolean {
    if (item.always) return true
    if (isAdmin) return true
    if (!item.permission) return true
    return hasPermission(profile.role, item.permission)
  }

  const roleColor = ROLE_COLORS[profile.role] ?? '#5a6080'
  const initial   = (profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()

  return (
    <>
      <GenieFAB
        userName={profile.name ?? profile.email ?? 'Team Member'}
        userRole={profile.role}
      />
      <aside style={{
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
      }}>

        {/* ── Logo ─────────────────────────────────────────── */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <Truck size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: 'var(--text1)',
              lineHeight: 1,
            }}>
              USA WRAP CO
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              Ops Platform
              <span style={{ marginLeft: 4, color: 'var(--accent)', opacity: 0.6, fontFamily: 'JetBrains Mono, monospace' }}>
                v6.1
              </span>
            </div>
          </div>
        </div>

        {/* ── New Estimate button ───────────────────────────── */}
        {(isAdmin || hasPermission(profile.role, 'jobs.write')) && (
          <div style={{ padding: '10px 12px', flexShrink: 0 }}>
            <button
              onClick={() => setShowNewProject(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              New Estimate
            </button>
          </div>
        )}

        {/* ── Nav ──────────────────────────────────────────── */}
        <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
          {NAV.map(item => {
            if (!canSee(item)) return null

            const isParentActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const hasChildren    = item.children && item.children.length > 0
            const isOpen         = expanded[item.href] ?? false
            const Icon           = item.icon

            // Parent row
            return (
              <div key={item.href + item.label} style={{ marginBottom: 1 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 0 }}
                  onClick={() => hasChildren && setExpanded(p => ({ ...p, [item.href]: !p[item.href] }))}
                >
                  {hasChildren ? (
                    // Expandable parent — click row to toggle children
                    <button
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 10px',
                        borderRadius: 7,
                        fontSize: 13,
                        fontWeight: isParentActive ? 600 : 400,
                        color: isParentActive ? 'var(--accent)' : 'var(--text2)',
                        background: isParentActive ? 'rgba(79,127,255,0.08)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: isParentActive ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }}
                      />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <ChevronRight
                        size={13}
                        style={{
                          color: 'var(--text3)',
                          transition: 'transform 0.15s',
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  ) : (
                    // Regular link
                    <Link
                      href={item.href}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 10px',
                        borderRadius: 7,
                        fontSize: 13,
                        fontWeight: isParentActive ? 600 : 400,
                        color: isParentActive ? 'var(--accent)' : 'var(--text2)',
                        background: isParentActive ? 'rgba(79,127,255,0.08)' : 'transparent',
                        textDecoration: 'none',
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: isParentActive ? 'var(--accent)' : 'var(--text3)', flexShrink: 0 }}
                      />
                      {item.label}
                    </Link>
                  )}
                </div>

                {/* Sub-items */}
                {hasChildren && isOpen && (
                  <div style={{ paddingLeft: 26, paddingTop: 2, paddingBottom: 2 }}>
                    {item.children!.map(child => {
                      const isChildActive = pathname === child.href || pathname?.startsWith(child.href + '/')
                      return (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          style={{
                            display: 'block',
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: isChildActive ? 600 : 400,
                            color: isChildActive ? 'var(--accent)' : 'var(--text2)',
                            background: isChildActive ? 'rgba(79,127,255,0.08)' : 'transparent',
                            textDecoration: 'none',
                            marginBottom: 1,
                          }}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* ── User footer ──────────────────────────────────── */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 8px',
            borderRadius: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(79,127,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: 'var(--accent)',
              flexShrink: 0,
            }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.name ?? profile.email}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: roleColor,
                textTransform: 'capitalize',
              }}>
                {profile.role.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 4, borderRadius: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {showNewProject && (
        <NewProjectModal
          profile={profile}
          onClose={() => setShowNewProject(false)}
          onCreated={() => { setShowNewProject(false); router.refresh() }}
        />
      )}
    </>
  )
}
