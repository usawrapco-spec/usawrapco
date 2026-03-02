'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Palette } from 'lucide-react'
import { SideNav } from '@/components/layout/SideNav'
import { QuickPermissionsWidget } from '@/components/ui/QuickPermissionsWidget'
import type { Profile } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/design':           'Design Projects',
  '/design/briefs':    'Incoming Briefs',
  '/design/materials': 'Material Library',
  '/design/proofs':    'Customer Proofs',
  '/design/mockups':   'AI Mockups',
  '/design/intakes':   'Design Intakes',
  '/configurator':     '3D Configurator',
  '/mockup':           'Mockup Tool',
}

interface Props {
  profile: Profile
  children: React.ReactNode
  /** Optional extra buttons shown in the top bar right side */
  actions?: React.ReactNode
}

export function DesignStudioLayout({ profile, children, actions }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)

  const sideW = collapsed ? 64 : 240
  const title =
    (pathname
      ? PAGE_TITLES[pathname] ??
        (pathname.startsWith('/design/mockups') ? 'AI Mockups' : undefined)
      : undefined) ?? 'Design Studio'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <SideNav
        profile={profile}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          marginLeft: sideW,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'margin-left 0.2s ease',
          minWidth: 0,
        }}
        className="max-md:ml-0"
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div
          style={{
            height: 52,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'var(--surface)',
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text2)',
              flexShrink: 0,
            }}
            className="md:hidden"
          >
            <Menu size={16} />
          </button>

          {/* Page icon + title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Palette size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--text1)',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </span>
          </div>

          {/* Right-side action slot */}
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {actions}
            </div>
          )}
        </div>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            paddingBottom: 24,
          }}
        >
          {children}
        </main>
      </div>

      {/* Quick permissions widget (admin/owner only) */}
      <QuickPermissionsWidget profile={profile} />
    </div>
  )
}
