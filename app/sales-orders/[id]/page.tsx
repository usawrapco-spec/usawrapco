import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, SalesOrder, LineItem } from '@/types'
import SalesOrderDetailClient from '@/components/sales-orders/SalesOrderDetailClient'

export default async function SalesOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let salesOrder: SalesOrder | null = null
  let lineItems: LineItem[] = []
  let isDemo = false

  try {
    const { data, error } = await admin
      .from('sales_orders')
      .select(`
        *,
        customer:customer_id(id, name, email),
        sales_rep:sales_rep_id(id, name),
        estimate:estimate_id(id, estimate_number)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error
    salesOrder = data as SalesOrder

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'sales_order')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })

    lineItems = (items as LineItem[]) || []
  } catch (err) {
    console.error('[sales-order detail] fetch error:', err)
    isDemo = true
  }

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
    <SalesOrderDetailClient
      profile={profile as Profile}
      salesOrder={salesOrder}
      lineItems={lineItems}
      team={team}
      isDemo={isDemo}
      orderId={params.id}
    />
  )
}
