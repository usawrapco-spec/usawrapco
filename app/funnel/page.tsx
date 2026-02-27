export const dynamic = 'force-dynamic'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import FunnelDashboard from '@/components/funnel/FunnelDashboard'

export default async function FunnelPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: sessions } = await admin
    .from('wrap_funnel_sessions')
    .select('*')
    .eq('org_id', ORG_ID)
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Barlow Condensed', sans-serif" }}>
              Wrap Funnel Analytics
            </h1>
            <p style={{ color: 'var(--text2)', margin: 0, fontSize: 14 }}>
              Track leads from <strong style={{ color: 'var(--text1)' }}>/start</strong> — step drop-off, conversions, UTM sources, booked consultations
            </p>
          </div>
          <FunnelDashboard sessions={sessions || []} />
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
