import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import type { Profile, Project } from '@/types'

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
      customer:customer_id(id,name,email,phone,company_name,lifetime_spend)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <ProjectDetail
            profile={profile as Profile}
            project={project as Project}
            teammates={teammates || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
