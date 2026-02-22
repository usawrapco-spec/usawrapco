import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'

export default async function InvoicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="card max-w-sm text-center">
          <div className="font-700 text-text1 mb-2">Profile not found</div>
          <div className="text-sm text-text3">Contact your admin.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        {children}
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
