import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
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

  const orgId = profile.org_id || ORG_ID

  let estimate: any = null
  let lineItems: LineItem[] = []

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
    estimate = data

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
  }

  // Fetch team members for assignment dropdowns
  let employees: any[] = []
  try {
    const { data } = await admin
      .from('profiles')
      .select('id, name, email, role, division')
      .eq('org_id', orgId)
      .eq('active', true)
    employees = data || []
  } catch {}

  // Fetch customers for customer selector
  let customers: any[] = []
  try {
    const { data } = await admin
      .from('customers')
      .select('id, name, email, phone, company, company_name, contact_name')
      .eq('org_id', orgId)
      .order('name')
      .limit(500)
    customers = data || []
  } catch {}

  // Build the estimate object with line items attached
  const fullEstimate = estimate
    ? { ...estimate, line_items: lineItems }
    : null

  return (
    <EstimateDetailClient
      profile={profile as Profile}
      estimate={fullEstimate}
      employees={employees}
      customers={customers}
    />
  )
}
