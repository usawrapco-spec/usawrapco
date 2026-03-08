import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LeadTable from '@/components/sales-portal/LeadTable'

export const dynamic = 'force-dynamic'

export default async function ListDetailPage({ params }: { params: { listId: string } }) {
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

  const { data: leads } = await supabase
    .from('sales_agent_list_leads')
    .select('*')
    .eq('list_id', params.listId)
    .order('sort_order', { ascending: true })
    .limit(500)

  return <LeadTable list={list} leads={leads ?? []} />
}
