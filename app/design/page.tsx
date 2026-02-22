import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import DesignStudioPageClient from '@/components/design/DesignStudioPage'
import { Lock } from 'lucide-react'
import type { Profile } from '@/types'

export default async function DesignPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Check permission — owner/admin always have access
  const hasAccess = profile.role === 'owner' || profile.role === 'admin' || profile.role === 'designer' || profile.role === 'sales' || profile.role === 'sales_agent' || profile.role === 'production'
  if (!hasAccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Lock size={36} className="mx-auto mb-3 text-text3" />
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">You don&apos;t have permission to access Design Studio.</div>
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
          <DesignStudioPageClient
            profile={profile as Profile}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
