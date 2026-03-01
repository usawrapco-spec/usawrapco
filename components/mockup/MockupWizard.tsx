'use client'

import { useState, useRef, useCallback } from 'react'
import {
  ChevronRight, ChevronLeft, Upload, Loader2, Play,
  Lock, Check, Sparkles, Car,
} from 'lucide-react'
import { MockupState, INDUSTRIES, STYLE_VIBES, estimateWrapPrice } from '@/lib/mockup/types'

const STEPS = ['Vehicle', 'Brand', 'Style', 'Your Concepts', 'Book It']

const BRAND_COLORS_PRESET = [
  '#1a1a2e', '#16213e', '#0f3460', '#e94560',
  '#2d6a4f', '#40916c', '#52b788', '#95d5b2',
  '#f77f00', '#fcbf49', '#eae2b7', '#d62828',
  '#3a0ca3', '#4361ee', '#4cc9f0', '#7209b7',
  '#ffffff', '#e5e5e5', '#888888', '#111111',
]

export default function MockupWizard() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<Partial<MockupState>>({
    brandColors: [],
    conceptImages: [],
    renderImages: [],
    selectedConcept: 0,
    generationStatus: 'pending',
  })

  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleResults, setVehicleResults] = useState<any[]>([])
  const [vehicleLoading, setVehicleLoading] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [customColor, setCustomColor] = useState('#000000')
  const [videoPolling, setVideoPolling] = useState(false)

  const update = useCallback((patch: Partial<MockupState>) =>
    setState(prev => ({ ...prev, ...patch })), [])

  // ── Vehicle search ─────────────────────────────────────────────────────────
  async function searchVehicles(q: string) {
    if (q.length < 2) { setVehicleResults([]); return }
    setVehicleLoading(true)
    try {
      const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(q)}&limit=8`)
      const data = await res.json()
      setVehicleResults(data.vehicles || [])
    } finally {
      setVehicleLoading(false)
    }
  }

  function selectVehicle(v: any) {
    const price = estimateWrapPrice(v.sqft_full, v.render_category || 'van')
    update({
      vehicleDbId: v.id,
      vehicleYear: String(v.year || ''),
      vehicleMake: v.make,
      vehicleModel: v.model,
      vehicleBodyStyle: v.body_style,
      renderCategory: v.render_category || 'van',
      sqftFull: v.sqft_full,
      estimatedPrice: price,
    })
    setVehicleSearch(`${v.year} ${v.make} ${v.model}`)
    setVehicleResults([])
  }

  // ── Logo upload ────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setLogoPreview(base64)
      update({ logoUrl: base64 })
      try {
        const res = await fetch('/api/mockup/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        })
        const data = await res.json()
        if (data.success && !data.skipped) {
          update({ logoNoBgUrl: data.imageBase64 })
        }
      } catch { /* silent */ }
    }
    reader.readAsDataURL(file)
  }

  // ── Generation pipeline ────────────────────────────────────────────────────
  async function generateMockups() {
    setLoading(true)
    setError('')
    update({ generationStatus: 'analyzing' })

    try {
      setLoadingMsg('Saving your info...')
      const saveRes = await fetch('/api/mockup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, generationStatus: 'analyzing' }),
      })
      const { id } = await saveRes.json()

      setLoadingMsg('Analyzing your brand with AI...')
      const analyzeRes = await fetch('/api/mockup/analyze-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: state.businessName,
          industry: state.industry,
          styleVibe: state.styleVibe,
          feelStatement: state.feelStatement,
          brandColors: state.brandColors,
          vehicleType: `${state.vehicleYear} ${state.vehicleMake} ${state.vehicleModel}`,
          logoBase64: state.logoNoBgUrl || state.logoUrl,
        }),
      })
      const { analysis } = await analyzeRes.json()
      update({ brandAnalysis: analysis, generationStatus: 'generating' })

      setLoadingMsg('Generating 3 design concepts...')
      const conceptRes = await fetch('/api/mockup/generate-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concepts: analysis.concepts }),
      })
      const { imageUrls } = await conceptRes.json()
      const validUrls: string[] = (imageUrls || []).filter(Boolean)
      update({ conceptImages: validUrls, generationStatus: 'rendering' })

      setLoadingMsg('Rendering your vehicle mockups...')
      const renderResults: string[][] = []

      for (let ci = 0; ci < validUrls.length; ci++) {
        const conceptUrl = validUrls[ci]
        const angles = ci === 0 ? [0, 1, 2] : [0]
        const angleUrls: string[] = []

        for (const angle of angles) {
          try {
            const renderRes = await fetch('/api/mockup/render-vehicle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conceptImageUrl: conceptUrl,
                renderCategory: state.renderCategory || 'van',
                vehicleYear: state.vehicleYear,
                vehicleMake: state.vehicleMake,
                vehicleModel: state.vehicleModel,
                angle,
              }),
            })
            const { imageUrl } = await renderRes.json()
            angleUrls.push(imageUrl || '')
          } catch {
            angleUrls.push('')
          }
        }
        renderResults.push(angleUrls)
      }

      update({ renderImages: renderResults, generationStatus: 'complete', id })

      await fetch('/api/mockup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...state,
          id,
          brandAnalysis: analysis,
          conceptImages: validUrls,
          renderImages: renderResults,
          generationStatus: 'complete',
        }),
      })

      setStep(3)
    } catch (err) {
      setError(String(err))
      update({ generationStatus: 'failed' })
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  // ── Video ──────────────────────────────────────────────────────────────────
  async function generateVideo() {
    const heroUrl = state.renderImages?.[state.selectedConcept || 0]?.[0]
    if (!heroUrl) return
    setVideoPolling(true)

    try {
      const res = await fetch('/api/mockup/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: heroUrl,
          vehicleType: state.renderCategory,
          businessName: state.businessName,
        }),
      })
      const { predictionId } = await res.json()
      update({ videoPredictionId: predictionId })

      const poll = async () => {
        const pollRes = await fetch(`/api/mockup/generate-video?id=${predictionId}`)
        const pollData = await pollRes.json()
        if (pollData.status === 'succeeded' && pollData.videoUrl) {
          update({ videoUrl: pollData.videoUrl })
          setVideoPolling(false)
        } else if (pollData.status === 'failed') {
          setVideoPolling(false)
        } else {
          setTimeout(poll, 3000)
        }
      }
      setTimeout(poll, 3000)
    } catch {
      setVideoPolling(false)
    }
  }

  // ── Stripe ─────────────────────────────────────────────────────────────────
  async function handleDeposit() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-mockup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockupId: state.id,
          customerEmail: state.email,
          customerName: state.customerName,
          businessName: state.businessName,
          vehicleDesc: `${state.vehicleYear} ${state.vehicleMake} ${state.vehicleModel}`,
          amount: 25000,
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page: { minHeight: '100vh', background: '#060d1a', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } as React.CSSProperties,
    header: { background: '#0a1220', borderBottom: '1px solid #1e2d45', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    logo: { color: '#64d2ff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' } as React.CSSProperties,
    container: { maxWidth: 680, margin: '0 auto', padding: '32px 20px' } as React.CSSProperties,
    card: { background: '#0d1526', border: '1px solid #1e2d45', borderRadius: 16, padding: 28 } as React.CSSProperties,
    input: { width: '100%', background: '#0a1020', border: '1px solid #2a3a55', borderRadius: 8, padding: '12px 14px', color: '#ffffff', fontSize: 15, outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
    label: { display: 'block', color: '#8899aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 6 },
    btn: { background: '#64d2ff', color: '#000000', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
    btnSec: { background: '#1a2236', color: '#c0cce0', border: '1px solid #2a3a55', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  }

  // ── Step 0: Vehicle ────────────────────────────────────────────────────────
  const stepVehicle = (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>What vehicle are we wrapping?</h2>
      <p style={{ color: '#8899aa', marginBottom: 28 }}>Search by year, make, or model. We'll show you real pricing instantly.</p>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <label style={s.label}>Search Vehicle</label>
        <input
          style={s.input}
          placeholder="e.g. 2022 Ford Transit, Sprinter, Silverado..."
          value={vehicleSearch}
          onChange={e => { setVehicleSearch(e.target.value); searchVehicles(e.target.value) }}
        />
        {vehicleLoading && (
          <div style={{ position: 'absolute', right: 12, top: 38 }}>
            <Loader2 size={16} color="#64d2ff" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {vehicleResults.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d1526', border: '1px solid #2a3a55', borderRadius: 10, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
            {vehicleResults.map((v: any) => (
              <button key={v.id} onClick={() => selectVehicle(v)}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #1a2236' }}>
                <span style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</span>
                <span style={{ color: '#505a6b', marginLeft: 8, fontSize: 12 }}>{v.body_style} &middot; {v.sqft_full} sqft</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {state.vehicleMake && (
        <div style={{ background: '#0a1020', border: '1px solid #22c07a', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{state.vehicleYear} {state.vehicleMake} {state.vehicleModel}</div>
            <div style={{ color: '#8899aa', fontSize: 13, marginTop: 2 }}>{state.vehicleBodyStyle} &middot; ~{state.sqftFull} sqft</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64d2ff', fontWeight: 800, fontSize: 22 }}>${state.estimatedPrice?.toLocaleString()}</div>
            <div style={{ color: '#505a6b', fontSize: 11 }}>estimated full wrap</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, color: '#505a6b', fontSize: 12 }}>
        Don&apos;t see your vehicle?{' '}
        <button
          onClick={() => update({ vehicleMake: 'Custom', vehicleModel: 'Vehicle', renderCategory: 'van', estimatedPrice: 3800, sqftFull: 280, vehicleYear: '', vehicleBodyStyle: '' })}
          style={{ background: 'none', border: 'none', color: '#64d2ff', cursor: 'pointer', fontSize: 12 }}>
          Continue with a custom vehicle &rarr;
        </button>
      </div>
    </div>
  )

  // ── Step 1: Brand ──────────────────────────────────────────────────────────
  const stepBrand = (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Tell us about your brand</h2>
      <p style={{ color: '#8899aa', marginBottom: 28 }}>The AI uses this to create designs that actually match your business.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={s.label}>Business Name</label>
          <input style={s.input} placeholder="Smith Plumbing LLC" value={state.businessName || ''} onChange={e => update({ businessName: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={s.label}>Phone Number</label>
            <input style={s.input} placeholder="(253) 555-0100" value={state.phone || ''} onChange={e => update({ phone: e.target.value })} />
          </div>
          <div>
            <label style={s.label}>Website (optional)</label>
            <input style={s.input} placeholder="smithplumbing.com" value={state.website || ''} onChange={e => update({ website: e.target.value })} />
          </div>
        </div>
        <div>
          <label style={s.label}>Industry</label>
          <select style={{ ...s.input, appearance: 'none' as any }} value={state.industry || ''} onChange={e => update({ industry: e.target.value })}>
            <option value="">Select your industry...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Logo (optional but recommended)</label>
          <div
            onClick={() => logoInputRef.current?.click()}
            style={{ border: '2px dashed #2a3a55', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: '#0a1020' }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain' }} />
            ) : (
              <div>
                <Upload size={24} color="#505a6b" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ color: '#8899aa', fontSize: 13 }}>Drop your logo here or click to upload</div>
                <div style={{ color: '#505a6b', fontSize: 11, marginTop: 4 }}>PNG, JPG, SVG &middot; We&apos;ll remove the background automatically</div>
              </div>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>
        <div>
          <label style={s.label}>Brand Colors (pick up to 3)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {BRAND_COLORS_PRESET.map(color => (
              <button key={color} onClick={() => {
                const colors = state.brandColors || []
                if (colors.includes(color)) update({ brandColors: colors.filter(c => c !== color) })
                else if (colors.length < 3) update({ brandColors: [...colors, color] })
              }}
                style={{ width: 32, height: 32, borderRadius: 6, background: color, border: (state.brandColors || []).includes(color) ? '2px solid #64d2ff' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
            <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
              onBlur={() => {
                const colors = state.brandColors || []
                if (!colors.includes(customColor) && colors.length < 3) update({ brandColors: [...colors, customColor] })
              }}
              style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #2a3a55', cursor: 'pointer', padding: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(state.brandColors || []).map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a2236', borderRadius: 6, padding: '4px 10px' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                <span style={{ color: '#c0cce0', fontSize: 12 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step 2: Style ──────────────────────────────────────────────────────────
  const stepStyle = (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>What&apos;s your style?</h2>
      <p style={{ color: '#8899aa', marginBottom: 28 }}>This shapes the entire aesthetic of your concepts.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {STYLE_VIBES.map(v => (
          <button key={v.id} onClick={() => update({ styleVibe: v.id as any })}
            style={{
              background: state.styleVibe === v.id ? '#0f2640' : '#0a1020',
              border: `2px solid ${state.styleVibe === v.id ? '#64d2ff' : '#1e2d45'}`,
              borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer',
            }}>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{v.label}</div>
            <div style={{ color: '#8899aa', fontSize: 12 }}>{v.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={s.label}>What should people feel when they see your vehicle?</label>
        <textarea
          style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
          placeholder="e.g. 'Reliable, local, family-owned — someone they can trust in their home'"
          value={state.feelStatement || ''}
          onChange={e => update({ feelStatement: e.target.value })}
        />
      </div>

      <div>
        <label style={s.label}>Your Email (to receive your mockups)</label>
        <input style={s.input} type="email" placeholder="you@smithplumbing.com" value={state.email || ''} onChange={e => update({ email: e.target.value })} />
      </div>
    </div>
  )

  // ── Step 3: Results ────────────────────────────────────────────────────────
  const stepResults = (
    <div>
      {state.generationStatus === 'complete' && (state.renderImages?.length ?? 0) > 0 ? (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Your concepts are ready!</h2>
          <p style={{ color: '#8899aa', marginBottom: 24 }}>Choose your favorite — then we&apos;ll refine it until it&apos;s perfect.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(state.renderImages || []).map((_, i) => (
              <button key={i} onClick={() => update({ selectedConcept: i })}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: `2px solid ${state.selectedConcept === i ? '#64d2ff' : '#1e2d45'}`,
                  background: state.selectedConcept === i ? '#0f2640' : '#0a1020',
                  color: state.selectedConcept === i ? '#64d2ff' : '#8899aa',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}>
                Concept {i + 1}
              </button>
            ))}
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#0a1020' }}>
            {state.renderImages?.[state.selectedConcept || 0]?.[0] ? (
              <img src={state.renderImages[state.selectedConcept || 0][0]} alt="Mockup" style={{ width: '100%', display: 'block' }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} color="#505a6b" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>

          {state.selectedConcept === 0 && (state.renderImages?.[0]?.length ?? 0) > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(state.renderImages![0] || []).map((url, i) => url && (
                <img key={i} src={url} alt={`Angle ${i}`}
                  style={{ flex: 1, borderRadius: 8, objectFit: 'cover', height: 80, cursor: 'pointer', opacity: 0.8 }} />
              ))}
            </div>
          )}

          <div style={{ background: '#0a1020', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#8899aa', fontSize: 13 }}>{state.vehicleYear} {state.vehicleMake} {state.vehicleModel} &middot; Full Wrap</div>
              <div style={{ color: '#505a6b', fontSize: 11, marginTop: 2 }}>Includes design, print & professional installation</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64d2ff', fontWeight: 800, fontSize: 26 }}>${state.estimatedPrice?.toLocaleString()}</div>
              <div style={{ color: '#505a6b', fontSize: 11 }}>final quote on consultation</div>
            </div>
          </div>

          {state.videoUrl ? (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <video src={state.videoUrl} autoPlay loop muted playsInline style={{ width: '100%' }} />
            </div>
          ) : (
            <button onClick={generateVideo} disabled={videoPolling}
              style={{ ...s.btnSec, width: '100%', justifyContent: 'center', marginBottom: 20, opacity: videoPolling ? 0.6 : 1 }}>
              {videoPolling
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating video (~30 sec)...</>
                : <><Play size={16} /> See It Move &mdash; Generate Video</>}
            </button>
          )}

          <button onClick={() => setStep(4)} style={{ ...s.btn, width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px 0' }}>
            <Lock size={16} /> Lock In This Design &mdash; $250 Deposit
          </button>
          <p style={{ textAlign: 'center', color: '#505a6b', fontSize: 12, marginTop: 10 }}>
            Refundable if we can&apos;t deliver. Includes 2 revision rounds.
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <Sparkles size={40} color="#64d2ff" style={{ margin: '0 auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Creating your concepts...</h2>
          <p style={{ color: '#64d2ff', fontSize: 14 }}>{loadingMsg || 'Analyzing your brand...'}</p>
          <div style={{ marginTop: 24, color: '#505a6b', fontSize: 12 }}>This takes about 60 seconds</div>
          {error && (
            <div style={{ marginTop: 20, background: '#2a1a1a', border: '1px solid #f25a5a', borderRadius: 8, padding: 12, color: '#f25a5a', fontSize: 13 }}>
              {error}
              <br />
              <button onClick={() => { setStep(2); setError('') }} style={{ marginTop: 8, background: 'none', border: 'none', color: '#64d2ff', cursor: 'pointer', fontSize: 12 }}>
                &larr; Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── Step 4: Book ───────────────────────────────────────────────────────────
  const stepBook = (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Lock in your design</h2>
      <p style={{ color: '#8899aa', marginBottom: 24 }}>A $250 design deposit holds your spot and starts the process. Refundable if we can&apos;t deliver exactly what you want.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={s.label}>Your Name</label>
          <input style={s.input} placeholder="John Smith" value={state.customerName || ''} onChange={e => update({ customerName: e.target.value })} />
        </div>
        <div>
          <label style={s.label}>Best Phone Number</label>
          <input style={s.input} placeholder="(253) 555-0100" value={state.phone || ''} onChange={e => update({ phone: e.target.value })} />
        </div>
      </div>

      <div style={{ background: '#0a1020', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        {([
          ['Vehicle', `${state.vehicleYear} ${state.vehicleMake} ${state.vehicleModel}`],
          ['Business', state.businessName],
          ['Estimated Wrap Price', `$${state.estimatedPrice?.toLocaleString()}`],
          ['Design Deposit Today', '$250'],
        ] as [string, string | undefined][]).map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a2236' }}>
            <span style={{ color: '#8899aa', fontSize: 13 }}>{label}</span>
            <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 13 }}>{val}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#2a1a1a', border: '1px solid #f25a5a', borderRadius: 8, padding: 12, marginBottom: 16, color: '#f25a5a', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button onClick={handleDeposit} disabled={loading || !state.customerName}
        style={{ ...s.btn, width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px 0', opacity: !state.customerName ? 0.5 : 1 }}>
        {loading
          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : <Lock size={16} />}
        Pay $250 & Start My Wrap
      </button>
    </div>
  )

  const steps = [stepVehicle, stepBrand, stepStyle, stepResults, stepBook]

  function canProceed() {
    if (step === 0) return !!state.vehicleMake
    if (step === 1) return !!(state.businessName && state.industry)
    if (step === 2) return !!(state.styleVibe && state.email)
    if (step === 3) return state.generationStatus === 'complete'
    if (step === 4) return !!(state.customerName && state.phone)
    return true
  }

  async function handleNext() {
    if (step === 2) {
      setStep(3)
      await generateMockups()
    } else {
      setStep(s => Math.min(s + 1, STEPS.length - 1))
    }
  }

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={s.header}>
        <div style={s.logo}>USA WRAP CO</div>
        <div style={{ color: '#505a6b', fontSize: 13 }}>Gig Harbor, WA</div>
      </div>

      <div style={{ background: '#0a1220', padding: '12px 20px', display: 'flex', gap: 8, overflowX: 'auto' as any }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
              background: i < step ? '#22c07a' : i === step ? '#64d2ff' : '#1a2236',
              color: i <= step ? '#000000' : '#505a6b',
            }}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span style={{ fontSize: 12, color: i === step ? '#ffffff' : '#505a6b', fontWeight: i === step ? 600 : 400 }}>{label}</span>
            {i < STEPS.length - 1 && <ChevronRight size={14} color="#2a3a55" />}
          </div>
        ))}
      </div>

      <div style={s.container}>
        <div style={s.card}>
          {steps[step]}
        </div>

        {step !== 3 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button
              onClick={() => setStep(s => Math.max(s - 1, 0))}
              style={step === 0 ? { ...s.btnSec, visibility: 'hidden' } : s.btnSec}>
              <ChevronLeft size={16} /> Back
            </button>
            {step < STEPS.length - 1 && step !== 4 && (
              <button onClick={handleNext} disabled={!canProceed() || loading}
                style={{ ...s.btn, opacity: canProceed() && !loading ? 1 : 0.4 }}>
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : step === 2
                    ? <><Sparkles size={16} /> Generate My Concepts</>
                    : <>Next <ChevronRight size={16} /></>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
