import { ORG_ID } from '@/lib/org'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`

  // YTD payroll
  const { data: runsYTD } = await admin
    .from('payroll_runs')
    .select('total_gross, status')
    .eq('org_id', orgId)
    .gte('period_start', yearStart)
    .in('status', ['processed', 'paid'])

  const ytdTotal = (runsYTD || []).reduce((s: number, r: any) => s + (r.total_gross || 0), 0)

  // Most recent run
  const { data: currentRun } = await admin
    .from('payroll_runs')
    .select('id, period_start, period_end, pay_date, status, total_gross, employee_count')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  // Active employees
  const { count: activeCount } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('active', true)
    .in('role', ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer'])

  // Next payroll date — biweekly anchor Jan 5 2026
  const anchor = new Date('2026-01-05')
  const today = new Date()
  const msSinceAnchor = today.getTime() - anchor.getTime()
  const daysSinceAnchor = Math.floor(msSinceAnchor / 86_400_000)
  const periodNum = Math.floor(daysSinceAnchor / 14)
  const nextPayDate = new Date(anchor.getTime() + (periodNum + 1) * 14 * 86_400_000)
  const nextPayDateStr = nextPayDate.toISOString().split('T')[0]

  return NextResponse.json({
    currentPeriodTotal: currentRun?.total_gross || 0,
    currentPeriodStatus: currentRun?.status || null,
    currentPeriodStart: currentRun?.period_start || null,
    currentPeriodEnd: currentRun?.period_end || null,
    ytdTotal,
    activeEmployees: activeCount || 0,
    nextPayrollDate: nextPayDateStr,
  })
}
