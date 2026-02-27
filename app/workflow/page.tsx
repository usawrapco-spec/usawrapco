export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import WrapJobWorkflow from '@/components/engine/WrapJobWorkflow'

export default async function WorkflowPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: projects } = await admin.from('projects')
    .select('*, customer:customer_id(id, name), agent:agent_id(id, name)')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <WrapJobWorkflow profile={profile as Profile} initialProjects={projects || []} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
