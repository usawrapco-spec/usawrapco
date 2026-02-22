import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import ContactsClient from '@/components/contacts/ContactsClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function ContactsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let contacts: any[] = []
  try {
    const { data } = await admin
      .from('customers')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(500)
    contacts = data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <ContactsClient profile={profile as Profile} initialContacts={contacts} />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
