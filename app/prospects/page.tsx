export const dynamic = 'force-dynamic'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import ProspectsClient from '@/components/prospects/ProspectsClient'

export default async function ProspectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Load prospects — try prospects table, fallback to empty array
  let prospects: any[] = []
  try {
    const { data } = await admin
      .from('prospects')
      .select('*, assignee:assigned_to(id, name)')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(500)
    prospects = data || []
  } catch {
    prospects = []
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <ProspectsClient profile={profile as Profile} initialProspects={prospects} />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
