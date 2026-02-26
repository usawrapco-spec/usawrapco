'use client'

import { useState, useEffect } from 'react'
import { QrCode, Download, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'

interface QRGeneratorProps {
  slug: string
  trackingUrl?: string
  vehicleLabel?: string
  campaignId?: string
  onComplete?: () => void
}

export default function QRGenerator({ slug, trackingUrl: trackingUrlProp, vehicleLabel, campaignId, onComplete }: QRGeneratorProps) {
  const trackingUrl = trackingUrlProp || (typeof window !== 'undefined' ? `${window.location.origin}/api/track/${slug}` : `/api/track/${slug}`)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate QR code on mount
  useEffect(() => {
    async function generateQR() {
      try {
        const url = await QRCode.toDataURL(trackingUrl, {
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
  }, [trackingUrl])

  const downloadQR = async () => {
    try {
      // Generate fresh 2000x2000 PNG for print-ready download
      const highResUrl = await QRCode.toDataURL(trackingUrl, {
        width: 2000,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })
      const a = document.createElement('a')
      a.href = highResUrl
      a.download = `wrap-qr-${slug}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('QR download failed:', err)
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 24,
      textAlign: 'center',
    }}>
      {/* Title */}
      {vehicleLabel && (
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text1)',
          marginBottom: 4,
        }}>
          {vehicleLabel}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
      }}>
        <QrCode size={18} style={{ color: 'var(--cyan)' }} />
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text2)',
        }}>
          Tracking QR Code
        </span>
      </div>

      {/* QR Code Display */}
      {qrDataUrl ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          display: 'inline-block',
          marginBottom: 16,
        }}>
          <img
            src={qrDataUrl}
            alt="QR Code"
            style={{ width: 200, height: 200, display: 'block' }}
          />
        </div>
      ) : (
        <div style={{
          width: 240,
          height: 240,
          borderRadius: 12,
          background: 'var(--surface2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>Generating...</span>
        </div>
      )}

      {/* Tracking URL */}
      <div style={{
        fontSize: 12,
        color: 'var(--text3)',
        marginBottom: 16,
        wordBreak: 'break-all',
        padding: '0 12px',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {trackingUrl}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={downloadQR}
          disabled={!qrDataUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: qrDataUrl ? 'pointer' : 'not-allowed',
            opacity: qrDataUrl ? 1 : 0.5,
          }}
        >
          <Download size={14} />
          Download QR (Print-Ready)
        </button>

        <button
          onClick={copyUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 8,
            background: 'var(--surface2)',
            color: copied ? 'var(--green)' : 'var(--text1)',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>
    </div>
  )
}
