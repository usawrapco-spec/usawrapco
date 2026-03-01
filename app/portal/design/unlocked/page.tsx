export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase/service'
import { CheckCircle } from 'lucide-react'

export const metadata = {
  title: 'Design Unlocked — USA WRAP CO',
}

export default async function UnlockedPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id

  let mockup: {
    id: string
    business_name: string | null
    vehicle_type: string | null
    mockup_urls: string[] | null
  } | null = null

  if (sessionId) {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('design_mockups')
      .select('id, business_name, vehicle_type, mockup_urls')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()
    mockup = data as any
  }

  const urls: string[] = Array.isArray(mockup?.mockup_urls) ? (mockup!.mockup_urls as string[]) : []

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0f14',
        color: '#e8eaed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          padding: '48px 24px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(34,192,122,0.15)',
            border: '2px solid rgba(34,192,122,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <CheckCircle size={32} color="#22c07a" />
        </div>
        <h1
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 46px)',
            color: '#e8eaed',
            margin: '0 0 10px',
          }}
        >
          {mockup?.business_name ? `${mockup.business_name} — Design Unlocked!` : 'Payment Received!'}
        </h1>
        <p style={{ fontSize: 16, color: '#9299b5', margin: 0 }}>
          {urls.length > 0
            ? 'Your professional wrap designs are ready below. Our team will contact you within 24 hours.'
            : 'Your payment was received. Our design team will reach out within 24 hours with your mockups.'}
        </p>
      </div>

      {/* Mockup images */}
      {urls.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: 960,
            padding: '0 24px 48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {urls.map((url, i) => (
            <div
              key={i}
              style={{
                background: '#13151c',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <img
                src={url}
                alt={`Design variation ${i + 1}`}
                style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }}
              />
              <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#9299b5' }}>
                Variation {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What's next */}
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          padding: '0 24px 60px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: '#13151c',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '24px 28px',
          }}
        >
          <h3
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 800,
              fontSize: 20,
              color: '#e8eaed',
              margin: '0 0 16px',
            }}
          >
            What Happens Next
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'A designer will review your mockups and reach out within 24 hours',
              'You\'ll get 2 free revision rounds to perfect the design',
              'Once approved, we prepare print-ready files',
              'Schedule your installation at our facility or mobile service',
            ].map((item, i) => (
              <li
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'rgba(79,127,255,0.15)',
                    border: '1px solid rgba(79,127,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#4f7fff',
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
