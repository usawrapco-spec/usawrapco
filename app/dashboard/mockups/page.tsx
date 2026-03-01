import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types'

export const metadata = { title: 'Mockup Leads' }

export default async function MockupLeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const allowedRoles = ['owner', 'admin', 'sales_agent']
  if (!allowedRoles.includes((profile as Profile).role)) {
    return (
      <div style={{ padding: 24, color: 'var(--text3)', fontSize: 14 }}>Access restricted.</div>
    )
  }

  const { data: mockups } = await admin
    .from('design_mockups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 800 }}>Mockup Leads</h1>
        <Link href="/wrap-wizard"
          style={{ background: '#64d2ff', color: '#000', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Open Wizard
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(mockups || []).map((m: any) => (
          <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            {m.render_images?.[0]?.[0] && (
              <img src={m.render_images[0][0]} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text1)', fontWeight: 700 }}>{m.business_name || 'Unknown'}</div>
              <div style={{ color: 'var(--text2)', fontSize: 13 }}>{m.vehicle_year} {m.vehicle_make} {m.vehicle_model} &middot; {m.industry}</div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{m.email}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginBottom: 4,
                background: m.payment_status === 'paid' ? 'rgba(34,192,122,0.1)' : 'var(--surface2)',
                color: m.payment_status === 'paid' ? '#22c07a' : 'var(--text3)',
              }}>
                {m.payment_status === 'paid' ? 'Deposit Paid' : m.generation_status || 'pending'}
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>
                {m.estimated_price ? `$${m.estimated_price.toLocaleString()}` : '—'}
              </div>
            </div>
          </div>
        ))}
        {!mockups?.length && (
          <div style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: 40 }}>
            No mockup leads yet. Share the wizard link to get started.
          </div>
        )}
      </div>
    </div>
  )
}
