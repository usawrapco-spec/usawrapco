import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import ImportJobsClient from '@/components/settings/ImportJobsClient'

export default async function ImportJobsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Only owner/admin can access
  if (!['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  // Load profiles for the "Assigned To" mapping
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, email, role')
    .eq('org_id', profile.org_id)
    .eq('active', true)
    .order('name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <ImportJobsClient
          profile={profile as Profile}
          teammates={profiles || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
