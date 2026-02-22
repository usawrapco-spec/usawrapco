import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import { InventoryClient } from '@/components/inventory/InventoryClient'
import { Lock } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const allowed = ['owner', 'admin', 'production', 'sales', 'sales_agent']
  if (!allowed.includes(profile.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
            <div className="card text-center py-16 max-w-md mx-auto">
              <Lock size={36} className="mx-auto mb-3 text-text3" />
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">You don't have permission to view inventory.</div>
            </div>
          </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <InventoryClient profile={profile as Profile} />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
