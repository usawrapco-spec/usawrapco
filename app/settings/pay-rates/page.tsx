export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import FlatRateGridClient from '@/components/settings/FlatRateGridClient'
import { DollarSign, Lock } from 'lucide-react'

export default async function PayRatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isAdmin = isAdminRole(profile.role)

  const { data: rates } = await admin
    .from('installer_flat_rates')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('sort_order')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                color: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <DollarSign size={20} />
              </div>
              <div>
                <h1 style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 26,
                  fontWeight: 900,
                  color: 'var(--text1)',
                  margin: 0,
                }}>
                  Installer Pay Rates
                </h1>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>
                  Flat rate grid — click any row to edit
                </p>
              </div>
            </div>

            {!isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                <Lock size={13} />
                View only
              </div>
            )}
          </div>

          <FlatRateGridClient
            initialRates={rates ?? []}
            isAdmin={isAdmin}
          />
        </div>
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
