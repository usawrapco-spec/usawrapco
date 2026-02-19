'use client'

import { usePathname } from 'next/navigation'
import type { Profile } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/pipeline':   'Approval Pipeline',
  '/tasks':      'Task Queue',
  '/calendar':   'Calendar',
  '/inventory':  'Vinyl Inventory',
  '/design':     'Design Studio',
  '/employees':  'Team Management',
  '/analytics':  'Analytics',
  '/settings':   'Settings',
}

export function TopBar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ||
    (pathname.startsWith('/projects/') ? 'Project Detail' : 'USA Wrap Co')

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-lg font-800 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-text3">
          {greeting}, <span className="text-text1 font-600">{profile.name?.split(' ')[0]}</span>
        </span>
      </div>
    </header>
  )
}
