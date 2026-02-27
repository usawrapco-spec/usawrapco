export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import MonitorClient from '@/components/sourcing/MonitorClient'

export default async function MonitorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let rfqs: any[] = []
  try {
    const { data } = await admin.from('sourcing_orders')
      .select('*').eq('org_id', profile.org_id)
      .in('status', ['monitoring', 'matched', 'new'])
      .order('created_at', { ascending: false }).limit(100)
    rfqs = data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <MonitorClient profile={profile as Profile} initialRfqs={rfqs} />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
