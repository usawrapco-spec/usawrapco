'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccess, type Profile, type Permission } from '@/types'
import { clsx } from 'clsx'
import { useState } from 'react'
import NewProjectModal from '@/components/dashboard/NewProjectModal'
import {
  LayoutDashboard,
  CheckCircle,
  ListTodo,
  Calendar,
  Scissors,
  Palette,
  Users,
  Factory,
  Trophy,
  GanttChart,
  DollarSign,
  BarChart3,
  Settings,
  Car,
  Plus,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  permission?: Permission
  always?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, always: true },
  { href: '/pipeline',    label: 'Approval',      icon: CheckCircle,     permission: 'view_all_projects' },
  { href: '/tasks',       label: 'Task Queue',    icon: ListTodo,        always: true },
  { href: '/calendar',    label: 'Calendar',       icon: Calendar,        always: true },
  { href: '/inventory',   label: 'Vinyl',          icon: Scissors,        always: true },
  { href: '/design',      label: 'Design Studio',  icon: Palette,         permission: 'access_design_studio' },
  { href: '/employees',   label: 'Team',           icon: Users,           permission: 'manage_users' },
  { href: '/production',  label: 'Production',     icon: Factory,         always: true },
  { href: '/leaderboard', label: 'Leaderboard',    icon: Trophy,          always: true },
  { href: '/timeline',    label: 'Timeline',       icon: GanttChart,      always: true },
  { href: '/overhead',    label: 'Overhead',       icon: DollarSign,      always: true },
  { href: '/analytics',   label: 'Analytics',      icon: BarChart3,       permission: 'view_analytics' },
  { href: '/settings',    label: 'Settings',       icon: Settings,        permission: 'manage_settings' },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showNewProject, setShowNewProject] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item =>
    item.always || (item.permission && canAccess(profile.role, item.permission))
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleColors: Record<string, string> = {
    admin: 'text-purple', sales: 'text-accent', production: 'text-green',
    installer: 'text-cyan', designer: 'text-amber', customer: 'text-text3',
  }

  return (
    <>
      <aside className="w-56 bg-surface border-r border-border flex flex-col shrink-0 h-full">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-accent" />
            <div>
              <div className="text-sm font-900 tracking-tight text-text1 leading-none"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                USA WRAP CO
              </div>
              <div className="text-xs text-text3">
                Ops Platform
                <span className="ml-1 text-accent/60 mono text-[9px]">v4.1</span>
              </div>
            </div>
          </div>
        </div>

        {/* New Project button */}
        <div className="px-3 py-3 border-b border-border">
          <button onClick={() => setShowNewProject(true)} className="btn-primary w-full text-sm">
            <Plus className="w-4 h-4 inline-block -mt-0.5" /> New Estimate
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {visibleItems.map(item => {
            const active = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-500 transition-all',
                  active
                    ? 'bg-accent/15 text-accent font-700'
                    : 'text-text2 hover:bg-surface2 hover:text-text1'
                )}>
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-800 text-accent shrink-0">
              {profile.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-600 text-text1 truncate">{profile.name}</div>
              <div className={clsx('text-xs font-700 capitalize', roleColors[profile.role])}>
                {profile.role}
              </div>
            </div>
            <button onClick={handleSignOut}
              className="text-text3 hover:text-red transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
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
