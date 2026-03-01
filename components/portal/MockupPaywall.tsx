'use client'

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'

const PRICE_RANGES: Record<string, string> = {
  car: '$2,000 – $4,000',
  truck: '$2,500 – $5,000',
  van: '$2,500 – $5,000',
  sprinter: '$3,000 – $6,000',
  box_truck: '$4,000 – $8,000',
  trailer: '$3,500 – $7,000',
  boat: '$3,000 – $6,000',
}

interface MockupData {
  id: string
  business_name: string | null
  vehicle_type: string | null
  mockup_urls: string[] | null
  payment_status: string
}

export default function MockupPaywall({
  mockup,
  mockupId,
}: {
  mockup: MockupData | null
  mockupId: string
}) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  if (!mockup) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0f14',
          color: '#e8eaed',
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Design not found
          </h2>
          <p style={{ color: '#9299b5', margin: 0 }}>This design link may have expired or is invalid.</p>
        </div>
      </div>
    )
  }

  // Already paid — show full images
  if (mockup.payment_status === 'paid') {
    const paidUrls: string[] = Array.isArray(mockup.mockup_urls) ? (mockup.mockup_urls as string[]) : []
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0d0f14',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: 960, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(34,192,122,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Check size={28} color="#22c07a" />
            </div>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: '#e8eaed',
                margin: '0 0 8px',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              {mockup.business_name || 'Your'} Design is Unlocked!
            </h2>
            <p style={{ color: '#9299b5', fontSize: 15, margin: 0 }}>
              Your professional wrap designs are below
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {paidUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Design variation ${i + 1}`}
                style={{ width: '100%', borderRadius: 12, display: 'block', aspectRatio: '4/3', objectFit: 'cover' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const urls: string[] = Array.isArray(mockup.mockup_urls) ? (mockup.mockup_urls as string[]) : []
  const priceRange = PRICE_RANGES[mockup.vehicle_type || ''] || '$2,000 – $5,000'
  const colsStyle = urls.length >= 3 ? '1fr 1fr 1fr' : urls.length === 2 ? '1fr 1fr' : '1fr'

  async function handleUnlock() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_id: mockupId, customer_email: email || undefined }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error('[paywall] checkout error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaed' }}>
      {/* Blurred mockup hero */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 380 }}>
        {urls.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: colsStyle,
              minHeight: 380,
            }}
          >
            {urls.slice(0, 3).map((url, i) => (
              <div key={i} style={{ overflow: 'hidden', minHeight: 380 }}>
                <img
                  src={url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    filter: 'blur(20px)',
                    transform: 'scale(1.12)',
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1d27 0%, #0d0f14 100%)',
              minHeight: 380,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 72 }}>🎨</div>
          </div>
        )}

        {/* Dark overlay with headline */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(13,15,20,0.55) 0%, rgba(13,15,20,0.88) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 580, padding: '0 24px' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#4f7fff',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              READY FOR YOU
            </div>
            <h1
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(30px, 6vw, 56px)',
                lineHeight: 1.1,
                color: '#e8eaed',
                margin: '0 0 14px',
              }}
            >
              Your Wrap Design Is Ready
            </h1>
            <p style={{ fontSize: 16, color: '#c8cad5', margin: '0 0 6px' }}>
              {mockup.vehicle_type && (
                <span style={{ textTransform: 'capitalize' as const }}>
                  {mockup.vehicle_type.replace('_', ' ')}
                </span>
              )}
              {mockup.business_name && (
                <>
                  {' '}
                  for <strong style={{ color: '#e8eaed' }}>{mockup.business_name}</strong>
                </>
              )}
            </p>
            <p style={{ fontSize: 13, color: '#5a6080', margin: 0 }}>
              {urls.length} variation{urls.length !== 1 ? 's' : ''} generated · Estimated install price:{' '}
              {priceRange}
            </p>
          </div>
        </div>
      </div>

      {/* CTA card */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 60px' }}>
        <div
          style={{
            background: '#13151c',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 20,
            padding: '32px 28px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 800,
              fontSize: 26,
              color: '#e8eaed',
              margin: '0 0 8px',
            }}
          >
            Unlock Your Full Design
          </h2>
          <p style={{ fontSize: 15, color: '#9299b5', margin: '0 0 24px' }}>
            Secure your designs with a refundable design deposit
          </p>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email (for receipt)"
            style={{
              width: '100%',
              boxSizing: 'border-box' as const,
              background: '#1a1d27',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              color: '#e8eaed',
              fontSize: 14,
              outline: 'none',
            }}
          />

          <button
            onClick={handleUnlock}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 12,
              border: 'none',
              background: loading ? '#3d5fcc' : '#4f7fff',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              letterSpacing: '0.02em',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Redirecting to checkout...
              </>
            ) : (
              'Unlock Full Design — $150 Design Deposit'
            )}
          </button>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '24px 0 0',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 10,
              textAlign: 'left' as const,
            }}
          >
            {[
              'Full resolution mockups',
              'Editable design canvas',
              'Professional designer refinement',
              '2 revision rounds',
              'Print-ready files',
            ].map(feature => (
              <li
                key={feature}
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#9299b5' }}
              >
                <Check size={16} color="#22c07a" style={{ flexShrink: 0 }} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
