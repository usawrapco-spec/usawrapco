import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import OrderEditor from '@/components/projects/OrderEditor'
import type { Profile, Project } from '@/types'

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      agent:agent_id(id,name,email),
      installer:installer_id(id,name,email),
      customer:customer_id(id,name,email)
    `)
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .single()

  if (error || !project) notFound()

  const { data: teammates } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('org_id', profile.org_id)
    .eq('active', true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <OrderEditor
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
