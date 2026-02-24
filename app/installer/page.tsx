import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import InstallerDashboardClient from '@/components/installer/InstallerDashboardClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function InstallerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  // Fetch profile
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch assigned projects with customer join
  const { data: projects } = await admin
    .from('projects')
    .select('id, title, customer_id, vehicle_desc, install_date, status, pipe_stage, customer:customer_id(id, name)')
    .eq('installer_id', user.id)
    .eq('org_id', orgId)
    .in('status', ['active', 'in_production', 'install_scheduled', 'installed', 'qc', 'closing'])
    .order('install_date', { ascending: true, nullsFirst: false })
    .limit(50)

  // Fetch time entries for this employee
  const { data: timeEntries } = await admin
    .from('time_entries')
    .select('id, org_id, employee_id, clock_in, clock_out, break_minutes, total_hours, notes')
    .eq('employee_id', user.id)
    .order('clock_in', { ascending: false })
    .limit(100)

  // Map time_entries DB rows to the prop interface expected by the client
  const mappedTimeEntries = (timeEntries || []).map((te: any) => ({
    id: te.id,
    job_id: '', // time_entries don't have job_id; will be empty
    started_at: te.clock_in,
    ended_at: te.clock_out || null,
    duration_minutes: te.total_hours ? Math.round(te.total_hours * 60) : null,
    notes: te.notes || null,
  }))

  // Map projects to the expected shape (flatten Supabase join)
  const mappedJobs = (projects || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    customer_id: p.customer_id,
    vehicle_desc: p.vehicle_desc,
    install_date: p.install_date,
    status: p.status,
    pipe_stage: p.pipe_stage,
    customer: p.customer || undefined,
  }))

  return (
    <InstallerDashboardClient
      profile={{
        id: profile.id,
        name: profile.name,
        role: profile.role,
        org_id: profile.org_id || ORG_ID,
      }}
      jobs={mappedJobs}
      timeEntries={mappedTimeEntries}
    />
  )
}
