'use client'

import { useState } from 'react'
import { Wand2, Download, RefreshCw, AlertCircle, ImageIcon } from 'lucide-react'
import type { Profile } from '@/types'

interface Props { profile: Profile }

const VEHICLE_TYPES = [
  'Cargo Van', 'Sprinter Van', 'Box Truck', 'Semi Truck', 'Pickup Truck',
  'SUV', 'Sedan', 'Trailer', 'Bus', 'Food Truck',
]
const VEHICLE_COLORS = ['White', 'Black', 'Silver', 'Gray', 'Blue', 'Red']
const WRAP_STYLES = [
  'Full color change', 'Company branding / logo', 'Bold geometric design',
  'Minimalist clean look', 'Aggressive / racing style', 'Luxury / premium look',
  'Nature / landscape theme', 'Technology / digital theme',
]

export default function MockupToolClient({ profile }: Props) {
  const [vehicleType, setVehicleType]   = useState('Cargo Van')
  const [vehicleColor, setVehicleColor] = useState('White')
  const [wrapStyle, setWrapStyle]       = useState('Company branding / logo')
  const [colors, setColors]             = useState('')
  const [description, setDescription]  = useState('')
  const [generating, setGenerating]     = useState(false)
  const [error, setError]               = useState('')
  const [predictionId, setPredictionId] = useState('')
  const [imageUrl, setImageUrl]         = useState('')
  const [pollCount, setPollCount]       = useState(0)

  const generate = async () => {
    setGenerating(true)
    setError('')
    setImageUrl('')

    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleType, vehicleColor, wrapStyle,
          colors: colors || 'brand colors',
          designDescription: description || wrapStyle,
          style: 'commercial vehicle wrap',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Generation failed')
        setGenerating(false)
        return
      }
      setPredictionId(data.predictionId)
      // Start polling
      pollForResult(data.predictionId, 0)
    } catch {
      setError('Network error. Please try again.')
      setGenerating(false)
    }
  }

  const pollForResult = async (id: string, count: number) => {
    if (count > 30) {
      setError('Generation timed out. Please try again.')
      setGenerating(false)
      return
    }
    try {
      const res = await fetch(`/api/ai/generate-mockup?id=${id}`)
      const data = await res.json()
      if (data.status === 'succeeded' && data.imageUrl) {
        setImageUrl(data.imageUrl)
        setGenerating(false)
        setPollCount(0)
      } else if (data.status === 'failed') {
        setError(data.error || 'Generation failed')
        setGenerating(false)
      } else {
        // Still processing — poll again in 2s
        setPollCount(count + 1)
        setTimeout(() => pollForResult(id, count + 1), 2000)
      }
    } catch {
      setTimeout(() => pollForResult(id, count + 1), 2000)
    }
  }

  const S: Record<string, React.CSSProperties> = {
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
    select: { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' },
    input: { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' },
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' },
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>
          AI Mockup Tool
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Generate photorealistic vehicle wrap mockups using AI. Powered by Flux Pro.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={S.card}>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Vehicle Type</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={S.select}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Vehicle Color</label>
              <select value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} style={S.select}>
                {VEHICLE_COLORS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Wrap Style</label>
              <select value={wrapStyle} onChange={e => setWrapStyle(e.target.value)} style={S.select}>
                {WRAP_STYLES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Colors (optional)</label>
              <input
                value={colors}
                onChange={e => setColors(e.target.value)}
                placeholder="e.g. blue and white, red and black"
                style={S.input}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Additional Details</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe specific elements, logos, text, or design details..."
                rows={4}
                style={{ ...S.input, resize: 'vertical' as const }}
              />
            </div>
            <button
              onClick={generate}
              disabled={generating}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: generating ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: generating ? 'var(--text3)' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating{pollCount > 0 ? ` (${pollCount * 2}s)` : '...'}
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Generate Mockup
                </>
              )}
            </button>
          </div>

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Generated mockup"
                style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8, objectFit: 'contain' }}
              />
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <a
                  href={imageUrl}
                  download="mockup.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={generate}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text2)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <RefreshCw size={14} /> Regenerate
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
              <ImageIcon size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14 }}>
                {generating ? 'Generating your mockup...' : 'Configure options and click Generate'}
              </div>
              {generating && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                  This takes 20–40 seconds
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
