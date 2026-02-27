import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import BatchImportClient from '@/components/import/BatchImportClient'

export default async function ImportJobsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (!isAdminRole(profile.role)) redirect('/dashboard')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 100 }}>
        <BatchImportClient profile={profile as Profile} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
