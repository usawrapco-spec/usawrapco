import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole, canAccess } from '@/types'
import type { Profile } from '@/types'
import VisibilitySettings from '@/components/settings/VisibilitySettings'
import { Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function VisibilitySettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'manage_settings')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Link href="/settings" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--surface)', border: '1px solid rgba(90,96,128,.2)',
              color: 'var(--text2)', textDecoration: 'none',
            }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 24, fontWeight: 900,
                color: 'var(--text1)', margin: 0,
              }}>
                Visibility Settings
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>
                Control cross-department pipeline visibility
              </p>
            </div>
          </div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid rgba(90,96,128,.2)',
            borderRadius: 12,
            padding: 20,
          }}>
            <VisibilitySettings orgId={profile.org_id} />
          </div>
        </div>
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
