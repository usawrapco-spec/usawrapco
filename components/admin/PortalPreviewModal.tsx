'use client'

import { useEffect, useState } from 'react'
import type { UserRole } from '@/types'
import { isAdminRole } from '@/types'
import {
  X, LayoutDashboard, ClipboardList, Kanban, FileText,
  Users, Receipt, CalendarDays, Clock, Factory, DollarSign,
  UserPlus, Inbox, Globe, Palette, FileInput, Shield,
  UserCheck, Settings, Rocket, BarChart3, Map, Trophy, Brain,
  TrendingUp, Truck,
} from 'lucide-react'

interface NavItemPreview {
  href: string
  label: string
  icon: React.ElementType
  section: string
}

function getNavForRole(role: UserRole): { section: string; items: NavItemPreview[] }[] {
  const all: NavItemPreview[] = [
    { href: '/dashboard',       label: 'Dashboard',         icon: LayoutDashboard, section: 'MAIN' },
    { href: '/jobs',            label: 'Jobs',              icon: ClipboardList,   section: 'MAIN' },
  ]

  if (role === 'sales_agent' || isAdminRole(role)) {
    all.push(
      { href: '/pipeline',   label: 'Pipeline',  icon: Kanban,   section: 'MAIN' },
      { href: '/estimates',  label: 'Estimates', icon: FileText, section: 'MAIN' },
      { href: '/customers',  label: 'Customers', icon: Users,    section: 'MAIN' },
      { href: '/invoices',   label: 'Invoices',  icon: Receipt,  section: 'MAIN' },
    )
  }

  // OPERATIONS
  if (isAdminRole(role) || role === 'sales_agent') {
    all.push({ href: '/calendar', label: 'Calendar', icon: CalendarDays, section: 'OPERATIONS' })
  }
  if (isAdminRole(role) || role === 'production' || role === 'installer') {
    all.push({ href: '/schedule', label: 'Schedule', icon: Clock, section: 'OPERATIONS' })
  }
  if (isAdminRole(role) || role === 'production') {
    all.push({ href: '/production', label: 'Production Queue', icon: Factory, section: 'OPERATIONS' })
  }
  if (isAdminRole(role)) {
    all.push({ href: '/employees', label: 'Team', icon: Users, section: 'OPERATIONS' })
  }
  if (isAdminRole(role) || role === 'installer') {
    all.push({ href: '/payroll', label: 'Payroll', icon: DollarSign, section: 'OPERATIONS' })
  }

  // SALES
  if (isAdminRole(role) || role === 'sales_agent') {
    all.push(
      { href: '/prospects',  label: 'Leads',        icon: UserPlus, section: 'SALES' },
      { href: '/inbox',      label: 'Inbox',        icon: Inbox,    section: 'SALES' },
      { href: '/campaigns',  label: 'Outbound CRM', icon: Globe,    section: 'SALES' },
    )
  }

  // DESIGN
  if (isAdminRole(role) || role === 'designer') {
    all.push({ href: '/design', label: 'Design Studio', icon: Palette, section: 'DESIGN' })
  }
  if (isAdminRole(role) || role === 'designer' || role === 'sales_agent') {
    all.push({ href: '/design/intakes', label: 'Design Intake', icon: FileInput, section: 'DESIGN' })
  }

  // ADMIN CONTROLS (admin/owner only)
  if (isAdminRole(role)) {
    all.push(
      { href: '/admin/access',  label: 'Access Manager',   icon: UserCheck, section: 'ADMIN CONTROLS' },
      { href: '/admin/portals', label: 'Employee Portals', icon: Truck,     section: 'ADMIN CONTROLS' },
      { href: '/settings',      label: 'System Settings',  icon: Settings,  section: 'ADMIN CONTROLS' },
    )
  }

  // ADVANCED (admin/owner only)
  if (isAdminRole(role)) {
    all.push(
      { href: '/analytics',    label: 'Analytics',   icon: BarChart3, section: 'ADVANCED' },
      { href: '/fleet-map',    label: 'Fleet',        icon: Map,       section: 'ADVANCED' },
      { href: '/leaderboard',  label: 'Leaderboard',  icon: Trophy,    section: 'ADVANCED' },
      { href: '/engine',       label: 'V.I.N.Y.L.',   icon: Brain,     section: 'ADVANCED' },
    )
  }

  // Group by section
  const sectionOrder = ['MAIN', 'OPERATIONS', 'SALES', 'DESIGN', 'ADMIN CONTROLS', 'ADVANCED']
  const grouped: Record<string, NavItemPreview[]> = {}
  for (const item of all) {
    if (!grouped[item.section]) grouped[item.section] = []
    grouped[item.section].push(item)
  }

  return sectionOrder
    .filter(s => grouped[s]?.length > 0)
    .map(s => ({ section: s, items: grouped[s] }))
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#f59e0b',
  admin: '#8b5cf6',
  sales_agent: '#4f7fff',
  designer: '#22c07a',
  production: '#22d3ee',
  installer: '#f25a5a',
  viewer: '#9299b5',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', sales_agent: 'Sales Agent',
  designer: 'Designer', production: 'Production', installer: 'Installer', viewer: 'Viewer',
}

