import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import DeckForgeProjectsClient from '@/components/deckforge/DeckForgeProjectsClient'
import type { Profile } from '@/types'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export default async function DeckforgePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <DeckForgeProjectsClient />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
