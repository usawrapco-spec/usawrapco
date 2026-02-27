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
  const from = sp.get('from')
  const to = sp.get('to')

  // Fetch completed/in-progress jobs with installer assigned
  let query = admin
    .from('projects')
    .select('id, title, pipe_stage, revenue, profit, gpm, installer_id, updated_at, created_at, installer:installer_id(id, name, email)')
    .eq('org_id', orgId)
    .not('installer_id', 'is', null)
    .in('pipe_stage', ['install', 'prod_review', 'sales_close', 'done'])

  if (from) query = query.gte('updated_at', from + 'T00:00:00')
  if (to) query = query.lte('updated_at', to + 'T23:59:59')

  query = query.order('updated_at', { ascending: false }).limit(200)
  const { data: jobs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get pay settings for all installers
  const installerIds = [...new Set((jobs || []).map((j: any) => j.installer_id).filter(Boolean))]
  let paySettings: any[] = []
  if (installerIds.length > 0) {
    const { data } = await admin
      .from('employee_pay_settings')
      .select('user_id, percent_job_rate, per_job_rate, pay_type')
      .in('user_id', installerIds)
    paySettings = data || []
  }

  const settingsMap: Record<string, any> = {}
  for (const s of paySettings) settingsMap[s.user_id] = s

  // Calculate pay per job
  const enriched = (jobs || []).map((job: any) => {
    const settings = settingsMap[job.installer_id] || {}
    const revenue = job.revenue || 0
    const payPct = settings.percent_job_rate || 0
    const perJob = settings.per_job_rate || 0
    const payType = settings.pay_type || 'hourly'

    let earnings = 0
    if (payPct > 0) earnings = revenue * (payPct / 100)
    else if (perJob > 0) earnings = perJob

    return {
      ...job,
      installer_name: job.installer?.name || 'Unassigned',
      installer_email: job.installer?.email || null,
      pay_pct: payPct,
      per_job_rate: perJob,
      installer_pay_type: payType,
      earnings,
    }
  })

  // Summary by installer
  const byInstaller: Record<string, { name: string; email: string | null; jobs: number; total_revenue: number; total_earnings: number }> = {}
  for (const job of enriched) {
    if (!byInstaller[job.installer_id]) {
      byInstaller[job.installer_id] = { name: job.installer_name, email: job.installer_email, jobs: 0, total_revenue: 0, total_earnings: 0 }
    }
    byInstaller[job.installer_id].jobs++
    byInstaller[job.installer_id].total_revenue += job.revenue || 0
    byInstaller[job.installer_id].total_earnings += job.earnings
  }

  return NextResponse.json({ jobs: enriched, by_installer: byInstaller })
}
