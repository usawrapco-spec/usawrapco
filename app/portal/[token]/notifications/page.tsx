import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import PortalNotificationsClient from '@/components/portal/PortalNotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('portal_token', token)
    .single()

  if (!customer) redirect('/portal/login')

  const { data: notifications } = await supabase
    .from('portal_notifications')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mark all as read
  await supabase
    .from('portal_notifications')
    .update({ read: true })
    .eq('customer_id', customer.id)
    .eq('read', false)

  return (
    <PortalNotificationsClient
      notifications={notifications || []}
      token={token}
    />
  )
}
