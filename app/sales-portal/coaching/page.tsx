import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import CoachingDashboard from '@/components/sales-portal/CoachingDashboard'

export const dynamic = 'force-dynamic'

export default async function CoachingPage() {
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

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: analyses } = await admin
    .from('call_analyses')
    .select('score, sentiment, strengths, improvements, keywords, talk_ratio, coaching_feedback, created_at')
    .eq('agent_id', user.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  return <CoachingDashboard analyses={analyses || []} />
}
