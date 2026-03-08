import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PowerDialer from '@/components/sales-portal/PowerDialer'

export const dynamic = 'force-dynamic'

export default async function DialerPage({ params }: { params: { listId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: list } = await supabase
    .from('sales_agent_lists')
    .select('*')
    .eq('id', params.listId)
    .eq('agent_id', user.id)
    .single()

  if (!list) notFound()

  // Get uncalled/pending leads ordered by sort_order
  const { data: leads } = await supabase
    .from('sales_agent_list_leads')
    .select('*')
    .eq('list_id', params.listId)
    .in('status', ['pending', 'no_answer', 'callback'])
    .order('sort_order', { ascending: true })
    .limit(200)

  return <PowerDialer list={list} leads={leads ?? []} />
}
