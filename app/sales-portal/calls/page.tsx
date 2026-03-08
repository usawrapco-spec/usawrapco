import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import CallHistory from '@/components/sales-portal/CallHistory'

export const dynamic = 'force-dynamic'

export default async function CallsPage() {
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

  // Recent calls with analyses
  const { data: calls } = await admin
    .from('call_logs')
    .select('id, direction, status, caller_name, caller_number, duration_seconds, recording_url, notes, created_at, transcription_status, analysis_status')
    .eq('org_id', profile.org_id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const callIds = (calls || []).map(c => c.id)
  let analyses: any[] = []
  if (callIds.length > 0) {
    const { data } = await admin
      .from('call_analyses')
      .select('call_log_id, score, sentiment, summary')
      .in('call_log_id', callIds)
    analyses = data || []
  }

  const analysisMap = new Map(analyses.map(a => [a.call_log_id, a]))
  const enriched = (calls || []).map(c => ({
    ...c,
    analysis: analysisMap.get(c.id) || null,
  }))

  return <CallHistory calls={enriched} />
}
