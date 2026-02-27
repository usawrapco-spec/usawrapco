import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalMessages from '@/components/portal/PortalMessages'

export const dynamic = 'force-dynamic'

export default async function PortalMessagesPage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, org_id')
    .eq('portal_token', token)
    .single()

  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: '#9299b5' }}>Not found</div>

  // Fetch messages for this customer (customer-level + all project-level)
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('customer_id', customer.id)

  const projectIds = (projects || []).map((p: any) => p.id)

  let messages: any[] = []
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('portal_messages')
      .select('id, sender_name, body, direction, created_at, project_id, customer_id')
      .or(`customer_id.eq.${customer.id},project_id.in.(${projectIds.join(',')})`)
      .order('created_at', { ascending: true })
    messages = data || []
  }

  return (
    <PortalMessages
      initialMessages={messages}
      customerId={customer.id}
      customerName={customer.name}
      orgId={customer.org_id}
    />
  )
}
