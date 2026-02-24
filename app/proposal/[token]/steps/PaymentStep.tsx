'use client'

import { useState } from 'react'

interface PaymentStepProps {
  total: number
  downPaymentPct: number
  token: string
  onSuccess: () => void
  onBack: () => void
}

export default function PaymentStep({ total, downPaymentPct, token, onSuccess, onBack }: PaymentStepProps) {
  const [processing, setProcessing] = useState(false)
  const downPayment = total * (downPaymentPct / 100)

  const handlePayment = async () => {
    setProcessing(true)
    try {
      // Payment processing would integrate with Stripe here
      await new Promise(r => setTimeout(r, 1500))
      onSuccess()
    } catch {
      setProcessing(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>
        Secure Your Spot
      </h2>
      <p style={{ fontSize: 14, color: '#a0a0a0', marginBottom: 24 }}>
        A {downPaymentPct}% deposit is required to lock in your booking.
      </p>

      <div style={{
        padding: 20, borderRadius: 10, background: '#1A1A1A',
        border: '1px solid #2a2a2a', marginBottom: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 4 }}>Deposit Amount</div>
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>
          ${downPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          of ${total.toLocaleString()} total ({downPaymentPct}%)
        </div>
      </div>

      <div style={{
        padding: 16, borderRadius: 10, background: '#222',
        border: '1px solid #2a2a2a', marginBottom: 24,
        fontSize: 13, color: '#a0a0a0', textAlign: 'center',
      }}>
        Payment integration coming soon. Contact us to arrange payment.
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} disabled={processing} style={{
          flex: 1, padding: 14, borderRadius: 10, background: '#222',
          border: '1px solid #2a2a2a', color: '#a0a0a0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Back
        </button>
        <button onClick={handlePayment} disabled={processing} style={{
          flex: 1, padding: 14, borderRadius: 10,
          background: processing ? '#666' : '#22c07a',
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          {processing ? 'Processing...' : 'Submit Deposit'}
        </button>
      </div>
    </div>
  )
}
