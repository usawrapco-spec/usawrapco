import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdHocDialer from '@/components/sales-portal/AdHocDialer'

export const dynamic = 'force-dynamic'

export default async function AdHocDialerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all active lists with remaining leads
  const { data: lists } = await supabase
    .from('sales_agent_lists')
    .select('id, name, total_count, called_count, status')
    .eq('agent_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const activeLists = (lists ?? []).filter(l => l.called_count < l.total_count)

  return <AdHocDialer lists={activeLists} />
}
