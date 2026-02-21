'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  CheckSquare,
  Calendar,
  Menu,
  X,
  Briefcase,
  Palette,
  Factory,
  Package,
  Users,
  Trophy,
  Settings,
  BarChart3,
  Network,
  Hammer,
  ImageIcon,
  Wand2,
  Columns2,
  BookOpen,
  FileText,
  Inbox,
  DollarSign,
} from 'lucide-react'

const MAIN_TABS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
]

const MORE_ITEMS = [
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/design', label: 'Design Studio', icon: Palette },
  { href: '/mockup', label: 'Mockup Tool', icon: Wand2 },
  { href: '/media', label: 'Media Library', icon: ImageIcon },
  { href: '/timeline', label: 'Timeline', icon: Columns2 },
  { href: '/production', label: 'Production', icon: Factory },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/catalog', label: 'Catalog', icon: BookOpen },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/network', label: 'Network Map', icon: Network },
  { href: '/bids', label: 'Installer Bids', icon: Hammer },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/payroll', label: 'Payroll', icon: DollarSign },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 999,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '60vh',
          overflowY: 'auto',
          padding: '12px 8px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 12px 12px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              More
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {MORE_ITEMS.map(item => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '12px 8px', borderRadius: 10,
                    background: isActive ? 'rgba(79,127,255,0.1)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text3)' }} />
                  <span style={{
                    fontSize: 10, fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    textAlign: 'center', lineHeight: 1.2,
                  }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {MAIN_TABS.map(tab => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: '8px 0',
                textDecoration: 'none', minHeight: 44,
              }}
            >
              <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text3)' }} />
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text2)',
              }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
        {/* More tab */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2, padding: '8px 0',
            background: 'none', border: 'none', cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <Menu size={20} style={{ color: moreOpen ? 'var(--accent)' : 'var(--text3)' }} />
          <span style={{
            fontSize: 10, fontWeight: moreOpen ? 700 : 500,
            color: moreOpen ? 'var(--accent)' : 'var(--text2)',
          }}>
            More
          </span>
        </button>
      </nav>
    </>
  )
}
