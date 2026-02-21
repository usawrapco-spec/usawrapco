import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { canAccess, isAdminRole } from '@/types'
import type { Profile } from '@/types'
import SettingsPageClient from '@/components/settings/SettingsPage'
import { Lock } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'manage_settings')) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar profile={profile as Profile} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            <div className="card text-center py-16 max-w-md mx-auto">
              <Lock size={36} className="mx-auto mb-3 text-text3" />
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">Only admins can access settings.</div>
            </div>
          </main>
        </div>
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <SettingsPageClient
            profile={profile as Profile}
          />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
