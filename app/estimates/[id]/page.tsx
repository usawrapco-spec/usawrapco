import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import type { Profile, Estimate, LineItem } from '@/types'
import EstimateDetailClient from '@/components/estimates/EstimateDetailClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function EstimateDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let estimate: Estimate | null = null
  let lineItems: LineItem[] = []
  let isDemo = false

  try {
    const { data, error } = await admin
      .from('estimates')
      .select(`
        *,
        customer:customer_id(id, name, email),
        sales_rep:sales_rep_id(id, name)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error
    estimate = data as Estimate

    // Fetch line items
    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'estimate')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })

    lineItems = (items as LineItem[]) || []
  } catch (err) {
    console.error('[estimate detail] fetch error:', err)
    isDemo = true
  }

  // Fetch team members for assignment dropdowns
  const orgId = profile.org_id || ORG_ID
  let team: Pick<Profile, 'id' | 'name' | 'role'>[] = []
  try {
    const { data: teamData } = await admin
      .from('profiles')
      .select('id, name, role')
      .eq('org_id', orgId)
      .eq('active', true)
    team = (teamData || []) as Pick<Profile, 'id' | 'name' | 'role'>[]
  } catch {}

  return (
    <EstimateDetailClient
      profile={profile as Profile}
      estimate={estimate}
      lineItems={lineItems}
      team={team}
      isDemo={isDemo}
      estimateId={params.id}
    />
  )
}
