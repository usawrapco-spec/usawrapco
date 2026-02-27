export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import BookingSettingsClient from '@/components/settings/BookingSettingsClient'
import { ORG_ID } from '@/lib/org'

export default async function BookingSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!['owner', 'admin'].includes(profile.role)) redirect('/settings')

  const orgId = profile.org_id || ORG_ID

  const { data: settings } = await admin
    .from('booking_settings')
    .select('*')
    .eq('org_id', orgId)
    .single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <BookingSettingsClient
          profile={profile as Profile}
          initialSettings={settings || null}
          orgId={orgId}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
