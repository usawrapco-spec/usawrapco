import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHome from '@/components/sales-portal/DashboardHome'

export const dynamic = 'force-dynamic'

export default async function SalesPortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, org_id, role, xp, level')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Parallel data fetches
  const [
    { data: lists },
    { data: referrals },
    { data: todayTasks },
    { data: todayCalls },
    { data: recentAnalyses },
    { data: callbackLeads },
  ] = await Promise.all([
    // Active lead lists
    supabase.from('sales_agent_lists')
      .select('id, name, total_count, called_count, status')
      .eq('agent_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent referrals
    supabase.from('sales_agent_referrals')
      .select('id, customer_name, vehicle_desc, status, commission_amount, service_type, created_at')
      .eq('agent_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),

    // Today's tasks
    supabase.from('agent_daily_tasks')
      .select('id, title, type, priority, status, description, related_lead_id, related_call_id')
      .eq('agent_id', profile.id)
      .eq('task_date', today)
      .order('priority', { ascending: true })
      .limit(20),

    // Today's calls
    supabase.from('call_logs')
      .select('id, direction, duration, status, created_at')
      .eq('agent_id', profile.id)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false }),

    // Recent unreviewed AI analyses
    supabase.from('call_analyses')
      .select('id, score, summary, coaching_feedback, reviewed_by_agent, created_at')
      .eq('agent_id', profile.id)
      .eq('reviewed_by_agent', false)
      .order('created_at', { ascending: false })
      .limit(5),

    // Upcoming callbacks
    supabase.from('sales_agent_list_leads')
      .select('id, name, company, phone, next_callback, list_id')
      .in('list_id', (await supabase
        .from('sales_agent_lists')
        .select('id')
        .eq('agent_id', profile.id)
      ).data?.map(l => l.id) ?? [])
      .eq('status', 'callback')
      .not('next_callback', 'is', null)
      .lte('next_callback', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order('next_callback', { ascending: true })
      .limit(10),
  ])

  const stats = {
    callsToday: todayCalls?.length ?? 0,
    totalTalkTime: (todayCalls ?? []).reduce((s, c) => s + (c.duration ?? 0), 0),
    activeReferrals: (referrals ?? []).filter(r => !['complete', 'paid', 'cancelled'].includes(r.status)).length,
    pendingTasks: (todayTasks ?? []).filter(t => t.status === 'pending').length,
    completedTasks: (todayTasks ?? []).filter(t => t.status === 'done').length,
    unreviewed: recentAnalyses?.length ?? 0,
    leadsRemaining: (lists ?? []).reduce((s, l) => s + (l.total_count - l.called_count), 0),
  }

  return (
    <DashboardHome
      profile={profile}
      stats={stats}
      lists={lists ?? []}
      referrals={referrals ?? []}
      tasks={todayTasks ?? []}
      callbackLeads={callbackLeads ?? []}
      analyses={recentAnalyses ?? []}
    />
  )
}
