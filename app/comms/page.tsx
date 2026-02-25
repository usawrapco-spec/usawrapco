import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import CommsClient from '@/components/comms/CommsClient'

export const dynamic = 'force-dynamic'

export default async function CommsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28, fontWeight: 900, color: 'var(--text1)', margin: 0, letterSpacing: '-0.02em',
          }}>
            Communications
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            SMS, calls, and emails — all in one place
          </p>
        </div>
        <CommsClient profile={profile} />
      </main>
    </div>
  )
}
