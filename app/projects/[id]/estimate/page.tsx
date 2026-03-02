import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import ProjectDocView from '@/components/projects/docs/ProjectDocView'
import type { Profile } from '@/types'

export default async function EstimateDocPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  const { data: project } = await admin
    .from('projects')
    .select('*, agent:agent_id(id,name,email), installer:installer_id(id,name,email), designer:designer_id(id,name,email), customer:customer_id(id,name,email,phone,company_name)')
    .eq('id', params.id)
    .eq('org_id', orgId)
    .single()

  if (!project) notFound()

  const { data: lineItems } = await admin
    .from('line_items')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <ProjectDocView project={project} lineItems={lineItems || []} type="estimate" profile={profile as Profile} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
