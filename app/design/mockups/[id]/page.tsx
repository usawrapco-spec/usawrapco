'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ChevronLeft,
  Star,
  RefreshCw,
  Palette,
  Copy,
  CheckCircle,
  Loader2,
} from 'lucide-react'

interface DesignMockup {
  id: string
  customer_id: string | null
  business_name: string | null
  vehicle_type: string | null
  style_preference: string | null
  brand_colors: string[] | null
  logo_url: string | null
  mockup_urls: string[] | null
  image_prompt: string | null
  payment_status: string
  linked_project_id: string | null
  created_at: string
  customer: { name: string } | null
}

export default function MockupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const supabase = createClient()

  const [mockup, setMockup] = useState<DesignMockup | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [primaryIdx, setPrimaryIdx] = useState(0)

  useEffect(() => {
    if (!id) return
    supabase
      .from('design_mockups')
      .select('*, customer:customer_id(name)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setMockup(data as unknown as DesignMockup)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function regenerate() {
    if (!mockup) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: mockup.customer_id,
          vehicle_type: mockup.vehicle_type,
          brand_colors: mockup.brand_colors,
          logo_url: mockup.logo_url,
          style_preference: mockup.style_preference,
          business_name: mockup.business_name,
        }),
      })
      const data = await res.json()
      if (data.mockup_id) {
        router.push(`/design/mockups/${data.mockup_id}`)
      }
    } catch (e) {
      console.error('[regenerate]', e)
    } finally {
      setRegenerating(false)
    }
  }

  async function setPrimary(idx: number) {
    if (!mockup || idx === primaryIdx) return
    const urls = Array.isArray(mockup.mockup_urls) ? [...mockup.mockup_urls] : []
    const [item] = urls.splice(idx, 1)
    urls.unshift(item)
    await supabase.from('design_mockups').update({ mockup_urls: urls }).eq('id', mockup.id)
    setMockup({ ...mockup, mockup_urls: urls })
    setPrimaryIdx(0)
  }

  function copyShareLink() {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://app.usawrapco.com'
    navigator.clipboard
      .writeText(`${origin}/portal/design?mockup=${mockup?.id}`)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(() => {})
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: 12,
          color: 'var(--text3)',
        }}
      >
        <Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Loading mockup...</span>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!mockup) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Mockup not found</div>
        <Link href="/design/mockups" style={{ color: 'var(--accent)', fontSize: 13 }}>
          ← Back to Mockups
        </Link>
      </div>
    )
  }

  const urls: string[] = Array.isArray(mockup.mockup_urls) ? (mockup.mockup_urls as string[]) : []
  const isPaid = mockup.payment_status === 'paid'
  const customerName =
    (mockup.customer as any)?.name || mockup.business_name || 'Unknown'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Back link */}
      <Link
        href="/design/mockups"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text3)',
          fontSize: 13,
          marginBottom: 20,
          textDecoration: 'none',
        }}
      >
        <ChevronLeft size={14} />
        Back to Mockups
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 800,
              fontSize: 28,
              color: 'var(--text1)',
              margin: '0 0 8px',
            }}
          >
            {customerName}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {mockup.vehicle_type && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text3)',
                  textTransform: 'capitalize',
                }}
              >
                {mockup.vehicle_type.replace('_', ' ')}
              </span>
            )}
            {mockup.style_preference && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                · {mockup.style_preference}
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 20,
                background: isPaid
                  ? 'rgba(34,192,122,0.15)'
                  : 'rgba(245,158,11,0.15)',
                color: isPaid ? 'var(--green)' : 'var(--amber)',
                letterSpacing: '0.04em',
              }}
            >
              {isPaid ? 'Unlocked' : 'Awaiting Payment'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={regenerate}
            disabled={regenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 15px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'var(--surface2)',
              color: 'var(--text2)',
              fontSize: 13,
              fontWeight: 600,
              cursor: regenerating ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }}
            />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>

          <button
            onClick={copyShareLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 15px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.12)',
              background: copied ? 'rgba(34,192,122,0.12)' : 'var(--surface2)',
              color: copied ? 'var(--green)' : 'var(--text2)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? 'Link Copied!' : 'Send to Customer'}
          </button>

          <Link
            href={`/design/studio?mockup=${mockup.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 15px',
              borderRadius: 9,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Palette size={14} />
            Open in Studio
          </Link>
        </div>
      </div>

      {/* Linked project */}
      {mockup.linked_project_id && (
        <div
          style={{
            marginBottom: 20,
            padding: '10px 16px',
            background: 'rgba(79,127,255,0.08)',
            borderRadius: 9,
            border: '1px solid rgba(79,127,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Linked project:</span>
          <Link
            href={`/projects/${mockup.linked_project_id}`}
            style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}
          >
            View Project →
          </Link>
        </div>
      )}

      {/* Mockup variations */}
      {urls.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {urls.map((url, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                borderRadius: 14,
                border: `2px solid ${i === primaryIdx ? 'var(--accent)' : 'rgba(255,255,255,0.07)'}`,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={url}
                  alt={`Variation ${i + 1}`}
                  style={{
                    width: '100%',
                    display: 'block',
                    aspectRatio: '4/3',
                    objectFit: 'cover',
                  }}
                />
                {i === primaryIdx && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'var(--accent)',
                      borderRadius: 20,
                      padding: '3px 10px',
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#fff',
                      letterSpacing: '0.05em',
                    }}
                  >
                    PRIMARY
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: '11px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                  Variation {i + 1}
                </span>
                {i !== primaryIdx && (
                  <button
                    onClick={() => setPrimary(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: 'rgba(79,127,255,0.10)',
                      border: '1px solid rgba(79,127,255,0.22)',
                      borderRadius: 8,
                      color: 'var(--accent)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Star size={12} />
                    Set as Primary
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)' }}>
            No mockups generated yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
            Click Regenerate to create new variations
          </div>
        </div>
      )}

      {/* Brand colors */}
      {Array.isArray(mockup.brand_colors) && mockup.brand_colors.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: '16px 18px',
            background: 'var(--surface2)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 10,
            }}
          >
            Brand Colors
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(mockup.brand_colors as string[]).map((c, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: c,
                  border: '2px solid rgba(255,255,255,0.15)',
                }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI prompt */}
      {mockup.image_prompt && (
        <div
          style={{
            marginTop: 16,
            padding: '16px 18px',
            background: 'var(--surface2)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 8,
            }}
          >
            AI Generation Prompt
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text3)',
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 1.65,
            }}
          >
            {mockup.image_prompt}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
