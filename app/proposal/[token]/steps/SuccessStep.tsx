'use client'

import { CheckCircle2 } from 'lucide-react'

interface SuccessStepProps {
  proposal: any
  total: number
}

export default function SuccessStep({ proposal, total }: SuccessStepProps) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
        background: 'rgba(34,192,122,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle2 size={32} color="#22c07a" />
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>
        You&apos;re All Set!
      </h2>
      <p style={{ fontSize: 14, color: '#a0a0a0', marginBottom: 24, lineHeight: 1.6 }}>
        Your booking has been confirmed. We&apos;ll be in touch shortly with next steps.
      </p>

      <div style={{
        padding: 20, borderRadius: 10, background: '#1A1A1A',
        border: '1px solid #2a2a2a', marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 4 }}>Order Total</div>
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a' }}>
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
        A confirmation email has been sent with your receipt and project details.
        <br />
        Questions? Call us or reply to the confirmation email.
      </div>
    </div>
  )
}
