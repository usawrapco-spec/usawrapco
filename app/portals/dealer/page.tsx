import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import DealerHubClient from '@/components/portals/DealerHubClient'

export default async function DealerPortalHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let dealers: any[] = []
  try {
    const { data } = await admin
      .from('affiliates')
      .select('*')
      .eq('org_id', orgId)
      .in('type', ['dealer', 'manufacturer', 'reseller'])
      .order('created_at', { ascending: false })
    dealers = data || []
  } catch {}

  let commissions: any[] = []
  try {
    const dealerIds = dealers.map(d => d.id)
    if (dealerIds.length > 0) {
      const { data } = await admin
        .from('affiliate_commissions')
        .select('*, project:project_id(title, revenue)')
        .in('affiliate_id', dealerIds)
        .order('created_at', { ascending: false })
        .limit(500)
      commissions = data || []
    }
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <DealerHubClient profile={profile as Profile} dealers={dealers} commissions={commissions} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
