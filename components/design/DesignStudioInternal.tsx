'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Car, Shirt, LayoutGrid, Wand2, Upload, X, Loader2, Download,
  Sparkles, Globe, ChevronDown, RefreshCw, Plus, Type, Trash2,
  RotateCcw, Image as ImageIcon, Palette, Check, AlertCircle,
  ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductMode = 'vehicle' | 'sign' | 'apparel'

const BODY_TYPES = [
  { id: 'van',       label: 'Cargo Van',        prompt: 'van' },
  { id: 'sprinter',  label: 'Sprinter',          prompt: 'sprinter' },
  { id: 'box_truck', label: 'Box Truck',         prompt: 'box_truck' },
  { id: 'pickup',    label: 'Pickup',            prompt: 'pickup' },
  { id: 'suv',       label: 'SUV',               prompt: 'suv' },
  { id: 'car',       label: 'Car / Sedan',       prompt: 'car' },
  { id: 'trailer',   label: 'Trailer',           prompt: 'trailer' },
  { id: 'boat',      label: 'Boat',              prompt: 'boat' },
]

const SIGN_TYPES = [
  { id: 'coroplast_24x36', label: 'Yard Sign 24×36',  w: 24,  h: 36  },
  { id: 'banner_3x8',      label: 'Banner 3×8',       w: 36,  h: 96  },
  { id: 'banner_4x8',      label: 'Banner 4×8',       w: 48,  h: 96  },
  { id: 'a_frame',         label: 'A-Frame 24×36',    w: 24,  h: 36  },
  { id: 'aluminum',        label: 'Aluminum 18×24',   w: 18,  h: 24  },
  { id: 'magnet_12x18',    label: 'Door Magnet 12×18',w: 12,  h: 18  },
  { id: 'custom',          label: 'Custom Size',      w: 0,   h: 0   },
]

const APPAREL_TYPES = [
  { id: 'tshirt',     label: 'T-Shirt' },
  { id: 'hoodie',     label: 'Hoodie' },
  { id: 'hat',        label: 'Hat / Cap' },
  { id: 'polo',       label: 'Polo' },
  { id: 'longsleeve', label: 'Long Sleeve' },
]

const APPAREL_COLORS = [
  { id: 'white', label: 'White', hex: '#f9fafb' },
  { id: 'black', label: 'Black', hex: '#111827' },
  { id: 'navy',  label: 'Navy',  hex: '#1e3a5f' },
  { id: 'grey',  label: 'Grey',  hex: '#6b7280' },
]

const CANVAS_PRESETS = [
  { id: 'full_color',  label: 'Full Color' },
  { id: 'two_tone',    label: 'Two-Tone' },
  { id: 'stripes',     label: 'Stripes' },
  { id: 'logo_center', label: 'Logo Box' },
  { id: 'name_band',   label: 'Name Band' },
]

const TOOLBAR_COLORS = [
  '#1a56f0','#e94560','#22c07a','#f59e0b','#8b5cf6',
  '#22d3ee','#ffffff','#000000','#374151','#f77f00',
]

