import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import ProductsCatalog from '@/components/settings/ProductsCatalog'
import type { Profile } from '@/types'
import { isAdminRole, canAccess } from '@/types'
import { Lock } from 'lucide-react'

export default async function ProductsSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'manage_settings')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:px-5 md:py-4 pb-20 md:pb-4">
          <div className="card text-center py-16 max-w-md mx-auto">
            <Lock size={36} className="mx-auto mb-3 text-text3" />
            <div className="text-lg font-700 text-text1">Access Restricted</div>
            <div className="text-sm text-text3 mt-1">Only admins can access settings.</div>
          </div>
        </main>
        <div className="md:hidden"><MobileNav /></div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main className="flex-1 overflow-y-auto p-4 md:px-5 md:py-4 pb-20 md:pb-4">
        <ProductsCatalog profile={profile as Profile} />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
