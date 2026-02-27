import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const sp = req.nextUrl.searchParams
  const runId = sp.get('run_id')
  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`

  // Get all active employees
  const { data: employees } = await admin
    .from('profiles')
    .select('id, name, email, role, avatar_url')
    .eq('org_id', orgId)
    .eq('active', true)
    .in('role', ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer'])
    .order('name')

  if (!employees) return NextResponse.json({ employees: [] })

  // Get pay settings for all employees
  const { data: paySettings } = await admin
    .from('employee_pay_settings')
    .select('user_id, pay_type, hourly_rate, salary_amount, salary_period, per_job_rate, percent_job_rate, commission_rate, overtime_eligible, pay_period_type, worker_type')
    .eq('org_id', orgId)

  const settingsMap: Record<string, any> = {}
  for (const s of paySettings || []) settingsMap[s.user_id] = s

  // YTD line items (all paid runs this year)
  const { data: ytdRuns } = await admin
    .from('payroll_runs')
    .select('id')
    .eq('org_id', orgId)
    .gte('period_start', yearStart)
    .in('status', ['processed', 'paid'])

  const ytdRunIds = (ytdRuns || []).map((r: any) => r.id)
  let ytdByUser: Record<string, number> = {}
  if (ytdRunIds.length > 0) {
    const { data: ytdItems } = await admin
      .from('payroll_line_items')
      .select('user_id, amount')
      .in('payroll_run_id', ytdRunIds)
    for (const item of ytdItems || []) {
      ytdByUser[item.user_id] = (ytdByUser[item.user_id] || 0) + (item.amount || 0)
    }
  }

  // Current period line items
  let periodByUser: Record<string, number> = {}
  if (runId) {
    const { data: periodItems } = await admin
      .from('payroll_line_items')
      .select('user_id, amount')
      .eq('payroll_run_id', runId)
    for (const item of periodItems || []) {
      periodByUser[item.user_id] = (periodByUser[item.user_id] || 0) + (item.amount || 0)
    }
  }

  const result = (employees || []).map((emp: any) => {
    const settings = settingsMap[emp.id] || null
    return {
      ...emp,
      pay_type: settings?.pay_type || 'hourly',
      hourly_rate: settings?.hourly_rate || 0,
      salary_amount: settings?.salary_amount || 0,
      salary_period: settings?.salary_period || 'annual',
      commission_rate: settings?.commission_rate || 0,
      percent_job_rate: settings?.percent_job_rate || 0,
      worker_type: settings?.worker_type || 'employee',
      pay_period_type: settings?.pay_period_type || 'biweekly',
      period_pay: periodByUser[emp.id] || 0,
      ytd_pay: ytdByUser[emp.id] || 0,
      has_settings: !!settings,
    }
  })

  return NextResponse.json({ employees: result })
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const body = await req.json()
  const { user_id, ...fields } = body
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data: existing } = await admin.from('employee_pay_settings').select('id').eq('user_id', user_id).eq('org_id', orgId).single()
  let result
  if (existing) {
    result = await admin.from('employee_pay_settings').update({ ...fields, updated_at: new Date().toISOString() }).eq('user_id', user_id).eq('org_id', orgId).select().single()
  } else {
    result = await admin.from('employee_pay_settings').insert({ org_id: orgId, user_id, ...fields }).select().single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ settings: result.data })
}
