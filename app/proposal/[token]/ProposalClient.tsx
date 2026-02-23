'use client'

import { useState } from 'react'
import { CheckCircle, Paintbrush, Phone, Mail, Globe, Shield, Star, Clock, Award, ChevronDown, ChevronUp, Lock } from 'lucide-react'

interface Proposal {
  id: string
  token: string
  proposal_number: string
  status: string
  line_items: Array<{ description: string; qty: number; unit_price: number; total: number }>
  subtotal: number
  tax: number
  total: number
  mockup_images: string[]
  selected_mockup_url: string
  deposit_amount: number
  deposit_paid: boolean
  expires_at: string
  vehicle_year: string
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  coverage_type: string
  material: string
  notes: string
}

export default function ProposalClient({ proposal }: { proposal: Proposal }) {
  const [paying, setPaying] = useState(false)
  const [payingPath, setPayingPath] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const deposit = proposal.deposit_amount || (proposal.total * 0.5)
  const remaining = proposal.total - deposit
  const lineItems = Array.isArray(proposal.line_items) ? proposal.line_items : []
  const mockups = Array.isArray(proposal.mockup_images) ? proposal.mockup_images : []

  const handlePay = async (path: 'schedule_as_is' | 'custom_design') => {
    setPaying(true)
    setPayingPath(path)
    try {
      const res = await fetch(`/api/proposals/${proposal.token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Payment setup failed. Please call us at 253-525-8148.')
      }
    } catch {
      alert('Network error. Please call us at 253-525-8148.')
    } finally {
      setPaying(false)
      setPayingPath(null)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

  const S: Record<string, React.CSSProperties> = {
    section: { maxWidth: 780, margin: '0 auto', padding: '40px 20px' },
    card: { background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 32px', marginBottom: 24 },
    label: { fontSize: 11, fontWeight: 700, color: '#9299b5', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
    h2: { fontSize: 22, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 16 },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaed' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d0f14 0%, #13151c 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '28px 20px', textAlign: 'center' }}>
        <img
          src="/images/usawrapco-logo-white.png"
          alt="USA Wrap Co"
          style={{ height: 52, margin: '0 auto 16px', display: 'block', objectFit: 'contain' }}
        />
        <h1 style={{ fontSize: 13, fontWeight: 700, color: '#4f7fff', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
          Vehicle Wrap Proposal
        </h1>
        <p style={{ fontSize: 28, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>
          American Craftsmanship You Can Trust™
        </p>
        {proposal.proposal_number && (
          <p style={{ fontSize: 12, color: '#5a6080' }}>Proposal #{proposal.proposal_number}</p>
        )}
      </div>

      <div style={S.section}>

        {/* Section 1 — About the Shop */}
        <div style={S.card}>
          <h2 style={S.h2}>About USA Wrap Co</h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 24 }}>
            <div>
              <p style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.7, marginBottom: 20 }}>
                USA Wrap Co is the Pacific Northwest's premier vehicle wrap shop. With over a decade of experience,
                we deliver precision-cut, professionally installed wraps that transform vehicles into rolling billboards.
                Every wrap is crafted in-house by our expert team using premium materials and state-of-the-art equipment.
              </p>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { icon: Award, label: '500+', sub: 'Vehicles Wrapped' },
                  { icon: Star, label: '5★', sub: 'Google Reviews' },
                  { icon: Clock, label: '10+', sub: 'Years in Business' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={sub} style={{ textAlign: 'center' }}>
                    <Icon size={20} style={{ color: '#4f7fff', margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#5a6080' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: Phone, text: '253-525-8148' },
                { icon: Mail, text: 'sales@usawrapco.com' },
                { icon: Globe, text: 'usawrapco.com' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#9299b5' }}>
                  <Icon size={16} style={{ color: '#4f7fff', flexShrink: 0 }} />
                  {text}
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '12px 16px', background: 'rgba(79,127,255,0.08)', borderRadius: 8, border: '1px solid rgba(79,127,255,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} style={{ color: '#22c07a' }} />
                <span style={{ fontSize: 13, color: '#22c07a', fontWeight: 600 }}>Licensed, Insured & Warranted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 — Vehicle Info */}
        {(proposal.vehicle_make || proposal.coverage_type) && (
          <div style={S.card}>
            <h2 style={S.h2}>Your Vehicle</h2>
            <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 16 }}>
              {[
                { label: 'Year', value: proposal.vehicle_year },
                { label: 'Make', value: proposal.vehicle_make },
                { label: 'Model', value: proposal.vehicle_model },
                { label: 'Color', value: proposal.vehicle_color },
                { label: 'Coverage', value: proposal.coverage_type },
                { label: 'Material', value: proposal.material },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={S.label}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 — Design Concepts */}
        {mockups.length > 0 && (
          <div style={S.card}>
            <h2 style={S.h2}>Your Initial Design Concepts</h2>
            <p style={{ fontSize: 14, color: '#9299b5', marginBottom: 20 }}>
              Here are your custom design concepts created specifically for your vehicle and brand.
            </p>
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              {mockups.slice(0, 4).map((url, i) => (
                <div
                  key={i}
                  style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', userSelect: 'none' }}
                  onContextMenu={e => e.preventDefault()}
                >
                  <img
                    src={url}
                    alt={`Concept ${i + 1}`}
                    style={{
                      width: '100%',
                      display: 'block',
                      filter: 'blur(0px)',
                      pointerEvents: 'none',
                    }}
                    draggable={false}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    padding: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 10px' }}>
                      <Lock size={12} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Full res after deposit</span>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 8px' }}>
                    Concept {i + 1}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 13, color: '#f59e0b' }}>Full resolution + unlimited access unlocked after deposit payment</span>
            </div>
          </div>
        )}

        {/* Section 4 — Investment */}
        <div style={S.card}>
          <h2 style={S.h2}>Your Investment</h2>
          {lineItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < lineItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, color: '#e8eaed', fontWeight: 500 }}>{item.description}</div>
                    {item.qty > 1 && <div style={{ fontSize: 12, color: '#5a6080' }}>Qty: {item.qty}</div>}
                  </div>
                  <div style={{ fontSize: 14, color: '#e8eaed', fontWeight: 600 }}>{fmt(item.total)}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proposal.subtotal && proposal.subtotal !== proposal.total && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9299b5' }}>
                <span>Subtotal</span><span>{fmt(proposal.subtotal)}</span>
              </div>
            )}
            {proposal.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9299b5' }}>
                <span>Tax</span><span>{fmt(proposal.tax)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>TOTAL</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#4f7fff', fontFamily: 'Barlow Condensed, sans-serif' }}>{fmt(proposal.total)}</span>
            </div>
          </div>
        </div>

        {/* Section 5 — Next Steps */}
        {!proposal.deposit_paid && (
          <div>
            <h2 style={{ ...S.h2, textAlign: 'center', marginBottom: 20 }}>Choose Your Next Step</h2>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>

              {/* Path A — Schedule as-is */}
              <div style={{ ...S.card, border: '2px solid rgba(34,192,122,0.4)', background: 'rgba(34,192,122,0.04)', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,192,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={20} style={{ color: '#22c07a' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>I Love It — Let's Schedule!</div>
                    <div style={{ fontSize: 12, color: '#22c07a' }}>Schedule with this design</div>
                  </div>
                </div>

                <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#9299b5' }}>
                    <span>50% Deposit to secure your spot</span>
                    <span style={{ color: '#22c07a', fontWeight: 700 }}>{fmt(deposit)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#9299b5' }}>
                    <span>Remaining 50% upon completion</span>
                    <span>{fmt(remaining)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {[
                    'Final high-res design files',
                    'Professional installation by certified installers',
                    'Minor design adjustments available',
                    '1-year installation warranty',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CheckCircle size={14} style={{ color: '#22c07a', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#9299b5' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePay('schedule_as_is')}
                  disabled={paying}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                    background: paying && payingPath === 'schedule_as_is' ? 'var(--surface2)' : 'linear-gradient(135deg, #22c07a, #16a35a)',
                    color: '#fff', fontSize: 15, fontWeight: 800,
                    cursor: paying ? 'not-allowed' : 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    letterSpacing: '0.03em',
                  }}
                >
                  {paying && payingPath === 'schedule_as_is' ? 'Processing...' : `PAY DEPOSIT & SCHEDULE — ${fmt(deposit)}`}
                </button>
              </div>

              {/* Path B — Custom Design */}
              <div style={{ ...S.card, border: '2px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.04)', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paintbrush size={20} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>I Want Something Custom</div>
                    <div style={{ fontSize: 12, color: '#8b5cf6' }}>Custom Design Consultation</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(139,92,246,0.1)', borderRadius: 8, textAlign: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#8b5cf6', fontFamily: 'Barlow Condensed, sans-serif' }}>$1,000</span>
                  <div style={{ fontSize: 11, color: '#9299b5', marginTop: 2 }}>Applied to your total if you move forward</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {[
                    '1-on-1 design consult with our in-house designer',
                    'Access to AI mockup creator — design it yourself',
                    'Unlimited design revisions',
                    'Professional branding consultation',
                    'Logo variations and brand refresh options',
                    'Final print-ready files included',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <CheckCircle size={14} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: '#9299b5' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePay('custom_design')}
                  disabled={paying}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                    background: paying && payingPath === 'custom_design' ? 'var(--surface2)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    color: '#fff', fontSize: 15, fontWeight: 800,
                    cursor: paying ? 'not-allowed' : 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    letterSpacing: '0.03em',
                  }}
                >
                  {paying && payingPath === 'custom_design' ? 'Processing...' : 'START CUSTOM DESIGN — $1,000'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Paid Confirmation */}
        {proposal.deposit_paid && (
          <div style={{ ...S.card, border: '2px solid rgba(34,192,122,0.4)', textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: '#22c07a', margin: '0 auto 16px' }} />
            <h2 style={{ ...S.h2, textAlign: 'center' }}>Deposit Paid — You're Booked!</h2>
            <p style={{ fontSize: 14, color: '#9299b5' }}>
              Thank you! Your spot is confirmed. Our team will reach out within 1 business day to schedule your installation.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '32px 0 16px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
            <a href="tel:2535258148" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9299b5', textDecoration: 'none', fontSize: 14 }}>
              <Phone size={14} />253-525-8148
            </a>
            <a href="mailto:sales@usawrapco.com" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9299b5', textDecoration: 'none', fontSize: 14 }}>
              <Mail size={14} />sales@usawrapco.com
            </a>
          </div>
          {proposal.expires_at && (
            <p style={{ fontSize: 12, color: '#5a6080' }}>
              This proposal expires on {new Date(proposal.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          <p style={{ fontSize: 11, color: '#5a6080', marginTop: 8 }}>
            © {new Date().getFullYear()} USA Wrap Co. All rights reserved. · usawrapco.com
          </p>
        </div>

      </div>
    </div>
  )
}
