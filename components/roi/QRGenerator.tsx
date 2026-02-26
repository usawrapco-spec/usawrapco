'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, Download, Phone, Copy, Check } from 'lucide-react'

interface QRGeneratorProps {
  campaignId: string
  slug: string
  trackingPhone?: string
  qrCodeUrl?: string
  onComplete?: () => void
}

export default function QRGenerator({ campaignId, slug, trackingPhone, qrCodeUrl, onComplete }: QRGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [areaCode, setAreaCode] = useState('')
  const [forwardTo, setForwardTo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [phone, setPhone] = useState(trackingPhone || '')
  const [copied, setCopied] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.usawrapco.com'}/api/track/${slug}`

  // Generate QR code
  useEffect(() => {
    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(qrCodeUrl || trackingUrl, {
          width: 2000,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        })
        setQrDataUrl(url)
      } catch (err) {
        console.error('QR generation failed:', err)
      }
    }
    generateQR()
  }, [slug, qrCodeUrl, trackingUrl])

  const generateNumber = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/twilio/generate-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaCode: areaCode || undefined,
          campaignId,
          forwardTo: forwardTo || undefined,
        }),
      })
      const data = await res.json()
      if (data.trackingNumber) {
        setPhone(data.trackingNumber)
        if (data.demo) setDemoMode(true)
      }
    } catch (err) {
      console.error('Number generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  const downloadQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `wrap-qr-${slug}.png`
    a.click()
  }

  const copyPhone = () => {
    if (phone) {
      navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <QrCode size={20} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
          Tracking Setup
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left — Phone number generation */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>
            Tracking Phone Number
          </div>

          {phone ? (
            <div>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--green)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                  Your Tracking Number
                </div>
                <div style={{
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--green)',
                  letterSpacing: 1,
                }}>
                  {formatPhone(phone)}
                </div>
                <button onClick={copyPhone} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 8,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'var(--surface2)',
                  color: copied ? 'var(--green)' : 'var(--text2)',
                  fontSize: 12,
                  border: 'none',
                  cursor: 'pointer',
                }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {demoMode && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 11,
                  color: 'var(--amber)',
                  marginBottom: 12,
                }}>
                  Demo mode — configure Twilio env vars for real tracking numbers
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Area Code Preference</label>
                <input
                  value={areaCode}
                  onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="e.g. 214"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Forward Calls To</label>
                <input
                  value={forwardTo}
                  onChange={e => setForwardTo(e.target.value)}
                  placeholder="Your real phone number"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={generateNumber}
                disabled={generating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: generating ? 'not-allowed' : 'pointer',
                }}
              >
                <Phone size={16} />
                {generating ? 'Generating...' : 'Generate Tracking Number'}
              </button>
            </div>
          )}
        </div>

        {/* Right — QR Code */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12, textAlign: 'left' }}>
            QR Code
          </div>
          {qrDataUrl ? (
            <div>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                padding: 20,
                display: 'inline-block',
                marginBottom: 12,
              }}>
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  style={{ width: 200, height: 200 }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, wordBreak: 'break-all' }}>
                {trackingUrl}
              </div>
              <button onClick={downloadQR} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--surface2)',
                color: 'var(--text1)',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}>
                <Download size={14} />
                Download QR (2000x2000)
              </button>
            </div>
          ) : (
            <div style={{ padding: 40, color: 'var(--text3)', fontSize: 13 }}>
              Generating QR code...
            </div>
          )}
        </div>
      </div>

      {/* Continue button */}
      {onComplete && phone && (
        <button
          onClick={onComplete}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            background: 'var(--green)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            marginTop: 24,
          }}
        >
          Go to Campaign Portal
        </button>
      )}
    </div>
  )
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--text1)',
  fontSize: 14,
  outline: 'none',
}
