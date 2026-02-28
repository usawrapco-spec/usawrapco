import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import CustomerNetworkMap from '@/components/network/CustomerNetworkMap'

export default async function MapPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch customers with projects for lifetime value
  const [customersRes, connectionsRes, projectsRes, referralsRes] = await Promise.all([
    admin.from('customers')
      .select('id, name, email, phone, business_name, status, lifetime_spend, lead_source, created_at, company_name')
      .eq('org_id', orgId).limit(500),
    admin.from('customer_connections')
      .select('*')
      .eq('org_id', orgId),
    admin.from('projects')
      .select('id, customer_id, revenue, status')
      .eq('org_id', orgId).limit(1000),
    admin.from('referral_tracking')
      .select('*')
      .eq('org_id', orgId).limit(500)
      .then(res => res, () => ({ data: [] as any[] })),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <CustomerNetworkMap
          profile={profile as Profile}
          customers={customersRes.data || []}
          connections={connectionsRes.data || []}
          projects={projectsRes.data || []}
          referrals={(referralsRes as any).data || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
