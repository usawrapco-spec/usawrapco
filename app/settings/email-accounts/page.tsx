import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import EmailAccountsClient from '@/components/settings/EmailAccountsClient'

export default async function EmailAccountsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (!['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const orgId = profile.org_id

  // Fetch connected email accounts for this org
  const { data: emailAccounts } = await admin
    .from('email_accounts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  // Fetch team members for assignment dropdown
  const { data: teamMembers } = await admin
    .from('profiles')
    .select('id, name, email, role')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <EmailAccountsClient
          profile={profile as Profile}
          emailAccounts={emailAccounts || []}
          teamMembers={teamMembers || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
