import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canAccess } from '@/types'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'
import type { Profile, Project } from '@/types'

export default async function PipelinePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) redirect('/login')

  // Only sales, production, admin see the full pipeline
  // Installers see only their jobs at install stage
  let query = supabase
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name),
      installer:installer_id(id, name),
      customer:customer_id(id, name)
    `)
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .neq('pipe_stage', 'done')

  if (profile.role === 'installer') {
    query = query.eq('installer_id', user.id)
  }

  const { data: projects } = await query

  return (
    <PipelineBoard
      profile={profile as Profile}
      initialProjects={(projects as Project[]) || []}
    />
  )
}
