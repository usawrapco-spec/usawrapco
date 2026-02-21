import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, SalesOrder } from '@/types'
import SalesOrdersClient from '@/components/sales-orders/SalesOrdersClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function SalesOrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let salesOrders: SalesOrder[] = []
  try {
    const { data, error } = await admin
      .from('sales_orders')
      .select(`
        *,
        customer:customer_id(id, name, email),
        sales_rep:sales_rep_id(id, name),
        estimate:estimate_id(id, estimate_number)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    salesOrders = (data as SalesOrder[]) || []
  } catch (err) {
    console.error('[sales-orders] fetch error:', err)
  }

  return (
    <SalesOrdersClient
      profile={profile as Profile}
      initialOrders={salesOrders}
    />
  )
}
