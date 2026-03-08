import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeadListManager from '@/components/sales-portal/LeadListManager'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = await supabase
    .from('sales_agent_lists')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false })

  return <LeadListManager lists={lists ?? []} />
}
