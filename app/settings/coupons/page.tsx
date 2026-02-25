import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import CouponsManager from '@/components/settings/CouponsManager'
import type { Profile } from '@/types'
import { isAdminRole, canAccess } from '@/types'
import { Lock } from 'lucide-react'

export default async function CouponsSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'manage_settings')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:px-5 md:py-4 pb-20 md:pb-4">
          <div className="card text-center py-16 max-w-md mx-auto">
            <Lock size={36} className="mx-auto mb-3 text-text3" />
            <div className="text-lg font-700 text-text1">Access Restricted</div>
            <div className="text-sm text-text3 mt-1">Only admins can access settings.</div>
          </div>
        </main>
        <div className="md:hidden"><MobileNav /></div>
      </div>
    )
  }

  // Load coupons + redemptions
  const [couponsRes, redemptionsRes, customersRes] = await Promise.all([
    admin.from('coupons').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false }),
    admin.from('coupon_redemptions').select('*, coupon:coupons(code, title), customer:customers(id, name, email)').eq('org_id', profile.org_id).order('redeemed_at', { ascending: false }),
    admin.from('customers').select('id, name, email').eq('org_id', profile.org_id).order('name'),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main className="flex-1 overflow-y-auto p-4 md:px-5 md:py-4 pb-20 md:pb-4">
        <CouponsManager
          profile={profile as Profile}
          initialCoupons={couponsRes.data || []}
          initialRedemptions={redemptionsRes.data || []}
          customers={customersRes.data || []}
        />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
