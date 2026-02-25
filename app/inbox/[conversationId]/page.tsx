import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Profile } from '@/types'
import CommHubClient from '@/components/comms/CommHubClient'

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string }
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

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <div className="hidden md:flex" style={{ flexShrink: 0, height: '100%' }}>
        <Sidebar profile={profile as Profile} />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, overflow: 'hidden', paddingBottom: 0 }}>
          <CommHubClient
            profile={profile as Profile}
            initialConversationId={params.conversationId}
          />
        </main>
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  )
}
