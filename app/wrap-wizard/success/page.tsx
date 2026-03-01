'use client'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Suspense } from 'react'

function SuccessContent() {
  const _params = useSearchParams()
  return (
    <div style={{ minHeight: '100vh', background: '#060d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <CheckCircle size={64} color="#22c07a" style={{ margin: '0 auto 20px', display: 'block' }} />
        <h1 style={{ color: '#ffffff', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>You&apos;re locked in!</h1>
        <p style={{ color: '#8899aa', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Your $250 design deposit is confirmed. Our team will reach out within 1 business day to schedule your design consultation and finalize everything.
        </p>
        <div style={{ background: '#0d1526', border: '1px solid #1e2d45', borderRadius: 12, padding: 20, textAlign: 'left' }}>
          <div style={{ color: '#64d2ff', fontWeight: 700, marginBottom: 12 }}>What happens next:</div>
          {[
            'Team reviews your AI concepts',
            'Designer refines your chosen concept',
            'You approve final design (2 revision rounds)',
            'We print & schedule installation',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a3a5a', color: '#64d2ff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ color: '#c0cce0', fontSize: 14 }}>{item}</span>
            </div>
          ))}
        </div>
        <p style={{ color: '#505a6b', fontSize: 13, marginTop: 20 }}>Questions? Text us at (253) 555-0100 or email fleet@usawrapco.com</p>
      </div>
    </div>
  )
}

export default function WrapWizardSuccess() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
