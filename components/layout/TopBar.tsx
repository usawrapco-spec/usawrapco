'use client'

import { usePathname } from 'next/navigation'
import type { Profile } from '@/types'
import { Flame, Zap } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':             'Dashboard',
  '/pipeline':              'Approval Pipeline',
  '/tasks':                 'Task Queue',
  '/calendar':              'Calendar',
  '/inventory':             'Vinyl Inventory',
  '/inventory/remnants':    'Remnant Tracking',
  '/design':                'Design Studio',
  '/employees':             'Team Management',
  '/analytics':             'Analytics',
  '/settings':              'Settings',
  '/overhead':              'Shop Overhead',
  '/1099':                  '1099 Tax Calculator',
  '/catalog':               'Product Catalog',
  '/leaderboard':           'Leaderboard',
  '/production':            'Production Hub',
  '/production/printers':   'Printer Maintenance',
  '/production/print-schedule': 'Print Schedule',
  '/timeline':              'Timeline',
  '/installer-portal':      'Installer Portal',
  '/media':                 'Media Library',
  '/reports':               'Reports',
  '/mockup':                'Mockup Tool',
  '/customers':             'Customers',
}

export function TopBar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ||
    (pathname.startsWith('/projects/') && pathname.endsWith('/edit') ? 'Edit Project' :
     pathname.startsWith('/projects/') ? 'Project Detail' :
     pathname.startsWith('/customers/') ? 'Customer Detail' :
     'USA Wrap Co')

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'

  const xp     = profile.xp || 0
  const level  = profile.level || (xp > 0 ? Math.floor(Math.sqrt(xp / 50)) + 1 : 1)
  const streak = profile.current_streak || 0

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-800 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.01em' }}>
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* XP level chip */}
        {xp > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20,
            background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)',
          }}>
            <Zap size={11} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
              Lv.{level}
            </span>
          </div>
        )}

        {/* Streak chip */}
        {streak >= 2 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          }}>
            <Flame size={11} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
              {streak}d
            </span>
          </div>
        )}

        <span className="text-xs text-text3">
          {greeting}, <span className="text-text1 font-600">{profile.name?.split(' ')[0] || profile.email?.split('@')[0]}</span>
        </span>
      </div>
    </header>
  )
}
