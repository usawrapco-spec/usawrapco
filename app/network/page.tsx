import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import NetworkMapClient from '@/components/network/NetworkMapClient'

export default async function NetworkPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch customers
  let customers: any[] = []
  try {
    const { data } = await admin
      .from('customers')
      .select('id, name, email, phone, business_name, status, lifetime_spend, lead_source, created_at, company_name')
      .eq('org_id', orgId)
      .limit(500)
    customers = data || []
  } catch {}

  // Fetch connections
  let connections: any[] = []
  try {
    const { data } = await admin
      .from('customer_connections')
      .select('*')
      .eq('org_id', orgId)
    connections = data || []
  } catch {}

  return (
    <NetworkMapClient
      profile={profile as Profile}
      customers={customers}
      connections={connections}
    />
  )
}
