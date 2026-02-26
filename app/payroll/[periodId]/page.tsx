import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import PayPeriodDetailClient from '@/components/payroll/PayPeriodDetailClient'

export default async function PayPeriodDetailPage({
  params,
}: {
  params: { periodId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Admin-only page
  if (profile.role !== 'owner' && profile.role !== 'admin') redirect('/dashboard')

  const orgId = profile.org_id || ORG_ID

  // Fetch pay period
  const { data: period, error: periodErr } = await admin
    .from('pay_periods')
    .select('*')
    .eq('id', params.periodId)
    .eq('org_id', orgId)
    .single()

  if (periodErr || !period) redirect('/payroll')

  // Fetch payroll records for this period
  const { data: records } = await admin
    .from('payroll_records')
    .select('*, employee:user_id(id, name, email, role, division, avatar_url)')
    .eq('pay_period_id', params.periodId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  // Fetch time_clock_entries for the period date range
  const { data: timeEntries } = await admin
    .from('time_clock_entries')
    .select('*, user:user_id(id, name), job:job_id(id, title, vehicle_desc)')
    .eq('org_id', orgId)
    .gte('clock_in', `${period.period_start}T00:00:00`)
    .lte('clock_in', `${period.period_end}T23:59:59`)
    .order('clock_in', { ascending: true })

  // Fetch work summaries for the period
  const { data: workSummaries } = await admin
    .from('work_summaries')
    .select('*')
    .eq('org_id', orgId)
    .gte('summary_date', period.period_start)
    .lte('summary_date', period.period_end)

  // Fetch employee pay settings
  const { data: paySettings } = await admin
    .from('employee_pay_settings')
    .select('*')
    .eq('org_id', orgId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <PayPeriodDetailClient
          profile={profile as Profile}
          period={period}
          records={records || []}
          timeEntries={timeEntries || []}
          workSummaries={workSummaries || []}
          paySettings={paySettings || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
