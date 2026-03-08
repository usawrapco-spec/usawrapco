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
      .from('dealers')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    dealers = data || []
  } catch {}

  // Aggregate referral counts and commission totals per dealer
  const dealerIds = dealers.map(d => d.id)
  let referralCounts: Record<string, number> = {}
  let commissionTotals: Record<string, number> = {}

  if (dealerIds.length > 0) {
    try {
      const { data } = await admin
        .from('dealer_referrals')
        .select('dealer_id, commission_amount')
        .in('dealer_id', dealerIds)
      if (data) {
        for (const r of data) {
          referralCounts[r.dealer_id] = (referralCounts[r.dealer_id] || 0) + 1
          commissionTotals[r.dealer_id] = (commissionTotals[r.dealer_id] || 0) + (r.commission_amount || 0)
        }
      }
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <DealerHubClient
          profile={profile as Profile}
          dealers={dealers}
          referralCounts={referralCounts}
          commissionTotals={commissionTotals}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
