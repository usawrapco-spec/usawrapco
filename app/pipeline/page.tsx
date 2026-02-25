import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import UnifiedJobBoard from '@/components/pipeline/UnifiedJobBoard'
import type { Profile, Project } from '@/types'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function PipelinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let query = admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name, email),
      installer:installer_id(id, name, email),
      customer:customer_id(id, name, email)
    `)
    .eq('org_id', orgId)

  if (profile.role === 'installer') {
    query = query.eq('installer_id', user.id)
  }

  const { data: projects } = await query

  return (
    <UnifiedJobBoard
      profile={profile as Profile}
      initialProjects={(projects as Project[]) || []}
      orgId={orgId}
    />
  )
}
