import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import PlaybookClient from '@/components/settings/PlaybookClient'

export default async function PlaybookPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let entries: any[] = []
  let pricingRules: any[] = []
  let escalationRules: any[] = []
  try {
    const [pbRes, prRes, erRes] = await Promise.all([
      admin.from('sales_playbook').select('*').eq('org_id', profile.org_id).order('priority', { ascending: true }),
      admin.from('pricing_rules').select('*').eq('org_id', profile.org_id).order('vehicle_category'),
      admin.from('escalation_rules').select('*').eq('org_id', profile.org_id).order('priority', { ascending: true }),
    ])
    entries = pbRes.data || []
    pricingRules = prRes.data || []
    escalationRules = erRes.data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <PlaybookClient
          profile={profile as Profile}
          initialEntries={entries}
          initialPricing={pricingRules}
          initialEscalation={escalationRules}
        />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
