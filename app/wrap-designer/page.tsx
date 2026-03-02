'use client'

import { useState } from 'react'
import { CheckCircle, ChevronRight, Zap, Wand2, CreditCard, AlertCircle, ArrowLeft, Star } from 'lucide-react'
import PricingCalculator from '@/components/pricing/PricingCalculator'
import MockupGenerator from '@/components/mockup/MockupGenerator'

type FlowStep = 'pricing' | 'mockup' | 'checkout' | 'done'

interface QuoteData {
  coverageLevel: string
  totalPrice: number
  vehicleInfo: string
  vehicleMake?: string
  vehicleModel?: string
}

const STEP_META = [
  { key: 'pricing',  label: 'Get Your Price',     icon: Zap },
  { key: 'mockup',   label: 'See Your Design',     icon: Wand2 },
  { key: 'checkout', label: 'Book Your Spot',       icon: CreditCard },
]

export default function WrapDesignerPage() {
  const [step, setStep] = useState<FlowStep>('pricing')
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)
  const [approvedImageUrl, setApprovedImageUrl] = useState<string | null>(null)
  const [approvedBrandName, setApprovedBrandName] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)

  const handlePriceCalculated = (data: { coverageLevel: string; totalPrice: number; vehicleInfo: string }) => {
    setQuoteData(data)
    setStep('mockup')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDesignApproved = (imageUrl: string, brandInfo: { companyName: string }) => {
    setApprovedImageUrl(imageUrl)
    setApprovedBrandName(brandInfo.companyName)
    setStep('checkout')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDepositCheckout = async () => {
    setDepositLoading(true)
    setDepositError(null)
    try {
      const res = await fetch('/api/design-mockup/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 25000, // $250 in cents
          description: `Design Deposit — ${approvedBrandName || 'Vehicle Wrap'}`,
          imageUrl: approvedImageUrl,
          metadata: {
            vehicleInfo: quoteData?.vehicleInfo,
            totalPrice: quoteData?.totalPrice,
            coverageLevel: quoteData?.coverageLevel,
          },
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Could not create checkout session')
      }
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : 'Checkout failed')
      setDepositLoading(false)
    }
  }

  const stepIndex = STEP_META.findIndex(s => s.key === step)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c11', color: 'var(--text1, #e8eaed)' }}>

      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, #0d0f14 0%, #131830 50%, #0d0f14 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 20px 28px',
        textAlign: 'center',
      }}>
        {/* Logo / brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#000',
          }}>
            W
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1, #e8eaed)', letterSpacing: '-0.5px' }}>
            USA WRAP CO
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, color: '#f59e0b', margin: '0 0 10px', letterSpacing: '-1px' }}>
          Get Your Price + See Your Wrap
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          Instant pricing on 1,991 vehicles. AI generates your custom wrap design in seconds.
        </p>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {[
            { value: '1,200+', label: 'Wraps Installed' },
            { value: '4.9', label: 'Google Rating', icon: <Star size={12} fill="#f59e0b" color="#f59e0b" /> },
            { value: '$250', label: 'Design Deposit' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.icon && item.icon}
              <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 16 }}>{item.value}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{item.label}</span>
              {i < 2 && <span style={{ color: 'rgba(255,255,255,0.15)', marginLeft: 8 }}>|</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Step progress bar */}
      <div style={{ background: '#0d0f14', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {STEP_META.map((s, i) => {
            const Icon = s.icon
            const isActive = i === stepIndex
            const isDone = i < stepIndex
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div
                  onClick={() => isDone && setStep(s.key as FlowStep)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                    padding: '10px 14px', borderRadius: 8, cursor: isDone ? 'pointer' : 'default',
                    background: isActive ? 'rgba(245,158,11,0.12)' : isDone ? 'rgba(34,192,122,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(245,158,11,0.35)' : isDone ? 'rgba(34,192,122,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: isActive ? '#f59e0b' : isDone ? '#22c07a' : 'rgba(255,255,255,0.08)',
                  }}>
                    {isDone ? <CheckCircle size={14} color="#000" /> : <Icon size={14} color={isActive ? '#000' : '#9299b5'} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#f59e0b' : isDone ? '#22c07a' : '#9299b5', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < STEP_META.length - 1 && (
                  <ChevronRight size={14} color="rgba(255,255,255,0.15)" style={{ flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* STEP 1: Pricing calculator */}
        {step === 'pricing' && (
          <div>
            <PricingCalculator onGetStarted={handlePriceCalculated} />
          </div>
        )}

        {/* STEP 2: AI Mockup generator */}
        {step === 'mockup' && (
          <div>
            {/* Quote summary banner */}
            {quoteData && (
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 12, padding: '14px 18px', marginBottom: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} color="#22c07a" />
                  <span style={{ fontSize: 14, color: 'var(--text1, #e8eaed)', fontWeight: 600 }}>
                    {quoteData.vehicleInfo}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>—</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{quoteData.coverageLevel.replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>
                    ${quoteData.totalPrice.toLocaleString()}
                  </span>
                  <button
                    onClick={() => setStep('pricing')}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <ArrowLeft size={12} />
                    Edit
                  </button>
                </div>
              </div>
            )}

            <MockupGenerator
              vehicleYear=""
              vehicleMake={quoteData?.vehicleInfo?.split(' ')[0] || ''}
              vehicleModel={quoteData?.vehicleInfo?.split(' ').slice(1).join(' ') || ''}
              onApprove={handleDesignApproved}
            />
          </div>
        )}

        {/* STEP 3: Checkout */}
        {step === 'checkout' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ background: 'var(--surface, #13151c)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Approved image preview */}
              {approvedImageUrl && (
                <div style={{ position: 'relative', aspectRatio: '16/7', overflow: 'hidden' }}>
                  <img src={approvedImageUrl} alt="Approved design" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 60%, rgba(13,15,20,0.9) 100%)',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 16, left: 20,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CheckCircle size={18} color="#22c07a" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Design Approved</span>
                  </div>
                </div>
              )}

              <div style={{ padding: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1, #e8eaed)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                  Book Your Spot
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
                  Secure your installation date with a $250 design deposit. Applied to your final balance.
                </p>

                {/* Quote summary */}
                {quoteData && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { label: 'Vehicle',     value: quoteData.vehicleInfo },
                      { label: 'Coverage',    value: quoteData.coverageLevel.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                      { label: 'Quote Total', value: `$${quoteData.totalPrice.toLocaleString()}` },
                      { label: 'Today (deposit)', value: '$250', highlight: true },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: row.highlight ? 800 : 600, color: row.highlight ? '#f59e0b' : 'var(--text1, #e8eaed)' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* What's included */}
                <div style={{ marginBottom: 24 }}>
                  {[
                    'Custom AI wrap design refined to your specs',
                    'Designer review + final production-ready file',
                    'Priority scheduling for installation',
                    'Full deposit applied to your final invoice',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <CheckCircle size={14} color="#22c07a" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                    </div>
                  ))}
                </div>

                {depositError && (
                  <div style={{
                    background: 'rgba(242,90,90,0.12)', border: '1px solid rgba(242,90,90,0.3)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 8, color: '#f25a5a', fontSize: 13,
                  }}>
                    <AlertCircle size={14} />{depositError}
                  </div>
                )}

                <button
                  onClick={handleDepositCheckout}
                  disabled={depositLoading}
                  style={{
                    width: '100%', padding: '16px 20px', borderRadius: 12,
                    background: depositLoading ? 'rgba(245,158,11,0.4)' : '#f59e0b',
                    color: '#000', border: 'none', fontSize: 17, fontWeight: 800,
                    cursor: depositLoading ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  {depositLoading ? (
                    <>
                      <div style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Redirecting to checkout...
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Pay $250 Design Deposit
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep('mockup')}
                  style={{
                    width: '100%', padding: '12px 20px', borderRadius: 10, marginTop: 10,
                    background: 'transparent', color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Back to Designs
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
                  Secured by Stripe. No hidden fees. Refundable if we can't schedule within 30 days.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmation */}
        {step === 'done' && (
          <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,192,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={36} color="#22c07a" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1, #e8eaed)', margin: '0 0 10px' }}>
              You're booked!
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px', lineHeight: 1.6 }}>
              We've received your deposit for {approvedBrandName || 'your vehicle wrap'}. Our team will reach out within 1 business day to confirm your installation date.
            </p>
            <div style={{ background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>What happens next:</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Our designer will refine your AI concept', 'You get 2 free revision rounds', 'Final files sent for your approval', 'Installation scheduled at your convenience'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg) } }
        :root {
          --bg: #0d0f14;
          --surface: #13151c;
          --surface2: #1a1d27;
          --accent: #4f7fff;
          --green: #22c07a;
          --red: #f25a5a;
          --amber: #f59e0b;
          --text1: #e8eaed;
          --text2: #9299b5;
          --text3: #5a6080;
        }
      `}</style>
    </div>
  )
}
