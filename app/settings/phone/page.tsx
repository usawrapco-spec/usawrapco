import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import PhoneSettingsClient from '@/components/settings/PhoneSettingsClient'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function PhoneSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Admin-only access
  if (!isAdminRole(profile.role)) redirect('/dashboard')

  // Fetch phone numbers
  const { data: phoneNumbers } = await admin
    .from('phone_numbers')
    .select('*')
    .eq('org_id', profile.org_id || ORG_ID)
    .order('created_at', { ascending: false })

  // Fetch team members for assignment dropdown
  const { data: teamMembers } = await admin
    .from('profiles')
    .select('id, name, email, role, phone, avatar_url')
    .eq('org_id', profile.org_id || ORG_ID)
    .eq('active', true)
    .order('name')

  // Fetch Twilio integration status from integrations table
  const { data: twilioIntegration } = await admin
    .from('integrations')
    .select('*')
    .eq('org_id', profile.org_id || ORG_ID)
    .eq('provider', 'twilio')
    .single()

  // Fetch record-all-calls setting
  const { data: recordSetting } = await admin
    .from('shop_settings')
    .select('*')
    .eq('org_id', profile.org_id || ORG_ID)
    .eq('key', 'twilio_record_all_calls')
    .single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <PhoneSettingsClient
          profile={profile as Profile}
          phoneNumbers={phoneNumbers || []}
          teamMembers={teamMembers || []}
          twilioIntegration={twilioIntegration || null}
          recordAllCalls={recordSetting?.value === 'true'}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
