'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, Truck, FileText } from 'lucide-react'

interface Props {
  project: Record<string, unknown> | null
  intakeData: Record<string, unknown> | null
  token: string
}

export default function CustomerSignoffClient({ project, intakeData, token }: Props) {
  const [step, setStep]       = useState<'review' | 'sign' | 'done'>('review')
  const [agreed, setAgreed]   = useState(false)
  const [name, setName]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')

  const data = project || (intakeData?.project as Record<string, unknown>)

  async function submit() {
    if (!agreed || !name.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signerName: name, agreed }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setStep('done')
    } catch {
      setError('Could not submit sign-off. Please try again.')
    }
    setSubmitting(false)
  }

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <CheckCircle size={64} style={{ color: '#22c07a', marginBottom: 20 }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 10 }}>
          Sign-Off Complete!
        </h1>
        <p style={{ color: '#9299b5', maxWidth: 400 }}>
          Thank you {name}. Your approval has been recorded. USA Wrap Co will proceed with production.
          You'll receive an email confirmation shortly.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Truck size={28} style={{ color: '#4f7fff' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, letterSpacing: '-0.01em' }}>
            USA WRAP CO
          </span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          Production Brief — Customer Sign-Off
        </h2>
        {data && (
          <p style={{ color: '#9299b5', fontSize: 14 }}>
            Job: {String(data.title || 'Your Project')} · {String(data.vehicle_desc || '')}
          </p>
        )}
      </div>

      {step === 'review' && (
        <>
          {/* Production details */}
          {data && (
            <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} style={{ color: '#4f7fff' }} /> Production Brief Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Project', val: String(data.title || '—') },
                  { label: 'Vehicle', val: String(data.vehicle_desc || '—') },
                  { label: 'Type', val: String(data.type || '—') },
                  { label: 'Status', val: String(data.status || '—') },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: '#0d0f14', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What you're approving */}
          <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#4f7fff', marginBottom: 12 }}>By signing off, you confirm:</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'You have reviewed the production brief and all details are correct',
                'The vehicle information, wrap type, and design specifications are accurate',
                'You authorize USA Wrap Co to proceed with production and installation',
                'Any changes after sign-off may incur additional fees',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#9299b5' }}>
                  <CheckCircle size={14} style={{ color: '#22c07a', flexShrink: 0, marginTop: 1 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setStep('sign')}
            style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#4f7fff', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            I've Reviewed — Proceed to Sign
          </button>
        </>
      )}

      {step === 'sign' && (
        <>
          <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e8eaed', marginBottom: 20 }}>Digital Sign-Off</h3>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Your Full Name (typed signature)
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Type your full legal name"
                style={{ width: '100%', padding: '12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: '#4f7fff', flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: '#9299b5', lineHeight: 1.6 }}>
                I, {name || '[Your Name]'}, authorize USA Wrap Co to proceed with production as described in this brief.
                I understand that once production begins, changes may incur additional fees.
                This digital signature has the same legal effect as a handwritten signature.
              </span>
            </label>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 8, marginBottom: 16 }}>
                <AlertCircle size={14} style={{ color: '#f25a5a' }} />
                <span style={{ color: '#f25a5a', fontSize: 13 }}>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep('review')}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #1a1d27', background: 'transparent', color: '#9299b5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={!agreed || !name.trim() || submitting}
                style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: agreed && name.trim() ? '#22c07a' : '#1a1d27', color: agreed && name.trim() ? '#fff' : '#5a6080', fontSize: 14, fontWeight: 700, cursor: agreed && name.trim() ? 'pointer' : 'not-allowed' }}
              >
                {submitting ? 'Submitting...' : 'Sign & Approve Production'}
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#5a6080' }}>
            Signed on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' '}· IP address logged for verification
          </p>
        </>
      )}
    </div>
  )
}
