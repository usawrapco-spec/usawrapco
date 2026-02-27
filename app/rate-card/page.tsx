export const dynamic = 'force-dynamic'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import RateCardClient from '@/components/rate-card/RateCardClient'

export default async function RateCardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Visible to owner, admin, installer
  const allowed = ['owner', 'admin', 'installer']
  if (!allowed.includes(profile.role)) redirect('/dashboard')

  const orgId = profile.org_id || ORG_ID

  // vehicle_measurements is a global shared table (no org_id)
  const [vehiclesRes, rulesRes] = await Promise.all([
    admin
      .from('vehicle_measurements')
      .select('id, make, model, total_sqft')
      .gt('total_sqft', 0)
      .order('make')
      .order('model'),
    admin
      .from('rate_card_settings')
      .select('*')
      .eq('org_id', orgId)
      .single(),
  ])

  const vehicles = vehiclesRes.data || []
  const rules = rulesRes.data || {
    install_rate_hr: 35,
    production_speed: 35.71,
    material_per_sqft: 2.10,
    design_fee: 150,
    max_cost_pct: 25,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <RateCardClient
          profile={profile as Profile}
          vehicles={vehicles}
          initialRules={rules}
          orgId={orgId}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
