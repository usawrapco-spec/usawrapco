import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReferralList from '@/components/sales-portal/ReferralList'

export const dynamic = 'force-dynamic'

export default async function ReferralsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: referrals } = await supabase
    .from('sales_agent_referrals')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false })

  // Get unread message counts per referral
  const { data: unreadRows } = await supabase
    .from('sales_agent_messages')
    .select('referral_id')
    .eq('agent_id', user.id)
    .eq('read_agent', false)

  const unreadCounts: Record<string, number> = {}
  ;(unreadRows ?? []).forEach(r => {
    if (r.referral_id) unreadCounts[r.referral_id] = (unreadCounts[r.referral_id] || 0) + 1
  })

  return <ReferralList referrals={referrals ?? []} unreadCounts={unreadCounts} />
}
