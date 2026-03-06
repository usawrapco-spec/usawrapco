'use client'

import { useState, Suspense } from 'react'
import { Rocket, CheckCircle, Shield, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const AMOUNTS = [1500, 2500, 5000, 7500, 10000, 15000]

export default function PreapprovePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#0d0f14' }} />}>
      <PreapproveContent />
    </Suspense>
  )
}

function PreapproveContent() {
  const params = useSearchParams()
  const success = params.get('success')
  const cancelled = params.get('cancelled')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const finalAmount = amount || Number(customAmount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalAmount || finalAmount < 50) {
      setError('Please select or enter an amount ($50 minimum)')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/financing/preapprove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, name, email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <CheckCircle size={56} color="#22c07a" style={{ marginBottom: 20 }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
            You&rsquo;re Pre-Approved!
          </h1>
          <p style={{ fontSize: 15, color: '#9299b5', margin: 0, lineHeight: 1.6 }}>
            Great news — you&rsquo;ve been approved for financing. Contact us to get your wrap project started!
          </p>
          <a href="https://app.usawrapco.com" style={{
            display: 'inline-block', marginTop: 24,
            padding: '12px 28px', borderRadius: 10,
            background: '#4f7fff', color: '#fff',
            fontSize: 15, fontWeight: 600, textDecoration: 'none',
          }}>
            Get Started
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Rocket size={28} color="#fff" />
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 3,
            color: '#4f7fff', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            LaunchPay
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            Check Your Rate
          </h1>
          <p style={{ fontSize: 14, color: '#9299b5', margin: 0 }}>
            No impact to your credit score. Takes 30 seconds.
          </p>
        </div>

        {cancelled && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
            fontSize: 13, color: '#f25a5a',
          }}>
            Checkout was cancelled. Try again whenever you&rsquo;re ready.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <label style={labelStyle}>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="John Smith"
            style={inputStyle}
          />

          {/* Email */}
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="john@example.com"
            style={inputStyle}
          />

          {/* Amount presets */}
          <label style={labelStyle}>Estimated Project Cost</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {AMOUNTS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => { setAmount(a); setCustomAmount('') }}
                style={{
                  padding: '10px 0', borderRadius: 8,
                  border: `1px solid ${amount === a ? '#4f7fff' : '#2a2f3d'}`,
                  background: amount === a ? 'rgba(79,127,255,0.15)' : '#1a1d27',
                  color: amount === a ? '#4f7fff' : '#e8eaed',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ${a.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5a6080', fontSize: 15 }}>$</span>
            <input
              type="number"
              value={customAmount}
              onChange={e => { setCustomAmount(e.target.value); setAmount('') }}
              placeholder="Or enter custom amount"
              min={50}
              max={30000}
              style={{ ...inputStyle, paddingLeft: 28, marginBottom: 0 }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#f25a5a', marginBottom: 12 }}>{error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 10,
              background: loading ? '#3a5fcc' : 'linear-gradient(135deg, #4f7fff, #6c5ce7)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
            {loading ? 'Redirecting...' : 'Check My Rate'}
          </button>
        </form>

        {/* Perks */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['No hard credit pull', 'Decisions in seconds', 'Plans from 3–36 months'].map(perk => (
            <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9299b5' }}>
              <CheckCircle size={14} color="#22c07a" />
              {perk}
            </div>
          ))}
        </div>

        {/* Disclosure */}
        <div style={{
          marginTop: 24, padding: '12px 14px', borderRadius: 8,
          background: 'rgba(26,29,39,0.8)', border: '1px solid #2a2f3d',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <Shield size={13} color="#5a6080" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 10, color: '#5a6080', margin: 0, lineHeight: 1.5 }}>
            LaunchPay is a financing service powered by Affirm, Inc. All loans are issued by
            Affirm&rsquo;s lending partners. Subject to credit approval. Rates vary by creditworthiness.
            See <a href="https://www.affirm.com/licenses" target="_blank" rel="noopener noreferrer"
              style={{ color: '#4f7fff' }}>affirm.com/licenses</a> for details.
          </p>
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#0d0f14',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: '#13151c',
  borderRadius: 16,
  border: '1px solid #2a2f3d',
  padding: '32px 24px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#9299b5',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 1,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #2a2f3d',
  background: '#1a1d27',
  color: '#e8eaed',
  fontSize: 15,
  outline: 'none',
  marginBottom: 16,
  boxSizing: 'border-box',
}
