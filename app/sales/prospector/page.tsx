import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import ProspectorApp from '@/components/prospector/ProspectorApp'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function ProspectorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load prospects
  let prospects: any[] = []
  try {
    const { data } = await admin
      .from('prospects')
      .select('*, assignee:assigned_to(id, name)')
      .eq('org_id', orgId)
      .order('ai_score', { ascending: false })
      .limit(1000)
    prospects = data || []
  } catch { prospects = [] }

  // Load routes
  let routes: any[] = []
  try {
    const { data } = await admin
      .from('prospecting_routes')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    routes = data || []
  } catch { routes = [] }

  // Load campaigns
  let campaigns: any[] = []
  try {
    const { data } = await admin
      .from('prospecting_campaigns')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    campaigns = data || []
  } catch { campaigns = [] }

  // Load team members for assignment
  let team: any[] = []
  try {
    const { data } = await admin
      .from('profiles')
      .select('id, name, email, role')
      .eq('org_id', orgId)
    team = data || []
  } catch { team = [] }

  return (
    <ProspectorApp
      profile={profile as Profile}
      initialProspects={prospects}
      initialRoutes={routes}
      initialCampaigns={campaigns}
      team={team}
    />
  )
}
