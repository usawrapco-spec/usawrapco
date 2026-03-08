import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommsPage from '@/components/sales-portal/CommsPage'

export const dynamic = 'force-dynamic'

export default async function CommunicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get SMS templates
  const { data: templates } = await supabase
    .from('sms_templates')
    .select('id, name, body, category')
    .order('name')

  // Get recent conversations assigned to this agent
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, customer_name, customer_phone, customer_email, channel, last_message, last_message_at, starred')
    .eq('assigned_to', user.id)
    .order('last_message_at', { ascending: false })
    .limit(50)

  return (
    <CommsPage
      templates={templates ?? []}
      conversations={conversations ?? []}
    />
  )
}
