import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import CampaignsClient from '@/components/campaigns/CampaignsClient'

export default async function CampaignsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let campaigns: any[] = []
  let prospects: any[] = []
  try {
    const [campRes, prospRes] = await Promise.all([
      admin.from('campaigns').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false }),
      admin.from('prospects').select('id, name, business_name, company, email, industry, status, score')
        .eq('org_id', profile.org_id).order('score', { ascending: false }).limit(500),
    ])
    campaigns = campRes.data || []
    prospects = prospRes.data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <CampaignsClient profile={profile as Profile} initialCampaigns={campaigns} prospects={prospects} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