interface Member {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url: string | null
}

interface JobSummary {
  total: number
  active: number
  pending: number
}

export function PortalPreviewModal({
  member,
  previewRole,
  onClose,
}: {
  member: Member
  previewRole: UserRole
  onClose: () => void
}) {
  const [jobs, setJobs] = useState<JobSummary | null>(null)
  const sections = getNavForRole(previewRole)
  const roleColor = ROLE_COLORS[previewRole] ?? '#9299b5'
  const roleLabel = ROLE_LABELS[previewRole] ?? previewRole

  useEffect(() => {
    // Fetch job summary for this member
    fetch(`/api/jobs?assignee=${member.id}&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setJobs({ total: data.length, active: data.filter((j: { status: string }) => j.status === 'active').length, pending: 0 })
        }
      })
      .catch(() => {})
  }, [member.id])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 860, maxHeight: '88vh',
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: `${roleColor}0a`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: roleColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0,
          }}>
            {member.avatar_url
              ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (member.name || '?').charAt(0).toUpperCase()
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Viewing as</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
              {member.name || member.email}
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 600,
                color: roleColor, background: `${roleColor}18`,
                padding: '2px 7px', borderRadius: 5,
              }}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 7, border: 'none',
              background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text2)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

            {/* Mini sidebar preview */}
            <div style={{
              background: 'var(--surface2)', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              {/* Logo bar */}
              <div style={{
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <TrendingUp size={14} color="#4f7fff" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>USA WRAP CO</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>v6.2</div>
                </div>
              </div>

              {/* Nav sections */}
              <div style={{ padding: '6px 0' }}>
                {sections.map(({ section, items }) => (
                  <div key={section} style={{ marginBottom: 4 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: section === 'ADMIN CONTROLS' ? '#8b5cf6' : 'var(--text3)',
                      padding: '4px 12px 2px',
                    }}>
                      {section}
                    </div>
                    {items.map(item => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.href}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 12px 5px 18px',
                          }}
                        >
                          <Icon size={11} color="var(--text2)" />
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* User footer */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: roleColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {(member.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text1)' }}>
                    {(member.name || member.email).split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'capitalize' }}>
                    {roleLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Access summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Access summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <div style={{
                  background: 'var(--surface2)', borderRadius: 10,
                  padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)' }}>
                    {sections.length}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Nav Sections</div>
                </div>
                <div style={{
                  background: 'var(--surface2)', borderRadius: 10,
                  padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)' }}>
                    {totalItems}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Nav Items</div>
                </div>
                <div style={{
                  background: 'var(--surface2)', borderRadius: 10,
                  padding: '14px 16px',
                  border: `1px solid ${roleColor}30`,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: roleColor }}>
                    {roleLabel}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Role Level</div>
                </div>
              </div>

              {/* What they can access */}
              <div style={{
                background: 'var(--surface2)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                padding: 16,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12,
                }}>
                  Access Summary — {roleLabel}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Financial Data',      has: isAdminRole(previewRole) || previewRole === 'sales_agent' },
                    { label: 'All Jobs',            has: isAdminRole(previewRole) || previewRole !== 'viewer' },
                    { label: 'Pipeline',            has: isAdminRole(previewRole) || previewRole === 'sales_agent' },
                    { label: 'Customer Records',    has: isAdminRole(previewRole) || previewRole === 'sales_agent' },
                    { label: 'Design Studio',       has: isAdminRole(previewRole) || previewRole === 'designer' },
                    { label: 'Payroll Data',        has: isAdminRole(previewRole) || previewRole === 'installer' },
                    { label: 'Admin Controls',      has: isAdminRole(previewRole) },
                    { label: 'Analytics & Reports', has: isAdminRole(previewRole) },
                  ].map(row => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: row.has ? '#22c07a' : '#f25a5a',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 12, color: row.has ? 'var(--text2)' : 'var(--text3)',
                      }}>
                        {row.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role description */}
              <div style={{
                background: `${roleColor}0a`,
                border: `1px solid ${roleColor}20`,
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: roleColor, marginBottom: 6 }}>
                  {roleLabel} Role
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {previewRole === 'owner' && 'Full access to all features, settings, and financial data. Cannot be restricted.'}
                  {previewRole === 'admin' && 'Full access to all features. Can manage users, settings, and view all data.'}
                  {previewRole === 'sales_agent' && 'Can manage estimates, customers, invoices, and leads. Sees own commission data and financials.'}
                  {previewRole === 'designer' && 'Access to Design Studio and assigned jobs in design stage. No financial or admin access.'}
                  {previewRole === 'production' && 'Access to production queue and schedule. Can view and update jobs in production stage.'}
                  {previewRole === 'installer' && 'Can view assigned jobs, schedule, and own payroll. Limited to install-related features.'}
                  {previewRole === 'viewer' && 'Read-only access to media library only.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Preview of what {member.name || 'this user'} sees when logged in
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--surface2)', cursor: 'pointer',
              fontSize: 12, color: 'var(--text2)',
            }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
