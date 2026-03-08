import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import CallDetail from '@/components/sales-portal/CallDetail'

export const dynamic = 'force-dynamic'

export default async function CallDetailPage({
  params,
}: {
  params: { callId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
    redirect('/login')

  const { data: call } = await admin
    .from('call_logs')
    .select('*')
    .eq('id', params.callId)
    .eq('org_id', profile.org_id)
    .single()

  if (!call) notFound()

  // Get analysis if exists
  const { data: analysis } = await admin
    .from('call_analyses')
    .select('*')
    .eq('call_log_id', params.callId)
    .single()

  return <CallDetail call={call} analysis={analysis} />
}
