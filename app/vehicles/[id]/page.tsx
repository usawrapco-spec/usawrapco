import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import VehicleDetailClient from '@/components/payroll/VehicleDetailClient'
import { ORG_ID } from '@/lib/org'

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  const { data: vehicle } = await admin
    .from('company_vehicles')
    .select('*, assigned_employee:assigned_to(id,name,email,avatar_url)')
    .eq('id', params.id)
    .eq('org_id', orgId)
    .single()

  if (!vehicle) redirect('/vehicles')

  const [mileageRes, maintenanceRes, employeesRes] = await Promise.all([
    admin
      .from('mileage_logs')
      .select('*, driver:user_id(id,name,avatar_url)')
      .eq('company_vehicle_id', params.id)
      .order('date', { ascending: false })
      .limit(100),
    admin
      .from('vehicle_maintenance')
      .select('*')
      .eq('vehicle_id', params.id)
      .order('created_at', { ascending: false }),
    admin
      .from('profiles')
      .select('id,name,email,role')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('name'),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <VehicleDetailClient
          profile={profile as Profile}
          vehicle={vehicle}
          mileageLogs={mileageRes.data || []}
          maintenanceRecords={maintenanceRes.data || []}
          employees={employeesRes.data || []}
        />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
