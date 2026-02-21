import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import BidsClient from '@/components/bids/BidsClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function BidsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch installer bids
  const orgId = profile.org_id || ORG_ID
  let bids: any[] = []
  try {
    const { data } = await admin
      .from('installer_bids')
      .select('*, project:project_id(id, title, vehicle_desc, install_date)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    bids = data || []
  } catch {}

  // Fetch installers
  let installers: any[] = []
  try {
    const { data } = await admin
      .from('profiles')
      .select('id, name, email, role')
      .eq('org_id', orgId)
      .eq('role', 'installer')
      .eq('active', true)
    installers = data || []
  } catch {}

  return <BidsClient profile={profile as Profile} initialBids={bids} installers={installers} />
}
