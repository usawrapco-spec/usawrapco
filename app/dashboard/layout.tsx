import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import type { Profile } from '@/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use regular client only to verify the session
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client to fetch profile — bypasses RLS so it always works
  // regardless of whether RLS policies are set up correctly on the profiles table
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
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
