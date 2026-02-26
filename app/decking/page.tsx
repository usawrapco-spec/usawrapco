import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, Project } from '@/types'
import DeckingPipelineClient from '@/components/pipeline/DeckingPipeline'

export default async function DeckingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  const { data: projects } = await admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name, email),
      installer:installer_id(id, name, email),
      customer:customer_id(id, name, email)
    `)
    .eq('org_id', orgId)
    .eq('service_division', 'decking')
    .neq('status', 'cancelled')

  return (
    <DeckingPipelineClient
      profile={profile as Profile}
      initialProjects={(projects || []) as Project[]}
      orgId={orgId}
    />
  )
}
