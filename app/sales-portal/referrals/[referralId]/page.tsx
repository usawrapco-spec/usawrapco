import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ReferralDetail from '@/components/sales-portal/ReferralDetail'

export const dynamic = 'force-dynamic'

export default async function ReferralDetailPage({ params }: { params: { referralId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: referral } = await supabase
    .from('sales_agent_referrals')
    .select('*')
    .eq('id', params.referralId)
    .eq('agent_id', user.id)
    .single()

  if (!referral) notFound()

  const { data: messages } = await supabase
    .from('sales_agent_messages')
    .select('*')
    .eq('referral_id', params.referralId)
    .order('created_at', { ascending: true })

  // Mark messages as read
  await supabase
    .from('sales_agent_messages')
    .update({ read_agent: true })
    .eq('referral_id', params.referralId)
    .eq('read_agent', false)

  return (
    <ReferralDetail
      referral={referral}
      messages={messages ?? []}
      agentName={profile.name}
    />
  )
}
