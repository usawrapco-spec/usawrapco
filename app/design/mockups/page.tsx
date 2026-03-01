import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { DesignStudioLayout } from '@/components/design/DesignStudioLayout'
import MockupsClient from './MockupsClient'
import { Lock } from 'lucide-react'
import type { Profile } from '@/types'

export const metadata = {
  title: 'AI Mockups — Design Studio',
}

export default async function MockupsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const hasAccess = ['owner', 'admin', 'designer', 'sales_agent', 'production'].includes(profile.role)
  if (!hasAccess) {
    return (
      <DesignStudioLayout profile={profile as Profile}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            gap: 12,
          }}
        >
          <Lock size={36} color="var(--text3)" />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Access Restricted</div>
          <div style={{ fontSize: 14, color: 'var(--text3)' }}>
            You don&apos;t have permission to access AI Mockups.
          </div>
        </div>
      </DesignStudioLayout>
    )
  }

  return (
    <DesignStudioLayout profile={profile as Profile}>
      <MockupsClient />
    </DesignStudioLayout>
  )
}
