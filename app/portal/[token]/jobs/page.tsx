import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import PortalJobsList from '@/components/portal/PortalJobsList'

export const dynamic = 'force-dynamic'

export default async function PortalJobsPage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: '#9299b5' }}>Not found</div>

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, vehicle_desc, pipe_stage, install_date, created_at, revenue, type, customer_id')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  const jobs = projects || []

  // Auto-redirect if only 1 job
  if (jobs.length === 1) {
    redirect(`/portal/${token}/jobs/${jobs[0].id}`)
  }

  return <PortalJobsList jobs={jobs} />
}
