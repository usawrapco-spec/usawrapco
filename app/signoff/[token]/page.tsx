import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import CustomerSignoffClient from '@/components/customer/CustomerSignoffClient'

export default async function SignoffPage({ params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin()

  // Look up the signoff token in projects
  const { data: project } = await admin
    .from('projects')
    .select(`
      id, title, vehicle_desc, type, status, fin_data, form_data,
      customer:customer_id(name, email, company_name),
      agent:agent_id(name, email)
    `)
    .filter('actuals->signoff_token', 'eq', params.token)
    .single()

  // If not found by actuals, try customer_intake_tokens table
  let intakeData = null
  if (!project) {
    const { data: intake } = await admin
      .from('customer_intake_tokens')
      .select('*, project:project_id(*)')
      .eq('token', params.token)
      .single()
    if (!intake) notFound()
    intakeData = intake
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e8ecf4' }}>
      <CustomerSignoffClient
        project={project}
        intakeData={intakeData}
        token={params.token}
      />
    </div>
  )
}
