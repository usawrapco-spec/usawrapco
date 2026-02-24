'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Calendar, Download } from 'lucide-react'

interface SuccessStepProps {
  packageName: string
  total: number
  depositAmount: number
  colors: any
}

export default function SuccessStep({
  packageName, total, depositAmount, colors: C,
}: SuccessStepProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const balance = total - depositAmount

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px 80px', textAlign: 'center' }}>
      {/* Confetti */}
      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: -20,
                left: `${Math.random() * 100}%`,
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                background: ['#f59e0b', '#22c07a', '#4f7fff', '#f25a5a', '#8b5cf6', '#22d3ee'][Math.floor(Math.random() * 6)],
                animation: `confetti-fall ${2 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 1}s`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}

      {/* Success icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
        background: `linear-gradient(135deg, rgba(34,192,122,0.2), rgba(34,192,122,0.05))`,
        border: `2px solid ${C.green}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <CheckCircle2 size={40} style={{ color: C.green }} />
      </div>

      <div style={{
        fontSize: 32, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
        marginBottom: 8, color: C.text1,
      }}>
        You&apos;re Booked!
      </div>
      <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.6, marginBottom: 32 }}>
        We&apos;ll be in touch shortly to schedule your installation.
        A confirmation has been sent to your email.
      </div>

      {/* Summary card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 24, marginBottom: 24, textAlign: 'left',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          color: C.text3, marginBottom: 16,
        }}>
          Order Summary
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: C.text2 }}>Package</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{packageName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: C.text2 }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
            ${total.toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>Deposit Paid</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: 'JetBrains Mono, monospace' }}>
            -${depositAmount.toLocaleString()}
          </span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 14, color: C.text3 }}>Remaining Balance</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
            ${balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={() => {
            // Simple calendar event download
            const event = [
              'BEGIN:VCALENDAR',
              'BEGIN:VEVENT',
              `SUMMARY:Vehicle Wrap - USA Wrap Co`,
              `DESCRIPTION:Package: ${packageName}`,
              'END:VEVENT',
              'END:VCALENDAR',
            ].join('\n')
            const blob = new Blob([event], { type: 'text/calendar' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'wrap-appointment.ics'
            a.click()
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
            color: C.text2, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Calendar size={16} /> Add to Calendar
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 48, fontSize: 12, color: C.text3 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>USA WRAP CO</div>
        <div>Questions? Call us or reply to your confirmation email.</div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pop-in {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
