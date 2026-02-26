import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import SmsTemplatesClient from '@/components/settings/SmsTemplatesClient'

export default async function SmsTemplatesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  const { data: templates } = await admin
    .from('sms_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingBottom: 80 }}>
        <SmsTemplatesClient
          profile={profile as Profile}
          templates={templates || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
