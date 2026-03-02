'use client'

import { useState, useRef } from 'react'
import {
  Palette, Building2, Phone, Globe, Type, Wand2,
  RefreshCw, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Download, Share2, ArrowRight, Loader2, Upload, X,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface BrandInfo {
  companyName: string
  industry: string
  phone: string
  website: string
  tagline: string
  colorScheme: string
  brandColors: string[]
  wrapStyle: string
  vehicleColor: string
  specificElements: string
}

interface MockupVariation {
  id: number
  imageUrl: string | null
  predictionId: string | null
  status: 'pending' | 'generating' | 'done' | 'error'
  prompt?: string
}

interface Props {
  vehicleYear?: string
  vehicleMake?: string
  vehicleModel?: string
  onApprove?: (imageUrl: string, brandInfo: BrandInfo) => void
}

const INDUSTRIES = [
  'Plumbing', 'HVAC', 'Electrical', 'Landscaping', 'Construction',
  'Roofing', 'Painting', 'Cleaning', 'Food & Beverage', 'Healthcare',
  'Real Estate', 'Transportation', 'Retail', 'Technology', 'Other',
]

const WRAP_STYLES = [
  'Company Branding / Logo', 'Full Color Change', 'Racing / Sport Stripes',
  'Geometric / Abstract', 'Gradient / Color Fade', 'Minimalist / Clean',
  'Bold & Aggressive',
]

const VIEW_ANGLES = ['Driver Side', 'Passenger Side', 'Front 3/4', 'Rear 3/4', 'Full Front']

const PRESET_COLORS = ['#1e3a5f', '#c0392b', '#27ae60', '#f39c12', '#8e44ad', '#2c3e50', '#e74c3c', '#000000']

export default function MockupGenerator({ vehicleYear, vehicleMake, vehicleModel, onApprove }: Props) {
  const [phase, setPhase] = useState<'form' | 'generating' | 'results' | 'refine'>('form')
  const [brandInfo, setBrandInfo] = useState<BrandInfo>({
    companyName: '',
    industry: '',
    phone: '',
    website: '',
    tagline: '',
    colorScheme: '',
    brandColors: [],
    wrapStyle: 'Company Branding / Logo',
    vehicleColor: 'White',
    specificElements: '',
  })
  const [selectedAngle, setSelectedAngle] = useState(0)
  const [variations, setVariations] = useState<MockupVariation[]>([])
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoBase64, setLogoBase64] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addBrandColor = (color: string) => {
    if (!brandInfo.brandColors.includes(color) && brandInfo.brandColors.length < 4) {
      setBrandInfo(b => ({ ...b, brandColors: [...b.brandColors, color] }))
    }
  }

  const removeBrandColor = (color: string) => {
    setBrandInfo(b => ({ ...b, brandColors: b.brandColors.filter(c => c !== color) }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (typeof ev.target?.result === 'string') setLogoBase64(ev.target.result) }
    reader.readAsDataURL(file)
  }

  const generateMockup = async (angle: string, variationIndex: number) => {
    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: vehicleYear || '',
          make: vehicleMake || '',
          model: vehicleModel || '',
          vehicleColor: brandInfo.vehicleColor,
          viewAngle: angle,
          wrapStyle: brandInfo.wrapStyle,
          companyName: brandInfo.companyName,
          industry: brandInfo.industry,
          brandColors: brandInfo.brandColors,
          colorScheme: brandInfo.colorScheme,
          specificElements: `${brandInfo.tagline ? 'Tagline context: ' + brandInfo.tagline + '. ' : ''}${brandInfo.specificElements}`,
          logoBase64: logoBase64 || undefined,
          websiteUrl: brandInfo.website || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      if (data.status === 'succeeded') {
        setVariations(prev => {
          const updated = [...prev]
          updated[variationIndex] = { ...updated[variationIndex], status: 'done', imageUrl: data.imageUrl }
          return updated
        })
      } else if (data.predictionId) {
        // Poll until done
        const predId = data.predictionId
        setVariations(prev => {
          const updated = [...prev]
          updated[variationIndex] = { ...updated[variationIndex], predictionId: predId }
          return updated
        })
        await pollUntilDone(predId, variationIndex)
      }
    } catch (err) {
      setVariations(prev => {
        const updated = [...prev]
        updated[variationIndex] = { ...updated[variationIndex], status: 'error' }
        return updated
      })
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }

  const pollUntilDone = async (predictionId: string, variationIndex: number) => {
    const maxAttempts = 40
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const res = await fetch(`/api/ai/generate-mockup?id=${predictionId}`)
        const data = await res.json()
        if (data.status === 'succeeded' && data.imageUrl) {
          setVariations(prev => {
            const updated = [...prev]
            updated[variationIndex] = { ...updated[variationIndex], status: 'done', imageUrl: data.imageUrl }
            return updated
          })
          return
        }
        if (data.status === 'failed' || data.status === 'canceled') {
          setVariations(prev => {
            const updated = [...prev]
            updated[variationIndex] = { ...updated[variationIndex], status: 'error' }
            return updated
          })
          return
        }
      } catch { /* continue polling */ }
    }
    // Timeout
    setVariations(prev => {
      const updated = [...prev]
      updated[variationIndex] = { ...updated[variationIndex], status: 'error' }
      return updated
    })
  }

  const handleGenerate = async () => {
    if (!brandInfo.companyName || !brandInfo.industry) {
      setError('Please fill in company name and industry')
      return
    }
    setError(null)
    setPhase('generating')

    // Generate 4 variations with different angles
    const angles = VIEW_ANGLES.slice(0, 4)
    const initialVariations: MockupVariation[] = angles.map((_, i) => ({
      id: i, imageUrl: null, predictionId: null, status: 'generating',
    }))
    setVariations(initialVariations)

    // Start all 4 in parallel (staggered slightly to avoid API overload)
    await Promise.all(
      angles.map((angle, i) =>
        new Promise<void>(resolve => {
          setTimeout(async () => {
            await generateMockup(angle, i)
            resolve()
          }, i * 800)
        })
      )
    )
    setPhase('results')
  }

  const handleRefine = async () => {
    if (selectedVariation === null || !refinePrompt.trim()) return
    setIsRefining(true)
    setError(null)

    const current = variations[selectedVariation]
    const angle = VIEW_ANGLES[selectedVariation] || VIEW_ANGLES[0]

    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: vehicleYear || '',
          make: vehicleMake || '',
          model: vehicleModel || '',
          vehicleColor: brandInfo.vehicleColor,
          viewAngle: angle,
          wrapStyle: brandInfo.wrapStyle,
          companyName: brandInfo.companyName,
          industry: brandInfo.industry,
          brandColors: brandInfo.brandColors,
          colorScheme: brandInfo.colorScheme,
          specificElements: refinePrompt,
          logoBase64: logoBase64 || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refinement failed')

      if (data.status === 'succeeded') {
        setVariations(prev => {
          const updated = [...prev]
          updated[selectedVariation] = { ...updated[selectedVariation], imageUrl: data.imageUrl, status: 'done' }
          return updated
        })
      } else if (data.predictionId) {
        setVariations(prev => {
          const updated = [...prev]
          updated[selectedVariation] = { ...updated[selectedVariation], status: 'generating' }
          return updated
        })
        await pollUntilDone(data.predictionId, selectedVariation)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIsRefining(false)
      setRefinePrompt('')
    }
  }

  // ── FORM PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'form') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Palette size={18} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Tell us about your brand</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                {vehicleMake && vehicleModel ? `AI will design for your ${vehicleYear} ${vehicleMake} ${vehicleModel}` : 'AI will generate 4 unique wrap concepts'}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(242,90,90,0.12)', border: '1px solid rgba(242,90,90,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8, color: '#f25a5a', fontSize: 13,
            }}>
              <AlertCircle size={14} />{error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Company name + industry row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Company Name *</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    type="text" placeholder="Jackson Plumbing Co."
                    value={brandInfo.companyName}
                    onChange={e => setBrandInfo(b => ({ ...b, companyName: e.target.value }))}
                    style={{ ...inputStyle, paddingLeft: 36 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Industry *</label>
                <select
                  value={brandInfo.industry}
                  onChange={e => setBrandInfo(b => ({ ...b, industry: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' as const }}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            {/* Phone + website row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    type="tel" placeholder="(206) 555-0100"
                    value={brandInfo.phone}
                    onChange={e => setBrandInfo(b => ({ ...b, phone: e.target.value }))}
                    style={{ ...inputStyle, paddingLeft: 36 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    type="text" placeholder="jacksonplumbing.com"
                    value={brandInfo.website}
                    onChange={e => setBrandInfo(b => ({ ...b, website: e.target.value }))}
                    style={{ ...inputStyle, paddingLeft: 36 }}
                  />
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label style={labelStyle}>Tagline / Slogan</label>
              <div style={{ position: 'relative' }}>
                <Type size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  type="text" placeholder='"We fix it right, the first time"'
                  value={brandInfo.tagline}
                  onChange={e => setBrandInfo(b => ({ ...b, tagline: e.target.value }))}
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Wrap style */}
            <div>
              <label style={labelStyle}>Wrap Style</label>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {WRAP_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setBrandInfo(b => ({ ...b, wrapStyle: style }))}
                    style={{
                      padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: brandInfo.wrapStyle === style ? 'rgba(245,158,11,0.2)' : 'var(--surface2)',
                      border: `1px solid ${brandInfo.wrapStyle === style ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                      color: brandInfo.wrapStyle === style ? '#f59e0b' : 'var(--text2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand colors */}
            <div>
              <label style={labelStyle}>Brand Colors (pick up to 4)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                {PRESET_COLORS.map(color => (
                  <div
                    key={color}
                    onClick={() => brandInfo.brandColors.includes(color) ? removeBrandColor(color) : addBrandColor(color)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: color, cursor: 'pointer',
                      border: `3px solid ${brandInfo.brandColors.includes(color) ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {brandInfo.brandColors.includes(color) && <CheckCircle size={14} color="#fff" />}
                  </div>
                ))}
                <input
                  type="color"
                  onChange={e => addBrandColor(e.target.value)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', background: 'var(--surface2)', cursor: 'pointer', padding: 2 }}
                  title="Custom color"
                />
              </div>
              {brandInfo.brandColors.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' as const }}>
                  {brandInfo.brandColors.map(color => (
                    <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', borderRadius: 20, padding: '4px 10px 4px 6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{color}</span>
                      <X size={10} color="var(--text3)" style={{ cursor: 'pointer' }} onClick={() => removeBrandColor(color)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logo upload */}
            <div>
              <label style={labelStyle}>Logo (optional)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '14px 20px',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  background: logoBase64 ? 'rgba(34,192,122,0.06)' : 'var(--surface2)',
                }}
              >
                {logoBase64 ? (
                  <>
                    <img src={logoBase64} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />
                    <div>
                      <div style={{ fontSize: 13, color: '#22c07a', fontWeight: 600 }}>Logo uploaded</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Click to change</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={16} color="var(--text3)" />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Upload your logo</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>PNG or JPG — AI will analyze brand colors</div>
                    </div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>

            {/* Vehicle color + additional notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Vehicle Base Color</label>
                <select
                  value={brandInfo.vehicleColor}
                  onChange={e => setBrandInfo(b => ({ ...b, vehicleColor: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' as const }}
                >
                  {['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Specific Design Notes</label>
                <input
                  type="text" placeholder="Make logo large on side, add phone number prominently..."
                  value={brandInfo.specificElements}
                  onChange={e => setBrandInfo(b => ({ ...b, specificElements: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!brandInfo.companyName || !brandInfo.industry}
            style={{
              marginTop: 24, width: '100%', padding: '16px 20px', borderRadius: 10,
              background: brandInfo.companyName && brandInfo.industry ? '#f59e0b' : 'rgba(255,255,255,0.06)',
              color: brandInfo.companyName && brandInfo.industry ? '#000' : 'var(--text3)',
              border: 'none', fontSize: 16, fontWeight: 800, cursor: brandInfo.companyName && brandInfo.industry ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Wand2 size={18} />
            Generate 4 AI Wrap Concepts
          </button>
        </div>
      </div>
    )
  }

  // ── GENERATING PHASE ────────────────────────────────────────────────────────
  if (phase === 'generating' || (phase === 'results' && variations.some(v => v.status === 'generating'))) {
    const doneCount = variations.filter(v => v.status === 'done').length
    const totalCount = variations.length || 4

    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 40, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wand2 size={28} color="#f59e0b" style={{ animation: 'spin 2s linear infinite' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
            AI is designing your wraps
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>
            Generating {totalCount} unique concepts for {brandInfo.companyName}...
          </div>

          {/* Progress grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(variations.length > 0 ? variations : Array(4).fill({ status: 'generating' })).map((v, i) => (
              <div key={i} style={{
                aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden',
                background: v.status === 'done' ? 'transparent' : 'var(--surface2)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative' as const,
              }}>
                {v.status === 'done' && v.imageUrl ? (
                  <img src={v.imageUrl} alt={`Concept ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : v.status === 'error' ? (
                  <div style={{ textAlign: 'center', color: '#f25a5a' }}>
                    <AlertCircle size={20} />
                    <div style={{ fontSize: 11, marginTop: 4 }}>Failed</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontSize: 11, marginTop: 6 }}>Concept {i + 1}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text3)' }}>
            {doneCount}/{totalCount} complete — this takes 30-60 seconds
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── RESULTS PHASE ───────────────────────────────────────────────────────────
  if (phase === 'results') {
    const selected = selectedVariation !== null ? variations[selectedVariation] : null

    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {error && (
          <div style={{
            background: 'rgba(242,90,90,0.12)', border: '1px solid rgba(242,90,90,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8, color: '#f25a5a', fontSize: 13,
          }}>
            <AlertCircle size={14} />{error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f25a5a', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Choose your favorite</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{brandInfo.companyName} — click to select</div>
            </div>
            <button
              onClick={() => { setPhase('form'); setVariations([]) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
            >
              <RefreshCw size={13} />
              Start Over
            </button>
          </div>

          {/* 2x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {variations.map((v, i) => (
              <div
                key={i}
                onClick={() => v.status === 'done' && setSelectedVariation(selectedVariation === i ? null : i)}
                style={{
                  borderRadius: 10, overflow: 'hidden', position: 'relative' as const,
                  aspectRatio: '16/9', cursor: v.status === 'done' ? 'pointer' : 'default',
                  border: `3px solid ${selectedVariation === i ? '#f59e0b' : 'rgba(255,255,255,0.06)'}`,
                  background: 'var(--surface2)',
                  transition: 'border-color 0.15s',
                }}
              >
                {v.status === 'done' && v.imageUrl ? (
                  <>
                    <img src={v.imageUrl} alt={`Concept ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute' as const, top: 8, left: 8,
                      background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#fff',
                    }}>
                      {VIEW_ANGLES[i] || `Concept ${i+1}`}
                    </div>
                    {selectedVariation === i && (
                      <div style={{
                        position: 'absolute' as const, inset: 0, background: 'rgba(245,158,11,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ background: '#f59e0b', borderRadius: '50%', padding: 6 }}>
                          <CheckCircle size={20} color="#000" />
                        </div>
                      </div>
                    )}
                  </>
                ) : v.status === 'error' ? (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', color: '#f25a5a', gap: 6 }}>
                    <AlertCircle size={20} />
                    <span style={{ fontSize: 11 }}>Failed to generate</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', gap: 6 }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 11 }}>Generating...</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Refine + approve section */}
          {selectedVariation !== null && selected?.status === 'done' && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>
                Refine Concept {selectedVariation + 1}
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder='e.g. "Make it bolder", "Add red accents", "More blue in the design"'
                  value={refinePrompt}
                  onChange={e => setRefinePrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isRefining && handleRefine()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleRefine}
                  disabled={!refinePrompt.trim() || isRefining}
                  style={{
                    padding: '10px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: isRefining || !refinePrompt.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const, flexShrink: 0,
                  }}
                >
                  {isRefining ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                  Refine
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => onApprove?.(selected.imageUrl!, brandInfo)}
                  style={{
                    flex: 1, padding: '14px 20px', borderRadius: 10,
                    background: '#f59e0b', color: '#000',
                    border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <CheckCircle size={17} />
                  Approve This Design — Pay $250 Deposit
                </button>
                <a
                  href={selected.imageUrl!} download={`${brandInfo.companyName}-wrap-concept.webp`} target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: '14px 16px', borderRadius: 10, background: 'var(--surface2)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Download size={17} />
                </a>
              </div>
            </div>
          )}

          {selectedVariation === null && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '10px 0' }}>
              Click a concept above to select it, then refine or approve
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return null
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text1)', fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}
