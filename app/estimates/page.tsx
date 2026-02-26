import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, Estimate } from '@/types'
import EstimatesClient from '@/components/estimates/EstimatesClient'

export default async function EstimatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let estimates: Estimate[] = []
  try {
    const { data, error } = await admin
      .from('estimates')
      .select(`
        *,
        customer:customer_id(id, name, email),
        sales_rep:sales_rep_id(id, name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    estimates = (data as Estimate[]) || []
  } catch (err) {
    console.error('[estimates] fetch error:', err)
    // Table may not exist yet — client will use demo data
  }

  return (
    <EstimatesClient
      profile={profile as Profile}
      initialEstimates={estimates}
    />
  )
}
