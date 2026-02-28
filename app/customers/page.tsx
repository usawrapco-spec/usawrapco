import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import CustomersClient from '@/components/customers/CustomersClient'

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load customers
  const { data: customers } = await admin
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200)

  // Most recent vehicle per customer from projects (ordered by updated_at desc)
  const { data: recentProjects } = await admin
    .from('projects')
    .select('customer_id, vehicle_desc, form_data')
    .eq('org_id', orgId)
    .not('customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1000)

  const vehicleMap: Record<string, string> = {}
  for (const p of recentProjects || []) {
    if (p.customer_id && !vehicleMap[p.customer_id]) {
      const fd = (p.form_data as any) || {}
      const v = p.vehicle_desc || [fd.vehicleYear, fd.vehicleMake, fd.vehicleModel].filter(Boolean).join(' ') || ''
      if (v) vehicleMap[p.customer_id] = v
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <CustomersClient
            profile={profile as Profile}
            initialCustomers={customers || []}
            vehicleMap={vehicleMap}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
