import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import DesignStudioPageClient from '@/components/design/DesignStudioPage'
import type { Profile } from '@/types'

export default async function DesignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Check permission
  const hasAccess = profile.role === 'admin' || profile.role === 'designer' || profile.role === 'sales'
  if (!hasAccess) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar profile={profile as Profile} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">You don&apos;t have permission to access Design Studio.</div>
            </div>
          </main>
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
          <DesignStudioPageClient
            profile={profile as Profile}
          />
        </main>
      </div>
    </div>
  )
}
