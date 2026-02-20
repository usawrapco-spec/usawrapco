import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { canAccess, isAdminRole } from '@/types'
import type { Profile } from '@/types'
import EmployeesPageClient from '@/components/employees/EmployeesPage'
import { Lock } from 'lucide-react'

export default async function EmployeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'manage_users')) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar profile={profile as Profile} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="card text-center py-16 max-w-md mx-auto">
              <Lock size={36} className="mx-auto mb-3 text-text3" />
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">Only admins can manage team members.</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <EmployeesPageClient
            profile={profile as Profile}
          />
        </main>
      </div>
    </div>
  )
}
