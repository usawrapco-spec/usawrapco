'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
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
  UserPlus,
  Contact,
  Plus,
  Target,
  PlusCircle,
  MoreHorizontal,
  Kanban,
} from 'lucide-react'

/* ─── Quick create items for the bottom sheet ─────────────────────── */
const CREATE_ITEMS = [
  { href: '/estimates?new=true', label: 'New Estimate',  icon: FileText },
  { href: '/jobs?new=true',      label: 'New Job',       icon: Briefcase },
  { href: '/customers?new=true', label: 'New Customer',  icon: Users },
  { href: '/tasks?new=true',     label: 'New Task',      icon: CheckSquare },
  { href: '/prospects?new=true', label: 'New Prospect',  icon: UserPlus },
]

/* ─── More panel items ────────────────────────────────────────────── */
const MORE_ITEMS = [
  { href: '/inbox',        label: 'Inbox',          icon: Inbox },
  { href: '/tasks',        label: 'Tasks',          icon: CheckSquare },
  { href: '/calendar',     label: 'Calendar',       icon: Calendar },
  { href: '/design',       label: 'Design Studio',  icon: Palette },
  { href: '/mockup',       label: 'Mockup Tool',    icon: Wand2 },
  { href: '/media',        label: 'Media Library',  icon: ImageIcon },
  { href: '/timeline',     label: 'Timeline',       icon: Columns2 },
  { href: '/production',   label: 'Production',     icon: Factory },
  { href: '/inventory',    label: 'Inventory',      icon: Package },
  { href: '/catalog',      label: 'Catalog',        icon: BookOpen },
  { href: '/prospects',    label: 'Prospects',      icon: UserPlus },
  { href: '/sales/prospector', label: 'Prospector', icon: Target },
  { href: '/contacts',     label: 'Contacts',       icon: Contact },
  { href: '/customers',    label: 'Customers',      icon: Users },
  { href: '/network',      label: 'Network Map',    icon: Network },
  { href: '/bids',         label: 'Installer Bids', icon: Hammer },
  { href: '/analytics',    label: 'Analytics',      icon: BarChart3 },
  { href: '/reports',      label: 'Reports',        icon: FileText },
  { href: '/payroll',      label: 'Payroll',        icon: DollarSign },
  { href: '/leaderboard',  label: 'Leaderboard',    icon: Trophy },
  { href: '/settings',     label: 'Settings',       icon: Settings },
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
          maxHeight: '70vh',
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
            marginBottom: 8,
            position: 'sticky', top: 18, background: 'var(--surface)',
            zIndex: 1,
          }}>
            <span style={{
              fontSize: 15, fontWeight: 700, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              More
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

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4, padding: '0 8px 12px',
          }}>
            {MORE_ITEMS.map(item => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '12px 8px', borderRadius: 10,
                    background: active ? 'rgba(79,127,255,0.1)' : 'transparent',
                    textDecoration: 'none',
                    minHeight: 44,
                  }}
                >
                  <Icon size={20} style={{ color: active ? 'var(--accent)' : 'var(--text3)' }} />
                  <span style={{
                    fontSize: 10, fontWeight: active ? 700 : 500,
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

        {/* Jobs */}
        <Link
          href="/projects"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', minHeight: 44,
          }}
        >
          <Briefcase size={22} style={{ color: isActive('/projects') ? 'var(--accent)' : 'var(--text3)' }} />
        </Link>

        {/* +New */}
        <Link
          href="/projects/new"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', minHeight: 44,
          }}
        >
          <PlusCircle size={28} style={{ color: 'var(--accent)' }} />
        </Link>

        {/* Pipeline */}
        <Link
          href="/pipeline"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', minHeight: 44,
          }}
        >
          <Kanban size={22} style={{ color: isActive('/pipeline') ? 'var(--accent)' : 'var(--text3)' }} />
        </Link>

        {/* Menu — opens left drawer */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-nav-drawer'))}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', minHeight: 44,
          }}
        >
          <MoreHorizontal size={22} style={{ color: 'var(--text3)' }} />
        </button>
      </nav>
    </>
  )
}
