import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import PhonePageClient from '@/components/phone/PhonePageClient'

export default async function PhonePage() {
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

  const [
    { data: config },
    { data: departments },
    { data: agents },
    { data: callLogs },
    { data: profiles },
  ] = await Promise.all([
    admin.from('phone_system').select('*').eq('org_id', ORG_ID).single(),
    admin.from('phone_departments').select('*').eq('org_id', ORG_ID).order('sort_order'),
    admin.from('phone_agents').select('*, profile:profile_id(id, name, avatar_url, role), department:department_id(id, name)').eq('org_id', ORG_ID).order('round_robin_order'),
    admin.from('call_logs').select('*, department:department_id(name)').eq('org_id', ORG_ID).order('created_at', { ascending: false }).limit(50),
    admin.from('profiles').select('id, name, avatar_url, role').eq('org_id', ORG_ID).order('name'),
  ])

  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)

  return (
    <PhonePageClient
      profile={profile}
      initialConfig={config || null}
      initialDepartments={departments || []}
      initialAgents={agents || []}
      initialCallLogs={callLogs || []}
      allProfiles={profiles || []}
      twilioConfigured={twilioConfigured}
    />
  )
}
