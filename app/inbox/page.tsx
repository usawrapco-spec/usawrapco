import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import InboxClient from '@/components/inbox/InboxClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function InboxPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch customers for conversation list
  let customers: any[] = []
  try {
    const { data } = await admin
      .from('customers')
      .select('id, name, email, phone, company, status, contact_name, company_name')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(100)
    customers = data || []
  } catch {}

  // Fetch recent communications
  let communications: any[] = []
  try {
    const { data } = await admin
      .from('customer_communications')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500)
    communications = data || []
  } catch {}

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-hidden pb-20 md:pb-0">
          <InboxClient
            profile={profile as Profile}
            customers={customers}
            communications={communications}
          />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
