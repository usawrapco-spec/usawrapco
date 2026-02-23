import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileErr } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) {
    console.error('[layout] profile fetch failed for user', user.id, profileErr?.message)
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="card max-w-sm text-center">
          <div className="font-700 text-text1 mb-2">Profile not found</div>
          <div className="text-sm text-text3">
            {profileErr?.message
              ? `DB error: ${profileErr.message}`
              : 'Your account was created but no profile row exists. Contact your admin.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <div className="hidden md:block">
        <TopNav profile={profile as Profile} />
      </div>
      <main className="flex-1 overflow-y-auto p-4 md:px-5 md:py-4 pb-20 md:pb-4">
        {children}
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
