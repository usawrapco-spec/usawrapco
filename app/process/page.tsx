import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import ProcessPageClient from '@/components/process/ProcessPage'

export const dynamic = 'force-dynamic'

export default async function ProcessPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, padding: '24px 20px', paddingBottom: 80 }}>
        <ProcessPageClient />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
