import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import MockupToolClient from '@/components/mockup/MockupToolClient'

interface Props {
  searchParams: { projectId?: string; year?: string; make?: string; model?: string }
}

export default async function MockupPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const allowed = ['owner', 'admin', 'designer', 'sales_agent', 'production']
  if (!isAdminRole(profile.role) && !allowed.includes(profile.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Access restricted</div>
          </div>
        </main>
        <div className="md:hidden"><MobileNav /></div>
      </div>
    )
  }

  // If projectId provided, pre-fetch vehicle data from project
  let defaultYear = searchParams.year || ''
  let defaultMake = searchParams.make || ''
  let defaultModel = searchParams.model || ''

  if (searchParams.projectId && (!defaultYear || !defaultMake)) {
    try {
      const admin = getSupabaseAdmin()
      const { data: project } = await admin
        .from('projects')
        .select('vehicle_desc, form_data')
        .eq('id', searchParams.projectId)
        .single()
      if (project?.form_data) {
        const fd = project.form_data as Record<string, string>
        if (!defaultYear) defaultYear = fd.vehicle_year || ''
        if (!defaultMake) defaultMake = fd.vehicle_make || ''
        if (!defaultModel) defaultModel = fd.vehicle_model || ''
      }
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <MockupToolClient
          profile={profile as Profile}
          defaultProjectId={searchParams.projectId}
          defaultYear={defaultYear}
          defaultMake={defaultMake}
          defaultModel={defaultModel}
        />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
