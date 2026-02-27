'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, TrendingUp, DollarSign, Target, Zap, CalendarCheck } from 'lucide-react'
import Link from 'next/link'
import QRCode from 'qrcode'

interface Props {
  formData: {
    trackingCode: string
    monthlyImpressions: number
    monthlyLeads: number
    monthlyRevenue: number
    annualRevenue: number
    roiMultiplier: number
    effectiveCPM: number
    name: string
    email: string
  }
}

export default function PublicThankYou({ formData }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/track/${formData.trackingCode}`
    : `/api/track/${formData.trackingCode}`

  useEffect(() => {
    if (!formData.trackingCode) return
    QRCode.toDataURL(trackingUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(setQrDataUrl).catch(console.error)
  }, [formData.trackingCode, trackingUrl])

  return (
    <div>
      {/* Success Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,192,122,0.1), rgba(79,127,255,0.1))',
        border: '1px solid rgba(34,192,122,0.3)',
        borderRadius: 14,
        padding: 32,
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <CheckCircle size={48} style={{ color: 'var(--green)', marginBottom: 12 }} />
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          fontFamily: 'Barlow Condensed, sans-serif',
          color: 'var(--text1)',
          margin: '0 0 6px',
        }}>
          Your ROI Report is Ready!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>
          {formData.name ? `Thanks, ${formData.name}!` : 'Thanks!'} Here are your projected results.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
        marginBottom: 20,
      }}>
        {[
          {
            label: 'Monthly Impressions',
            value: (formData.monthlyImpressions || 0).toLocaleString(),
            icon: Target,
            color: 'var(--accent)',
          },
          {
            label: 'Monthly Leads',
            value: (formData.monthlyLeads || 0).toString(),
            icon: TrendingUp,
            color: 'var(--cyan)',
          },
          {
            label: 'Annual Revenue',
            value: `$${(formData.annualRevenue || 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'var(--green)',
          },
          {
            label: 'ROI Multiplier',
            value: `${formData.roiMultiplier || 0}x`,
            icon: Zap,
            color: 'var(--purple)',
          },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <stat.icon size={14} style={{ color: stat.color }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              fontFamily: 'JetBrains Mono, monospace',
              color: stat.color,
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tracking Code + QR */}
      {formData.trackingCode && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 24,
          textAlign: 'center',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Tracking Code
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 900,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--accent)',
            letterSpacing: '0.15em',
            marginBottom: 12,
          }}>
            {formData.trackingCode}
          </div>

          {qrDataUrl && (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              display: 'inline-block',
              marginBottom: 12,
            }}>
              <img src={qrDataUrl} alt="QR Code" style={{ width: 160, height: 160, display: 'block' }} />
            </div>
          )}

          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 4px' }}>
            This code will be placed on your vehicle wrap.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
            When customers scan it, we track the lead back to your wrap.
          </p>
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link
          href="/book"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px',
            borderRadius: 10,
            background: 'var(--green)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <CalendarCheck size={18} />
          Book Your Wrap
        </Link>
        <div style={{
          textAlign: 'center',
          padding: '12px',
          fontSize: 13,
          color: 'var(--text2)',
        }}>
          We'll reach out within 24 hours to discuss your project.
        </div>
      </div>
    </div>
  )
}
