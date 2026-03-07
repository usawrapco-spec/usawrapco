import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const today = new Date().toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00`

    // Today's calls
    const { count: todayCalls } = await admin
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart)

    // Today's talk time
    const { data: callDurations } = await admin
      .from('call_logs')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', todayStart)

    const talkMinutes = Math.round(
      (callDurations || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60
    )

    // Active referrals
    const { count: activeReferrals } = await admin
      .from('sales_agent_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', user.id)
      .not('status', 'in', '("complete","paid","cancelled")')

    // Pending tasks today
    const { count: pendingTasks } = await admin
      .from('agent_daily_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', user.id)
      .eq('task_date', today)
      .in('status', ['pending', 'in_progress'])

    // Remaining leads (pending across all active lists)
    const { count: remainingLeads } = await admin
      .from('sales_agent_list_leads')
      .select('*, sales_agent_lists!inner(agent_id, status)', { count: 'exact', head: true })
      .eq('sales_agent_lists.agent_id', user.id)
      .eq('sales_agent_lists.status', 'active')
      .eq('status', 'pending')

    return NextResponse.json({
      todayCalls: todayCalls || 0,
      talkMinutes,
      activeReferrals: activeReferrals || 0,
      pendingTasks: pendingTasks || 0,
      remainingLeads: remainingLeads || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
