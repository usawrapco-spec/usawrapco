export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from './TransactionsClient'

export default async function TransactionsPage() {
  const supabase = createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      projects(id, title, type, vehicle_desc),
      customers(id, name, business_name, email)
    `)
    .eq('org_id', 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f')
    .order('created_at', { ascending: false })

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('org_id', 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f')
    .order('created_at', { ascending: false })
    .limit(50)

  return <TransactionsClient invoices={invoices || []} payments={payments || []} />
}
