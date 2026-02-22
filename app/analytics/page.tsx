import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { canAccess, isAdminRole } from '@/types'
import type { Profile, Project } from '@/types'
import AnalyticsPageClient from '@/components/analytics/AnalyticsPage'
import { Lock } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'view_analytics')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
            <div className="card text-center py-16 max-w-md mx-auto">
              <Lock size={36} className="mx-auto mb-3 text-text3" />
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">You don't have permission to view analytics.</div>
            </div>
          </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
    )
  }

  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
  const { data: projects } = await getSupabaseAdmin()
    .from('projects')
    .select(`*, agent:agent_id(id, name), installer:installer_id(id, name)`)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <AnalyticsPageClient
            profile={profile as Profile}
            projects={(projects as Project[]) || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
