import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerMessages from '@/components/portal/DealerMessages'

export const dynamic = 'force-dynamic'

export default async function DealerMessagesPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name, portal_token')
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  const { data: messages } = await supabase
    .from('dealer_messages')
    .select('id, channel, sender_type, sender_name, body, attachment_url, created_at, read_dealer')
    .eq('dealer_id', dealer.id)
    .order('created_at', { ascending: true })

  return (
    <DealerMessages
      dealerId={dealer.id}
      dealerName={dealer.name}
      initialMessages={(messages || []) as any}
    />
  )
}