interface DesignStudioInternalProps {
  orgId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DesignStudioInternal({ orgId }: DesignStudioInternalProps) {
  const [mode, setMode] = useState<ProductMode>('vehicle')
  const [isMounted, setIsMounted] = useState(false)

  // Vehicle state
  const [year, setYear] = useState('2024')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [bodyType, setBodyType] = useState('van')
  const [vehicleRenderUrl, setVehicleRenderUrl] = useState<string | null>(null)
  const [generatingVehicle, setGeneratingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)

  // Sign state
  const [signTypeId, setSignTypeId] = useState('coroplast_24x36')
  const [signWidthIn, setSignWidthIn] = useState(24)
  const [signHeightIn, setSignHeightIn] = useState(36)

  // Apparel state
  const [apparelType, setApparelType] = useState('tshirt')
  const [apparelColor, setApparelColor] = useState('white')
  const [apparelRenderUrl, setApparelRenderUrl] = useState<string | null>(null)
  const [generatingApparel, setGeneratingApparel] = useState(false)

  // Canvas
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const fabricRef     = useRef<any>(null)
  const [canvasReady, setCanvasReady]   = useState(false)
  const [activeColor, setActiveColor]   = useState('#1a56f0')
  const [activeTool, setActiveTool]     = useState<'select'|'rect'|'text'>('select')

  // Brand
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scraping, setScraping]     = useState(false)
  const [brandLogoUrl, setBrandLogoUrl]   = useState<string | null>(null)
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null)
  const [brandPhone, setBrandPhone]       = useState('')
  const [brandWebsite, setBrandWebsite]   = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Finalize / result
  const [finalizing, setFinalizing]   = useState(false)
  const [mockupId, setMockupId]       = useState<string | null>(null)
  const [finalUrl, setFinalUrl]       = useState<string | null>(null)
  const [finalError, setFinalError]   = useState<string | null>(null)
  const [resultZoomed, setResultZoomed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setIsMounted(true) }, [])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Canvas init / teardown ─────────────────────────────────────────────────
  const bgUrl = mode === 'vehicle' ? vehicleRenderUrl :
                mode === 'apparel' ? apparelRenderUrl : null

  const initCanvas = useCallback(async () => {
    if (!canvasRef.current || !isMounted) return
    const { Canvas, Rect, IText, FabricImage } = await import('fabric')

    const containerW = Math.min(canvasRef.current.parentElement?.clientWidth || 900, 900)
    let containerH: number

    if (mode === 'sign') {
      const aspect = signWidthIn > 0 ? signWidthIn / signHeightIn : 1
      containerH = Math.round(containerW / Math.max(aspect, 0.3))
      containerH = Math.min(containerH, containerW * 2)
    } else if (mode === 'apparel') {
      containerH = Math.round(containerW * 1.2)
    } else {
      containerH = Math.round(containerW * (2 / 3))
    }

    const fc = new Canvas(canvasRef.current, { width: containerW, height: containerH, selection: true })
    fabricRef.current = fc

    if (bgUrl) {
      const img = await FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' })
      img.scaleToWidth(containerW)
      img.scaleToHeight(containerH)
      img.set({ selectable: false, evented: false })
      fc.backgroundImage = img
    } else {
      // Blank background with a guide outline
      const bgColor = mode === 'sign' ? '#ffffff' :
                      apparelColor === 'black' ? '#1f2937' :
                      apparelColor === 'navy' ? '#1e3a5f' : '#f9fafb'
      const bg = new Rect({
        left: 0, top: 0, width: containerW, height: containerH,
        fill: bgColor, selectable: false, evented: false,
      })
      fc.add(bg)
    }

    fc.renderAll()
    setCanvasReady(true)
    return fc
  }, [isMounted, bgUrl, mode, signWidthIn, signHeightIn, apparelColor])

  useEffect(() => {
    if (!isMounted) return
    let fc: any
    initCanvas().then(canvas => { fc = canvas })
    return () => { fc?.dispose(); fabricRef.current = null; setCanvasReady(false) }
  }, [isMounted, initCanvas])

  // ── Click-to-place tool handler ────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !canvasReady) return
    const handler = async (e: any) => {
      if (activeTool === 'select' || !e.pointer) return
      const { Rect, IText } = await import('fabric')
      const { x, y } = e.pointer
      if (activeTool === 'rect') {
        fc.add(new Rect({ left: x - 60, top: y - 30, width: 120, height: 60, fill: activeColor + 'bb', stroke: activeColor, strokeWidth: 2 }))
        fc.renderAll()
      } else if (activeTool === 'text') {
        const t = new IText('Text', { left: x, top: y, fontSize: 36, fill: activeColor, fontFamily: 'Impact', fontWeight: 'bold' })
        fc.add(t)
        fc.setActiveObject(t)
        t.enterEditing()
        fc.renderAll()
      }
      setActiveTool('select')
    }
    fc.on('mouse:down', handler)
    return () => fc.off('mouse:down', handler)
  }, [activeTool, activeColor, canvasReady])

  // ── Preset layouts ─────────────────────────────────────────────────────────
  const applyPreset = useCallback(async (preset: string) => {
    const fc = fabricRef.current
    if (!fc) return
    const { Rect, IText } = await import('fabric')
    const w = fc.width || 900
    const h = fc.height || 600
    const c1 = activeColor

    // Remove non-background objects
    const toRemove = fc.getObjects().filter((o: any) => o !== fc.backgroundImage)
    toRemove.forEach((o: any) => fc.remove(o))

    if (preset === 'full_color') {
      fc.add(new Rect({ left: 0, top: 0, width: w, height: h, fill: c1 + 'aa', selectable: false, evented: false }))
    } else if (preset === 'two_tone') {
      fc.add(new Rect({ left: 0, top: 0,     width: w, height: h / 2, fill: c1 + 'aa', selectable: false, evented: false }))
      fc.add(new Rect({ left: 0, top: h / 2, width: w, height: h / 2, fill: c1 + '44', selectable: false, evented: false }))
    } else if (preset === 'stripes') {
      for (let i = 0; i < 3; i++) {
        fc.add(new Rect({ left: w * 0.22 + i * w * 0.2, top: -h * 0.2, width: w * 0.1, height: h * 1.4, fill: c1 + 'cc', angle: 12, selectable: false, evented: false }))
      }
    } else if (preset === 'logo_center') {
      fc.add(new Rect({ left: w * 0.35, top: h * 0.2, width: w * 0.3, height: h * 0.6, rx: 8, ry: 8, fill: c1 + '88', stroke: c1, strokeWidth: 3, strokeDashArray: [8, 4] }))
      fc.add(new IText('LOGO', { left: w * 0.47, top: h * 0.43, fontSize: 30, fill: '#ffffff', fontFamily: 'Impact', fontWeight: 'bold', selectable: false, evented: false }))
    } else if (preset === 'name_band') {
      fc.add(new Rect({ left: 0, top: h * 0.65, width: w, height: h * 0.35, fill: c1 + 'cc', selectable: false, evented: false }))
      fc.add(new IText('COMPANY NAME', { left: w * 0.06, top: h * 0.7, fontSize: Math.round(h * 0.1), fill: '#ffffff', fontFamily: 'Impact', fontWeight: 'bold' }))
    }

    fc.renderAll()
  }, [activeColor])

  // ── Generate vehicle render ────────────────────────────────────────────────
  const handleGenerateVehicle = async () => {
    setGeneratingVehicle(true)
    setVehicleError(null)
    setVehicleRenderUrl(null)
    try {
      const res = await fetch('/api/mockup/generate-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, make, model, body_type: bodyType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Render failed')
      setVehicleRenderUrl(data.render_url)
    } catch (err: any) {
      setVehicleError(err.message)
    } finally {
      setGeneratingVehicle(false)
    }
  }

  // ── Generate apparel render ────────────────────────────────────────────────
  const handleGenerateApparel = async () => {
    setGeneratingApparel(true)
    setApparelRenderUrl(null)
    try {
      const res = await fetch('/api/mockup/generate-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: apparelType, base_color: apparelColor }),
      })
      const data = await res.json()
      if (res.ok) setApparelRenderUrl(data.render_url)
    } finally {
      setGeneratingApparel(false)
    }
  }

  // ── Brand scrape ───────────────────────────────────────────────────────────
  const handleScrape = async () => {
    if (!websiteUrl.trim()) return
    setScraping(true)
    try {
      const res = await fetch('/api/mockup/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })
      const data = await res.json()
      if (data.phone)    setBrandPhone(data.phone)
      if (data.website)  setBrandWebsite(data.website)
      if (data.logo_url) { setBrandLogoUrl(data.logo_url); setBrandLogoPreview(data.logo_url) }
    } finally {
      setScraping(false)
    }
  }

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBrandLogoPreview(URL.createObjectURL(f))
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/mockup/public-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setBrandLogoUrl(data.url)
    } finally { setLogoUploading(false) }
  }

  // ── Add brand logo to canvas ───────────────────────────────────────────────
  const addLogoToCanvas = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || !brandLogoUrl) return
    const { FabricImage } = await import('fabric')
    const img = await FabricImage.fromURL(brandLogoUrl, { crossOrigin: 'anonymous' })
    img.scaleToWidth(Math.round((fc.width || 900) * 0.18))
    img.set({ left: 20, top: 20 })
    fc.add(img)
    fc.setActiveObject(img)
    fc.renderAll()
  }, [brandLogoUrl])

  // ── Clear / delete ─────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const a = fc.getActiveObject()
    if (a) { fc.remove(a); fc.renderAll() }
  }, [])

  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    fc.getObjects().forEach((o: any) => { if (o !== fc.backgroundImage) fc.remove(o) })
    fc.renderAll()
  }, [])

  // ── Finalize with AI ───────────────────────────────────────────────────────
  const handleFinalize = async () => {
    const fc = fabricRef.current
    if (!fc) return
    setFinalizing(true)
    setFinalError(null)
    setFinalUrl(null)

    try {
      // Export canvas sketch
      const dataUrl = fc.toDataURL({ format: 'png', quality: 0.85, multiplier: 1 })
      const blob    = await (await fetch(dataUrl)).blob()
      const fd      = new FormData()
      fd.append('file', new File([blob], 'sketch.png', { type: 'image/png' }))
      const upRes  = await fetch('/api/mockup/public-upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      const sketchUrl = upData.url

      const body: Record<string, unknown> = {
        sketch_url:        sketchUrl,
        vehicle_photo_url: mode === 'vehicle' ? vehicleRenderUrl : mode === 'apparel' ? apparelRenderUrl : undefined,
        logo_url:          brandLogoUrl,
        phone:             brandPhone,
        website:           brandWebsite,
        product_type:      mode === 'sign' ? 'signage' : mode,
        org_id:            orgId,
      }
      if (mode === 'sign') {
        body.sign_width_in  = signWidthIn
        body.sign_height_in = signHeightIn
      }
      if (mode === 'apparel') {
        body.apparel_type       = apparelType
        body.apparel_base_color = apparelColor
      }

      const res  = await fetch('/api/mockup/customer-start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setMockupId(data.mockup_id)

      // Poll for result
      pollRef.current = setInterval(async () => {
        try {
          const sr  = await fetch(`/api/mockup/status/${data.mockup_id}`)
          const sd  = await sr.json()
          if (sd.status === 'concept_ready' || sd.status === 'complete') {
            clearInterval(pollRef.current!)
            setFinalUrl(sd.final_mockup_url || sd.concept_url)
            setFinalizing(false)
          } else if (sd.status === 'failed') {
            clearInterval(pollRef.current!)
            setFinalError(sd.error_message || 'Generation failed')
            setFinalizing(false)
          }
        } catch { /* keep polling */ }
      }, 2500)
    } catch (err: any) {
      setFinalError(err.message)
      setFinalizing(false)
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--surface2)', background: 'var(--surface2)',
    color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const btn = (primary?: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 7, border: primary ? 'none' : '1px solid var(--surface2)',
    background: primary ? 'var(--accent)' : 'var(--surface2)',
    color: primary ? '#fff' : 'var(--text2)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div style={{ width: 280, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--surface2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Wand2 size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>Design Studio</span>
          </div>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3 }}>
            {([
              { id: 'vehicle', icon: Car,         label: 'Wrap' },
              { id: 'sign',    icon: LayoutGrid,  label: 'Sign' },
              { id: 'apparel', icon: Shirt,        label: 'Apparel' },
            ] as { id: ProductMode; icon: any; label: string }[]).map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setFinalUrl(null); setFinalError(null) }}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === m.id ? 'var(--accent)' : 'transparent', color: mode === m.id ? '#fff' : 'var(--text3)', fontSize: 11, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <m.icon size={14} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Vehicle inputs ── */}
        {mode === 'vehicle' && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Vehicle</div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6, marginBottom: 8 }}>
              <input style={inp} placeholder="Year" value={year} onChange={e => setYear(e.target.value)} />
              <input style={inp} placeholder="Make (e.g. Ford)" value={make} onChange={e => setMake(e.target.value)} />
            </div>
            <input style={{ ...inp, marginBottom: 8 }} placeholder="Model (e.g. Transit)" value={model} onChange={e => setModel(e.target.value)} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {BODY_TYPES.map(b => (
                <button key={b.id} onClick={() => setBodyType(b.id)}
                  style={{ ...btn(bodyType === b.id), fontSize: 11, padding: '4px 8px' }}>
                  {b.label}
                </button>
              ))}
            </div>
            {vehicleError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{vehicleError}</div>}
            <button onClick={handleGenerateVehicle} disabled={generatingVehicle}
              style={{ ...btn(true), width: '100%', justifyContent: 'center' }}>
              {generatingVehicle ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Rendering…</> : <><Sparkles size={13} /> Generate Vehicle</>}
            </button>
            {vehicleRenderUrl && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ Vehicle rendered — canvas updated</div>}
          </div>
        )}

        {/* ── Sign inputs ── */}
        {mode === 'sign' && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Sign Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {SIGN_TYPES.map(st => (
                <button key={st.id} onClick={() => { setSignTypeId(st.id); if (st.w > 0) { setSignWidthIn(st.w); setSignHeightIn(st.h) } }}
                  style={{ ...btn(signTypeId === st.id), justifyContent: 'space-between', width: '100%' }}>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
            {signTypeId === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Width (in)</label>
                  <input type="number" style={inp} value={signWidthIn} onChange={e => setSignWidthIn(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Height (in)</label>
                  <input type="number" style={inp} value={signHeightIn} onChange={e => setSignHeightIn(Number(e.target.value))} />
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: 'var(--bg)', fontSize: 11, color: 'var(--text2)' }}>
              {signWidthIn}" × {signHeightIn}" · {(signWidthIn * 300).toLocaleString()} × {(signHeightIn * 300).toLocaleString()}px @ 300dpi
            </div>
          </div>
        )}

        {/* ── Apparel inputs ── */}
        {mode === 'apparel' && (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Product</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {APPAREL_TYPES.map(a => (
                <button key={a.id} onClick={() => setApparelType(a.id)} style={{ ...btn(apparelType === a.id), fontSize: 11, padding: '4px 10px' }}>
                  {a.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {APPAREL_COLORS.map(c => (
                <button key={c.id} onClick={() => setApparelColor(c.id)} title={c.label}
                  style={{ width: 28, height: 28, borderRadius: 6, background: c.hex, border: apparelColor === c.id ? '2px solid var(--accent)' : '2px solid var(--surface2)', cursor: 'pointer' }} />
              ))}
            </div>
            <button onClick={handleGenerateApparel} disabled={generatingApparel}
              style={{ ...btn(true), width: '100%', justifyContent: 'center' }}>
              {generatingApparel ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Rendering…</> : <><Sparkles size={13} /> Generate Product</>}
            </button>
          </div>
        )}

        {/* ── Brand info ── */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Brand</div>
          {/* Website auto-fill */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="website.com"
              value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScrape() }} />
            <button onClick={handleScrape} disabled={scraping || !websiteUrl.trim()} style={btn(true)}>
              {scraping ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={12} />}
            </button>
          </div>
          {/* Logo */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Logo</label>
            <div onClick={() => logoInputRef.current?.click()}
              style={{ minHeight: 64, border: brandLogoPreview ? '1px solid var(--surface2)' : '2px dashed var(--surface2)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', padding: 8 }}>
              {brandLogoPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brandLogoPreview} alt="logo" style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} />
                  <button onClick={e => { e.stopPropagation(); setBrandLogoUrl(null); setBrandLogoPreview(null) }}
                    style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} style={{ color: '#fff' }} />
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--text3)' }}>
                  {logoUploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                  <span style={{ fontSize: 11 }}>Upload / auto-fill</span>
                </div>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            {brandLogoUrl && (
              <button onClick={addLogoToCanvas} style={{ ...btn(), marginTop: 6, width: '100%', justifyContent: 'center', fontSize: 11 }}>
                <ImageIcon size={11} /> Place Logo on Canvas
              </button>
            )}
          </div>
          {/* Phone */}
          <input style={inp} placeholder="Phone" value={brandPhone} onChange={e => setBrandPhone(e.target.value)} />
        </div>

        {/* ── Canvas tools ── */}
        <div style={{ padding: '14px 16px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Canvas Tools</div>

          {/* Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {CANVAS_PRESETS.map(p => (
              <button key={p.id} onClick={() => applyPreset(p.id)} style={{ ...btn(), fontSize: 11, padding: '4px 8px' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Tools */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            <button onClick={() => setActiveTool('select')} title="Select"
              style={{ ...btn(activeTool === 'select'), padding: '6px 10px' }}>
              <Palette size={13} />
            </button>
            <button onClick={() => setActiveTool('rect')} title="Add Color Zone"
              style={{ ...btn(activeTool === 'rect'), padding: '6px 10px' }}>
              <Plus size={13} />
            </button>
            <button onClick={() => setActiveTool('text')} title="Add Text"
              style={{ ...btn(activeTool === 'text'), padding: '6px 10px' }}>
              <Type size={13} />
            </button>
            <button onClick={deleteSelected} title="Delete Selected" style={{ ...btn(), padding: '6px 10px' }}>
              <Trash2 size={13} />
            </button>
            <button onClick={clearCanvas} title="Clear All" style={{ ...btn(), padding: '6px 10px' }}>
              <RotateCcw size={13} />
            </button>
          </div>

          {activeTool !== 'select' && (
            <div style={{ fontSize: 11, color: 'var(--accent)', padding: '6px 8px', background: 'rgba(79,127,255,0.1)', borderRadius: 6, marginBottom: 10 }}>
              {activeTool === 'rect' ? 'Click canvas to place a color zone' : 'Click canvas to place text (double-click to edit)'}
            </div>
          )}

          {/* Color picker */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Active Color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {TOOLBAR_COLORS.map(c => (
                <button key={c} onClick={() => setActiveColor(c)}
                  style={{ width: 22, height: 22, borderRadius: 4, background: c, border: activeColor === c ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
              ))}
            </div>
            <input type="color" value={activeColor} onChange={e => setActiveColor(e.target.value)}
              style={{ width: '100%', height: 30, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
          </div>
        </div>

        {/* Finalize button */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--surface2)' }}>
          <button onClick={handleFinalize} disabled={finalizing}
            style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: finalizing ? 'rgba(79,127,255,0.5)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: finalizing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {finalizing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={16} /> Finalize with AI</>}
          </button>
        </div>
      </div>

      {/* ── MAIN CANVAS AREA ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ height: 44, background: 'var(--surface)', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
            {mode === 'vehicle' ? `${year} ${make} ${model}`.trim() || 'Vehicle' :
             mode === 'sign'    ? `Sign ${signWidthIn}"×${signHeightIn}"` :
             `${APPAREL_TYPES.find(a => a.id === apparelType)?.label || 'Apparel'}`}
          </span>
          {finalUrl && (
            <a href={finalUrl} download={`mockup-${Date.now()}.jpg`}
              style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, background: 'var(--green)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> Download
            </a>
          )}
        </div>

        {/* Canvas / Result */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', gap: 16 }}>
          {/* Canvas */}
          <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--surface2)', background: '#111', position: 'relative', minHeight: 300 }}>
            {!isMounted && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
          </div>

          {/* Result panel */}
          {(finalUrl || finalizing || finalError) && (
            <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Result
              </div>

              {finalizing && (
                <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--surface2)', textAlign: 'center' }}>
                  <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>AI is applying your design…</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>~30-60 seconds</div>
                </div>
              )}

              {finalError && (
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', display: 'flex', gap: 8 }}>
                  <AlertCircle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: 'var(--red)' }}>{finalError}</span>
                </div>
              )}

              {finalUrl && (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--surface2)', cursor: resultZoomed ? 'zoom-out' : 'zoom-in', position: 'relative' }} onClick={() => setResultZoomed(!resultZoomed)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={finalUrl} alt="AI result" style={{ width: '100%', display: 'block', maxHeight: resultZoomed ? 'none' : 280, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {resultZoomed ? <ZoomOut size={9} /> : <ZoomIn size={9} />}
                    {resultZoomed ? 'Collapse' : 'Expand'}
                  </div>
                </div>
              )}

              {finalUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <a href={finalUrl} download={`design-studio-result-${Date.now()}.jpg`}
                    style={{ ...btn(true), justifyContent: 'center' }}>
                    <Download size={13} /> Download Preview
                  </a>
                  <button onClick={handleFinalize}
                    style={{ ...btn(), justifyContent: 'center' }}>
                    <RefreshCw size={13} /> Re-generate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
