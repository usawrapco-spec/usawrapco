import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { DesignStudioLayout } from '@/components/design/DesignStudioLayout'
import DesignIntakesClient from '@/components/design/DesignIntakesClient'
import { Lock } from 'lucide-react'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DesignIntakesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const hasAccess = ['owner', 'admin', 'designer', 'sales_agent', 'production'].includes(profile.role)
  if (!hasAccess) {
    return (
      <DesignStudioLayout profile={profile as Profile}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <Lock size={36} color="var(--text3)" />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Access Restricted</div>
        </div>
      </DesignStudioLayout>
    )
  }

  // Fetch referrals for admin users
  const isAdmin = ['owner', 'admin'].includes(profile.role)
  let referrals: any[] = []
  if (isAdmin) {
    const { data } = await admin
      .from('referral_tracking')
      .select('id, referral_code, status, commission_amount, referred_customer_id, paid_at, created_at')
      .order('created_at', { ascending: false })
    referrals = data || []
  }

  return (
    <DesignStudioLayout profile={profile as Profile}>
      <DesignIntakesClient profile={profile as Profile} referrals={referrals} />
    </DesignStudioLayout>
  )
}
