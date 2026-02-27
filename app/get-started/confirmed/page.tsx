'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Phone, Paintbrush, Truck, Star, ArrowRight } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { getFunnel, clearFunnel } from '@/lib/funnelState'

const NEXT_STEPS = [
  { icon: Phone, label: 'Account manager reaches out', desc: 'Within 24 hours via phone or email', color: '#4f7fff', delay: 0.3 },
  { icon: Paintbrush, label: 'Design consultation', desc: 'We gather your vision and create a mockup', color: '#8b5cf6', delay: 0.4 },
  { icon: Star, label: 'Review & approve design', desc: 'Make changes until you love it', color: '#f59e0b', delay: 0.5 },
  { icon: Truck, label: 'Professional installation', desc: 'Expert install, typically 1-2 days', color: '#22c07a', delay: 0.6 },
]

export default function ConfirmedPage() {
  const [funnel, setFunnelState] = useState<ReturnType<typeof getFunnel>>({})

  useEffect(() => {
    setFunnelState(getFunnel())

    // Fire confetti
    import('canvas-confetti').then(({ default: confetti }) => {
      const duration = 3000
      const end = Date.now() + duration
      const colors = ['#4f7fff', '#22c07a', '#22d3ee', '#8b5cf6', '#f59e0b']

      function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }).catch((error) => { console.error(error); })

    // Clear funnel state after a short delay
    const t = setTimeout(() => clearFunnel(), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <FunnelShell step={9} backHref={null}>
      <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          style={{ display: 'inline-block', marginBottom: 24 }}
        >
          <div style={{ background: 'linear-gradient(135deg, #22c07a22, #22c07a44)', border: '2px solid #22c07a', borderRadius: '50%', padding: 20, display: 'inline-flex' }}>
            <CheckCircle size={52} color="#22c07a" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 800, color: '#e8eaed', margin: '0 0 12px', lineHeight: 1.1 }}
        >
          {"You're all set!"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ color: '#9299b5', fontSize: 16, marginBottom: 8 }}
        >
          {funnel.fullName ? `Thanks, ${funnel.fullName.split(' ')[0]}!` : 'Thank you!'} Your request has been received.
        </motion.p>

        {funnel.vehicleYear && funnel.vehicleMake && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            style={{ display: 'inline-block', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: '8px 16px', marginBottom: 40, fontSize: 14, color: '#9299b5' }}
          >
            {funnel.vehicleYear} {funnel.vehicleMake} {funnel.vehicleModel} &mdash; {funnel.coverageType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </motion.div>
        )}

        {/* Next steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 20, padding: '24px 20px', marginBottom: 32, textAlign: 'left' }}
        >
          <div style={{ fontWeight: 700, color: '#e8eaed', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRight size={16} color="#4f7fff" />
            {"Here's what happens next"}
          </div>
          {NEXT_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.delay }}
                style={{ display: 'flex', gap: 14, marginBottom: i < NEXT_STEPS.length - 1 ? 18 : 0, alignItems: 'flex-start' }}
              >
                <div style={{ background: `${step.color}22`, border: `1px solid ${step.color}44`, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                  <Icon size={18} color={step.color} />
                </div>
                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontWeight: 600, color: '#e8eaed', fontSize: 14 }}>{step.label}</div>
                  <div style={{ color: '#9299b5', fontSize: 12, marginTop: 3 }}>{step.desc}</div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Contact info reminder */}
        {funnel.email && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            style={{ background: '#4f7fff11', border: '1px solid #4f7fff33', borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}
          >
            <div style={{ fontSize: 13, color: '#9299b5' }}>
              Confirmation sent to <span style={{ color: '#4f7fff', fontWeight: 600 }}>{funnel.email}</span>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ fontSize: 13, color: '#5a6080' }}
        >
          Questions? Call us at{' '}
          <a href="mailto:info@usawrapco.com" style={{ color: '#4f7fff', textDecoration: 'none' }}>
            info@usawrapco.com
          </a>
        </motion.div>
      </div>
    </FunnelShell>
  )
}
