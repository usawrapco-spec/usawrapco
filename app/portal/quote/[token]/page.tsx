import { createClient } from '@/lib/supabase/server'
import QuoteApprovalClient from '@/components/portal/QuoteApprovalClient'

export default async function QuoteApprovalPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  let salesOrder = null
  let lineItems: any[] = []
  let isDemo = false

  try {
    const { data: so } = await supabase
      .from('sales_orders')
      .select('*, customer:customers!customer_id(id, name, email, phone)')
      .eq('portal_token', params.token)
      .single()

    if (so) {
      salesOrder = so
      const { data: items } = await supabase
        .from('line_items')
        .select('*')
        .eq('parent_type', 'sales_order')
        .eq('parent_id', so.id)
        .order('sort_order')
      lineItems = items || []
    }
  } catch {
    isDemo = true
  }

  if (!salesOrder) isDemo = true

  return (
    <QuoteApprovalClient
      salesOrder={salesOrder}
      lineItems={lineItems}
      token={params.token}
      isDemo={isDemo}
    />
  )
}
