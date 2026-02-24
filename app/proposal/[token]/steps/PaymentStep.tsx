'use client'

import { useState } from 'react'
import { ChevronLeft, Loader2, Shield, CreditCard } from 'lucide-react'

interface PaymentStepProps {
  clientSecret: string | null
  depositAmount: number
  customerName: string
  customerEmail: string
  isDemo: boolean
  onSuccess: () => Promise<void>
  onBack: () => void
  colors: any
}

export default function PaymentStep({
  clientSecret, depositAmount, customerName, customerEmail, isDemo, onSuccess, onBack, colors: C,
}: PaymentStepProps) {
  const [processing, setProcessing] = useState(false)
  const [cardName, setCardName] = useState(customerName)
  const [cardEmail, setCardEmail] = useState(customerEmail)

  const handlePay = async () => {
    if (processing) return
    setProcessing(true)

    if (isDemo || !clientSecret || clientSecret.startsWith('demo_')) {
      // Demo mode — simulate payment
      await new Promise(r => setTimeout(r, 2000))
      await onSuccess()
      return
    }

    // Real Stripe payment would use Stripe Elements here
    // For now, call onSuccess directly (Stripe Elements integration can be added)
    try {
      await onSuccess()
    } catch {
      setProcessing(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1,
    fontSize: 15, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px 80px' }}>
      <button onClick={onBack} disabled={processing} style={{
        background: 'none', border: 'none', color: C.text3, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0,
      }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div style={{
        fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
        textAlign: 'center', marginBottom: 8,
      }}>
        Deposit Payment
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: C.text2, marginBottom: 32 }}>
        Secure your spot with a deposit
      </div>

      {/* Amount card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 28, textAlign: 'center', marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text3, marginBottom: 6 }}>
          Deposit Amount
        </div>
        <div style={{
          fontSize: 44, fontWeight: 900, color: C.accent,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          ${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Card form */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 20, marginBottom: 24,
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block' }}>Name</label>
          <input
            value={cardName}
            onChange={e => setCardName(e.target.value)}
            style={inputStyle}
            readOnly
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block' }}>Email</label>
          <input
            value={cardEmail}
            onChange={e => setCardEmail(e.target.value)}
            style={inputStyle}
            readOnly
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block' }}>Card Details</label>
          <div style={{
            ...inputStyle,
            display: 'flex', alignItems: 'center', gap: 10,
            color: C.text3,
          }}>
            <CreditCard size={18} />
            {isDemo || !clientSecret ? (
              <span style={{ fontSize: 14 }}>Demo mode - no real charge</span>
            ) : (
              <span style={{ fontSize: 14 }}>Stripe card input</span>
            )}
          </div>
        </div>
      </div>

      {/* Secure badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 24, fontSize: 12, color: C.text3,
      }}>
        <Shield size={14} />
        Payments secured with 256-bit SSL encryption
      </div>

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={processing}
        style={{
          width: '100%', padding: '18px', border: 'none', borderRadius: 14,
          background: processing ? C.surface2 : `linear-gradient(135deg, ${C.green}, #16a35e)`,
          color: processing ? C.text3 : '#fff',
          fontSize: 17, fontWeight: 800, cursor: processing ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}
      >
        {processing ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing Payment...</>
        ) : (
          <>Pay Deposit &amp; Confirm</>
        )}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
