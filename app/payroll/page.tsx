import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import PayrollClient from '@/components/payroll/PayrollClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function PayrollPage() {
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

  // Fetch employees
  let employees: any[] = []
  try {
    const { data } = await admin
      .from('profiles')
      .select('id, name, email, role, active, division')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('name')
    employees = data || []
  } catch {}

  // Fetch closed projects for commission calc
  let closedProjects: any[] = []
  try {
    const { data } = await admin
      .from('projects')
      .select('id, title, agent_id, installer_id, revenue, profit, gpm, commission, pipe_stage, division, fin_data, created_at, updated_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(500)
    closedProjects = data || []
  } catch {}

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <PayrollClient profile={profile as Profile} employees={employees} projects={closedProjects} />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
