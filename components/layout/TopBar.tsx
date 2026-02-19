'use client'

import { usePathname } from 'next/navigation'
import type { Profile } from '@/types'
import { canAccess } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/pipeline':   'Approval Process',
  '/tasks':      'Task Queue',
  '/calendar':   'Calendar',
  '/design':     'Design Studio',
  '/employees':  'Employees',
  '/analytics':  'Analytics',
  '/settings':   'Settings',
}

interface TopBarProps {
  profile: Profile
}

export function TopBar({ profile }: TopBarProps) {
  const pathname = usePathname()
  const title = Object.entries(PAGE_TITLES).find(([k]) =>
    pathname === k || pathname.startsWith(k + '/')
  )?.[1] || 'Ops'

  return (
    <header className="h-12 bg-surface border-b border-border flex items-center px-6 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-700 text-text1">{title}</h1>
        {/* Division badge — admin only */}
        {canAccess(profile.role, 'view_master_mode') && (
          <span className="badge-accent text-xs px-2 py-0.5 rounded">🌐 Master</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Live indicator */}
        <span className="flex items-center gap-1.5 text-xs text-text3 font-500">
          <span className="live-dot" />
          Live
        </span>

        {/* Notification bell placeholder */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 text-text3 hover:text-text1 transition-colors text-base">
          🔔
        </button>
      </div>
    </header>
  )
}
