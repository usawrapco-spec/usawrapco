export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import { CatchLogClient } from '@/components/fishing/CatchLogClient'

export default async function CatchLogPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [catchRes, speciesRes, spotsRes] = await Promise.all([
    admin.from('catch_log')
      .select('*')
      .eq('user_id', user.id)
      .order('catch_date', { ascending: false })
      .limit(200),
    admin.from('fish_species').select('id, common_name, category').order('common_name'),
    admin.from('fishing_spots').select('id, name, region').order('name'),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <CatchLogClient
          userId={user.id}
          catches={catchRes.data ?? []}
          species={speciesRes.data ?? []}
          spots={spotsRes.data ?? []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
