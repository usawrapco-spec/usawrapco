import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import MileageClient from '@/components/payroll/MileageClient'
import { ORG_ID } from '@/lib/org'

export default async function MileagePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  let employees: any[] = []
  if (isAdmin) {
    const { data } = await admin.from('profiles').select('id,name,email,role').eq('org_id', orgId).eq('active', true).order('name')
    employees = data || []
  }

  let jobs: any[] = []
  try {
    const { data } = await admin.from('projects').select('id,title').eq('org_id', orgId)
      .not('pipe_stage', 'eq', 'done').order('title').limit(200)
    jobs = data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <MileageClient profile={profile as Profile} employees={employees} jobs={jobs} />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
