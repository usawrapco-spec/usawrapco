import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import AffiliateClient from '@/components/affiliate/AffiliateClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function AffiliatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch affiliates
  let affiliates: any[] = []
  try {
    const { data } = await admin.from('affiliates').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    affiliates = data || []
  } catch {}

  // Fetch affiliate commissions
  let commissions: any[] = []
  try {
    const { data } = await admin.from('affiliate_commissions').select('*, project:project_id(title, revenue, profit)').order('created_at', { ascending: false }).limit(200)
    commissions = data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <AffiliateClient profile={profile as Profile} affiliates={affiliates} commissions={commissions} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
