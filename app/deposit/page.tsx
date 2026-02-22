import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import DepositClient from '@/components/deposit/DepositClient'

export default async function DepositPage({ searchParams }: { searchParams: { conversation_id?: string; amount?: string } }) {
  // This page can be accessed by both logged-in users and public (via link from V.I.N.Y.L.)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = getSupabaseAdmin()
  let profile: any = null
  if (user) {
    const { data } = await admin.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  // Load conversation context if provided
  let conversation: any = null
  if (searchParams.conversation_id) {
    try {
      const { data } = await admin.from('conversations')
        .select('*')
        .eq('id', searchParams.conversation_id)
        .single()
      conversation = data
    } catch {}
  }

  const amount = searchParams.amount ? parseInt(searchParams.amount) : 250

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      {profile && <TopNav profile={profile as Profile} />}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <DepositClient
          amount={amount}
          conversationId={searchParams.conversation_id || null}
          conversation={conversation}
        />
      </main>
      {profile && <div className="md:hidden"><MobileNav /></div>}
    </div>
  )
}
