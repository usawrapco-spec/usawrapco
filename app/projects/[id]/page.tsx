import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import type { Profile, Project } from '@/types'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID
  let projectQuery = admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id,name,email),
      installer:installer_id(id,name,email),
      customer:customer_id(id,name,email)
    `)
    .eq('id', params.id)

  if (orgId) {
    projectQuery = projectQuery.eq('org_id', orgId)
  }

  const { data: project, error } = await projectQuery.single()

  if (error || !project) notFound()

  // Load teammates for assignment dropdowns
  const { data: teammates } = await admin
    .from('profiles')
    .select('id, name, role')
    .eq('org_id', orgId)
    .neq('role', 'viewer')

  // Fetch line items (from estimate/SO linked to this project)
  let lineItems: any[] = []
  try {
    const { data } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })
    lineItems = data || []
  } catch {}

  // Fetch activity log
  let activities: any[] = []
  try {
    const { data } = await admin
      .from('activity_log')
      .select('*')
      .eq('job_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100)
    activities = data || []
  } catch {}

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <ProjectDetail
            profile={profile as Profile}
            project={project as Project}
            teammates={teammates || []}
          />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
