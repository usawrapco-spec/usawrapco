export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import Link from 'next/link'

export default async function ProofsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const { data: proofs } = await admin
    .from('design_proofs')
    .select('*, project:project_id(id, title, vehicle_desc)')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28, fontWeight: 900, color: 'var(--text1)',
            marginBottom: 20,
          }}>
            Design Proofs
          </h1>

          {(!proofs || proofs.length === 0) ? (
            <div style={{
              padding: 40, textAlign: 'center',
              background: 'var(--surface)', borderRadius: 12,
              border: '1px solid var(--border)',
            }}>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>No proofs yet. Proofs will appear here when created from design projects.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {proofs.map((proof: any) => (
                <div key={proof.id} style={{
                  background: 'var(--surface)', borderRadius: 12,
                  border: '1px solid var(--border)', overflow: 'hidden',
                }}>
                  {proof.image_url && (
                    <div style={{ height: 160, overflow: 'hidden' }}>
                      <img src={proof.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>
                      {(proof.project as any)?.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                      {(proof.project as any)?.vehicle_desc || ''}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      display: 'inline-block',
                      background: proof.status === 'approved' ? 'rgba(34,192,122,0.1)' : 'rgba(245,158,11,0.1)',
                      color: proof.status === 'approved' ? 'var(--green)' : 'var(--amber)',
                    }}>
                      {proof.status || 'pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
