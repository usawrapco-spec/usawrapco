'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccess, type Profile, type Permission } from '@/types'
import { useState } from 'react'
import NewProjectModal from '@/components/dashboard/NewProjectModal'

interface NavItem {
  href: string; label: string; icon: string
  permission?: Permission; always?: boolean
}

export function Sidebar({ profile, teammates = [] }: { profile: Profile; teammates?: any[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showNew, setShowNew] = useState(false)

  const NAV: NavItem[] = [
    { href: '/dashboard',  label: 'Dashboard',       icon: '📊', always: true },
    { href: '/pipeline',   label: 'Pipeline',         icon: '🔄', permission: 'view_all_projects' },
    { href: '/customers',  label: 'Customers',        icon: '👤', permission: 'view_all_projects' },
    { href: '/calendar',   label: 'Calendar',         icon: '📅', always: true },
    { href: '/tasks',      label: 'Tasks',            icon: '✅', always: true },
    { href: '/inventory',  label: 'Vinyl Inventory',  icon: '🗄️', permission: 'view_all_projects' },
    { href: '/analytics',  label: 'Analytics',        icon: '📈', permission: 'view_analytics' },
    { href: '/employees',  label: 'Team',             icon: '👥', permission: 'manage_users' },
    { href: '/settings',   label: 'Settings',         icon: '⚙️', always: true },
  ]

  const visible = NAV.filter(i => i.always || (i.permission && canAccess(profile.role, i.permission)))

  const ROLE_COLORS: Record<string, string> = {
    admin: '#8b5cf6', sales: '#4f7fff', production: '#22c07a',
    installer: '#22d3ee', designer: '#f59e0b', customer: '#9ca3af',
  }

  async function signOut() {
    await supabase.auth.signOut(); router.push('/login'); router.refresh()
  }

  return (
    <>
      <aside style={{
        width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0,
        position: 'sticky', top: 0, overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🚗</span>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 900, letterSpacing: '-.01em', lineHeight: 1 }}>USA WRAP CO</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Ops Platform</div>
            </div>
          </div>
        </div>

        {/* New Project */}
        <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
          <button onClick={() => setShowNew(true)} style={{
            width: '100%', background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 9, padding: '9px 12px', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>＋ New Project</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {visible.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 8, marginBottom: 2, textDecoration: 'none', fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? 'rgba(79,127,255,.12)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
                border: active ? '1px solid rgba(79,127,255,.2)' : '1px solid transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `${ROLE_COLORS[profile.role] || '#4f7fff'}22`,
              border: `2px solid ${ROLE_COLORS[profile.role] || '#4f7fff'}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: ROLE_COLORS[profile.role] || '#4f7fff', flexShrink: 0,
            }}>{profile.name?.[0]?.toUpperCase() || '?'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</div>
              <div style={{ fontSize: 9, color: ROLE_COLORS[profile.role], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{profile.role}</div>
            </div>
          </div>
          <button onClick={signOut} style={{
            width: '100%', background: 'none', border: '1px solid var(--border)',
            color: 'var(--text3)', padding: '6px', borderRadius: 7,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>⏻ Sign Out</button>
        </div>
      </aside>

      {showNew && (
        <NewProjectModal profile={profile} teammates={teammates} onClose={() => setShowNew(false)} />
      )}
    </>
  )
}
