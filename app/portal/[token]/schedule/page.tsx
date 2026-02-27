import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalSchedule from '@/components/portal/PortalSchedule'

export const dynamic = 'force-dynamic'

export default async function PortalSchedulePage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: '#9299b5' }}>Not found</div>

  // Get projects with install dates
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, vehicle_desc, install_date, pipe_stage, type')
    .eq('customer_id', customer.id)
    .not('install_date', 'is', null)
    .order('install_date', { ascending: true })

  return <PortalSchedule appointments={(projects || []) as any[]} customerId={customer.id} />
}
