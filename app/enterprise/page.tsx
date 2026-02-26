import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import EnterpriseHubClient from '@/components/enterprise/EnterpriseHubClient'
import { Lock } from 'lucide-react'

export default async function EnterpriseHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <div className="card text-center py-16 max-w-md mx-auto">
            <Lock size={36} className="mx-auto mb-3 text-text3" />
            <div className="text-lg font-700 text-text1">Access Restricted</div>
            <div className="text-sm text-text3 mt-1">Enterprise Hub is available to owners and admins only.</div>
          </div>
        </main>
        <div className="md:hidden"><MobileNav /></div>
      </div>
    )
  }

  const orgId = profile.org_id || ORG_ID

  // Load org stats in parallel
  const [
    { count: totalJobs },
    { data: revenueData },
    { count: totalCustomers },
    { count: teamSize },
  ] = await Promise.all([
    admin.from('projects').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    admin.from('projects').select('revenue').eq('org_id', orgId).eq('pipe_stage', 'done'),
    admin.from('customers').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ])

  const totalRevenue = (revenueData || []).reduce((sum: number, p: any) => sum + (p.revenue || 0), 0)

  const orgStats = {
    totalJobs: totalJobs || 0,
    totalRevenue,
    totalCustomers: totalCustomers || 0,
    teamSize: teamSize || 0,
    joinedDate: '2024-01-01',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <EnterpriseHubClient profile={profile as Profile} orgStats={orgStats} />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
