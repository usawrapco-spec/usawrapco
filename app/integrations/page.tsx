import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import IntegrationsClient from '@/components/integrations/IntegrationsClient'

export default async function IntegrationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin for profile lookup (reliable even if anon RLS is strict)
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role)) {
    redirect('/dashboard')
  }

  // Load integration configs from org_config table using auth'd client
  // RLS policy automatically filters to this user's org
  let integrations: any[] = []
  try {
    const { data: rows } = await supabase
      .from('org_config')
      .select('key, value')
      .like('key', 'integration_%')

    if (rows?.length) {
      integrations = rows.map((row: any) => {
        let config: any = {}
        try { config = JSON.parse(row.value || '{}') } catch {}
        return {
          integration_id: (row.key as string).replace('integration_', ''),
          config,
          enabled: true,
        }
      })
    }
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <IntegrationsClient profile={profile as Profile} initialIntegrations={integrations} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
