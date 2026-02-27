export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import SourcingWorkflow from '@/components/sourcing/SourcingWorkflow'

export default async function SourcingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Load sourcing orders — gracefully handle if table doesn't exist yet
  let orders: any[] = []
  try {
    const { data } = await admin.from('sourcing_orders')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(500)
    orders = data || []
  } catch {
    orders = []
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <SourcingWorkflow profile={profile as Profile} initialOrders={orders} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
