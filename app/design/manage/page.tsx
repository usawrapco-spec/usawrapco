import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { DesignStudioLayout } from '@/components/design/DesignStudioLayout'
import DesignManagerDashboard from '@/components/design/DesignManagerDashboard'
import { Lock } from 'lucide-react'
import type { Profile } from '@/types'

export default async function DesignManagePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const hasAccess = ['owner', 'admin', 'designer', 'production'].includes(profile.role)
  if (!hasAccess) {
    return (
      <DesignStudioLayout profile={profile as Profile}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <Lock size={36} color="var(--text3)" />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Access Restricted</div>
          <div style={{ fontSize: 14, color: 'var(--text3)' }}>Design Manager is for designers, production, and admins.</div>
        </div>
      </DesignStudioLayout>
    )
  }

  return (
    <DesignStudioLayout profile={profile as Profile}>
      <DesignManagerDashboard profile={profile as Profile} />
    </DesignStudioLayout>
  )
}
