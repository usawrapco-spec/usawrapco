import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import EnginePageClient from '@/components/engine/EnginePageClient'

export default async function EnginePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  const [
    { data: projects },
    { data: prospects },
    { data: workflows },
  ] = await Promise.all([
    admin
      .from('projects')
      .select('id, title, status, pipe_stage, revenue, profit, form_data, customer:customer_id(name), agent:agent_id(id, name), created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('prospects')
      .select('id, status, score, business_name, company, name, email, phone, estimated_revenue, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <EnginePageClient
          profile={profile as Profile}
          initialProjects={projects || []}
          initialProspects={prospects || []}
          initialWorkflows={workflows || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
