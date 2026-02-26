import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import AIAgents from '../fleet/_components/AIAgents'

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <div className="anim-fade-up">
          <div style={{ marginBottom: 20 }}>
            <h1 style={{
              fontSize: 24, fontWeight: 900, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif', margin: 0,
            }}>
              AI Command Center
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
              4 specialized AI agents with full access to your shop data
            </p>
          </div>
          <AIAgents />
        </div>
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
