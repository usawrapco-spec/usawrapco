import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import CommHubClient from '@/components/comms/CommHubClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { customerId?: string }
}) {
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

  const orgId = profile.org_id || ORG_ID

  const [
    { data: conversations },
    { data: templates },
    { data: smsTemplates },
    { data: teammates },
  ] = await Promise.all([
    admin
      .from('conversations')
      .select('*')
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100),
    admin.from('email_templates').select('*').eq('org_id', orgId),
    admin.from('sms_templates').select('*').eq('org_id', orgId).order('name'),
    admin
      .from('profiles')
      .select('id, name, role')
      .eq('org_id', orgId)
      .neq('id', user.id)
      .order('name'),
  ])

  // If coming from a job card, pre-select the conversation for that customer
  let initialConversationId: string | undefined
  if (searchParams.customerId) {
    const match = (conversations || []).find(
      (c) => c.customer_id === searchParams.customerId
    )
    if (match) initialConversationId = match.id
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <CommHubClient
          profile={profile as Profile}
          initialConversationId={initialConversationId}
          initialConversations={conversations || []}
          initialTemplates={templates || []}
          initialSmsTemplates={smsTemplates || []}
          initialTeammates={teammates || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
