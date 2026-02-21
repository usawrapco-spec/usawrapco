import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, Project } from '@/types'
import JobsClient from '@/components/jobs/JobsClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function JobsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID
  let projects: Project[] = []
  try {
    const { data } = await admin
      .from('projects')
      .select('*, agent:agent_id(id, name, email), installer:installer_id(id, name, email)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)
    projects = (data as Project[]) || []
  } catch {}

  return <JobsClient profile={profile as Profile} initialJobs={projects} />
}
