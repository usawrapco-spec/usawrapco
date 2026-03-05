'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Upload, ChevronRight, ChevronLeft, Palette, Type, RotateCcw, Download,
  Loader2, CheckCircle, AlertCircle, Wand2, Car, Shirt, LayoutGrid,
  Plus, Trash2, Image as ImageIcon, Brush, Minus, Send,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = 'wrap' | 'signage' | 'apparel'
type StyleVibe   = 'bold' | 'clean' | 'dynamic'

interface BrandInfo {
  companyName: string
  tagline:     string
  phone:       string
  website:     string
  logoUrl:     string
  colors:      string[]
  style:       StyleVibe
  fontChoice:  string
}

interface LeadInfo {
  name:  string
  email: string
  phone: string
  notes: string
}

interface DesignStudioProps {
  productType?: ProductType
  orgId?:       string
  /** Pre-filled for portal users */
  prefillBrand?: Partial<BrandInfo>
  prefillLead?:  Partial<LeadInfo>
  /** Called when the user clicks "Start This Project" (portal mode) */
  onStartProject?: (mockupId: string, finalUrl: string) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const POLL_MS = 2500

const PRESET_COLORS = [
  '#1a56f0','#f25a5a','#22c07a','#f59e0b','#8b5cf6',
  '#22d3ee','#ffffff','#000000','#374151','#b45309',
]

const SIGN_TYPES = [
  { value: 'coroplast',    label: 'Coroplast (Yard Sign)' },
  { value: 'aluminum',     label: 'Aluminum' },
  { value: 'vinyl_banner', label: 'Vinyl Banner' },
  { value: 'window_perf',  label: 'Window Perf' },
  { value: 'foam_board',   label: 'Foam Board' },
  { value: 'canvas',       label: 'Canvas Print' },
]

const APPAREL_TYPES = [
  { value: 'tshirt',     label: 'T-Shirt',     icon: '👕' },
  { value: 'hoodie',     label: 'Hoodie',       icon: '🧥' },
  { value: 'hat',        label: 'Hat / Cap',    icon: '🧢' },
  { value: 'polo',       label: 'Polo',         icon: '👔' },
  { value: 'longsleeve', label: 'Long Sleeve',  icon: '👕' },
]

const PRINT_AREAS = ['Front', 'Back', 'Left Chest', 'Full Sublimation']

const CANVAS_PRESETS = [
  { id: 'full_color',   label: 'Full Color',   desc: 'Solid color wrap' },
  { id: 'two_tone',     label: 'Two-Tone',     desc: 'Split top/bottom' },
  { id: 'stripes',      label: 'Stripes',      desc: 'Racing stripes' },
  { id: 'logo_center',  label: 'Logo Center',  desc: 'Brand focus' },
  { id: 'name_number',  label: 'Name + Info',  desc: 'Text placement' },
]

const FONT_OPTIONS = ['Impact', 'Barlow Condensed', 'Arial Black', 'Oswald', 'Bebas Neue']

// ─── Upload Helper ────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/mockup/public-upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Upload failed')
  }
  const data = await res.json()
  return data.url as string
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, overflowX: 'auto' }}>
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--surface2)',
              color: i <= step ? '#fff' : 'var(--text3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600,
              border: i === step ? '2px solid var(--accent)' : 'none',
            }}>
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === step ? 'var(--text1)' : 'var(--text3)', marginTop: 4, whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: 2, minWidth: 16, background: i < step ? 'var(--green)' : 'var(--surface2)', margin: '0 4px', marginBottom: 20 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DesignStudio({ productType: initialType, orgId, prefillBrand, prefillLead, onStartProject }: DesignStudioProps) {
  const [step, setStep]               = useState(0)
  const [productType, setProductType] = useState<ProductType>(initialType || 'wrap')
  const [isMounted, setIsMounted]     = useState(false)

  // Step 1 — upload / setup
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null)
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null)
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null)
  const [signWidthIn, setSignWidthIn]   = useState<number>(24)
  const [signHeightIn, setSignHeightIn] = useState<number>(18)
  const [signType, setSignType]         = useState('coroplast')
  const [apparelType, setApparelType]   = useState('tshirt')
  const [apparelColor, setApparelColor] = useState('white')
  const [printArea, setPrintArea]       = useState('Front')
  const [uploading, setUploading]       = useState(false)
  const [uploadErr, setUploadErr]       = useState<string | null>(null)

  // Step 2 — canvas
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const fabricRef     = useRef<any>(null)
  const [activeColor, setActiveColor]   = useState('#1a56f0')
  const [activeTool, setActiveTool]     = useState<'select' | 'rect' | 'text'>('select')
  const [canvasReady, setCanvasReady]   = useState(false)
  const [logoFile, setLogoFile]         = useState<File | null>(null)
  const [sketchExporting, setSketchExporting] = useState(false)

  // Step 3 — brand
  const [brand, setBrand] = useState<BrandInfo>({
    companyName: prefillBrand?.companyName || '',
    tagline:     prefillBrand?.tagline     || '',
    phone:       prefillBrand?.phone       || '',
    website:     prefillBrand?.website     || '',
    logoUrl:     prefillBrand?.logoUrl     || '',
    colors:      prefillBrand?.colors      || ['#1a56f0', '#ffffff', '#f59e0b'],
    style:       prefillBrand?.style       || 'bold',
    fontChoice:  prefillBrand?.fontChoice  || 'Impact',
  })
  const [logoUploading, setLogoUploading] = useState(false)

  // Step 4 — generate
  const [mockupId, setMockupId]       = useState<string | null>(null)
  const [genStatus, setGenStatus]     = useState<string>('')
  const [genStep, setGenStep]         = useState(0)
  const [genError, setGenError]       = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Step 5 — results
  const [finalUrl, setFinalUrl]       = useState<string | null>(null)
  const [printUrl, setPrintUrl]       = useState<string | null>(null)
  const [printExporting, setPrintExporting] = useState(false)
  const [lead, setLead] = useState<LeadInfo>({
    name:  prefillLead?.name  || '',
    email: prefillLead?.email || '',
    phone: prefillLead?.phone || '',
    notes: prefillLead?.notes || '',
  })
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [leadSubmitting, setLeadSubmitting] = useState(false)

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => { setIsMounted(true) }, [])

  // ── Canvas init / teardown (step 2) ────────────────────────────────────────
  const initCanvas = useCallback(async () => {
    if (!canvasRef.current || !isMounted) return
    const { Canvas, Rect, IText, FabricImage } = await import('fabric')

    const containerW = Math.min(canvasRef.current.parentElement?.clientWidth || 900, 900)
    const containerH = Math.round(containerW * (9 / 16))

    const fc = new Canvas(canvasRef.current, {
      width:  containerW,
      height: containerH,
      selection: true,
    })
    fabricRef.current = fc

    // Background image
    const bgUrl = vehiclePhotoUrl || (
      productType === 'signage' ? null :
      productType === 'apparel' ? null : null
    )

    if (bgUrl) {
      const img = await FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' })
      img.scaleToWidth(containerW)
      img.scaleToHeight(containerH)
      img.set({ selectable: false, evented: false, lockMovementX: true, lockMovementY: true })
      fc.backgroundImage = img
      fc.renderAll()
    } else {
      // Blank canvas with guide rect for signage/apparel
      const aspect = productType === 'signage' ? signWidthIn / signHeightIn : (3 / 4)
      const guideW = Math.round(containerH * aspect)
      const guideH = containerH
      const guideX = (containerW - guideW) / 2
      const guide  = new Rect({
        left: guideX, top: 0,
        width: guideW, height: guideH,
        fill: productType === 'apparel'
          ? (apparelColor === 'white' ? '#f3f4f6' : apparelColor === 'black' ? '#1f2937' : '#1e3a5f')
          : '#e5e7eb',
        stroke: '#6b7280', strokeWidth: 2, strokeDashArray: [6, 3],
        selectable: false, evented: false,
      })
      fc.add(guide)
      fc.renderAll()
    }

    setCanvasReady(true)
    return fc
  }, [isMounted, vehiclePhotoUrl, productType, signWidthIn, signHeightIn, apparelColor])

  useEffect(() => {
    if (step !== 2 || !isMounted) return
    let fc: any
    initCanvas().then(canvas => { fc = canvas })
    return () => { fc?.dispose(); fabricRef.current = null; setCanvasReady(false) }
  }, [step, isMounted, initCanvas])

  // ── Drawing handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !canvasReady) return

    const handleMouseDown = async (e: any) => {
      if (activeTool === 'select' || !e.pointer) return
      const { Rect, IText } = await import('fabric')
      const { x, y } = e.pointer

      if (activeTool === 'rect') {
        const rect = new Rect({
          left: x - 60, top: y - 30,
          width: 120, height: 60,
          fill: activeColor + 'aa', // semi-transparent
          stroke: activeColor, strokeWidth: 2,
        })
        fc.add(rect)
        fc.setActiveObject(rect)
        fc.renderAll()
      } else if (activeTool === 'text') {
        const txt = new IText('Text', {
          left: x, top: y,
          fontSize: 32, fill: activeColor,
          fontFamily: brand.fontChoice,
          fontWeight: 'bold',
        })
        fc.add(txt)
        fc.setActiveObject(txt)
        txt.enterEditing()
        fc.renderAll()
      }

      setActiveTool('select')
    }

    fc.on('mouse:down', handleMouseDown)
    return () => fc.off('mouse:down', handleMouseDown)
  }, [activeTool, activeColor, canvasReady, brand.fontChoice])

  // ── Preset layouts ─────────────────────────────────────────────────────────
  const applyPreset = useCallback(async (preset: string) => {
    const fc = fabricRef.current
    if (!fc) return
    const { Rect, IText } = await import('fabric')

    const w = fc.width  || 900
    const h = fc.height || 506
    const c1 = brand.colors[0] || '#1a56f0'
    const c2 = brand.colors[1] || '#ffffff'

    // Remove existing overlay objects (keep background)
    fc.getObjects().forEach((obj: any) => { if (obj !== fc.backgroundImage) fc.remove(obj) })

    if (preset === 'full_color') {
      fc.add(new Rect({ left: 0, top: 0, width: w, height: h, fill: c1 + 'bb', selectable: false, evented: false }))

    } else if (preset === 'two_tone') {
      fc.add(new Rect({ left: 0, top: 0,     width: w, height: h / 2, fill: c1 + 'bb', selectable: false, evented: false }))
      fc.add(new Rect({ left: 0, top: h / 2, width: w, height: h / 2, fill: c2 + 'bb', selectable: false, evented: false }))

    } else if (preset === 'stripes') {
      // 3 diagonal stripes
      const stripeW = w * 0.12
      for (let i = 0; i < 3; i++) {
        const x = w * 0.25 + i * (stripeW * 2)
        fc.add(new Rect({
          left: x, top: -h * 0.2,
          width: stripeW, height: h * 1.4,
          fill: i % 2 === 0 ? c1 + 'cc' : c2 + 'cc',
          angle: 15,
          selectable: false, evented: false,
        }))
      }

    } else if (preset === 'logo_center') {
      // Placeholder circle in center
      const circ = new Rect({
        left: w * 0.35, top: h * 0.2,
        width: w * 0.3, height: h * 0.6,
        rx: 8, ry: 8,
        fill: c1 + 'aa', stroke: c1, strokeWidth: 3,
        strokeDashArray: [8, 4],
      })
      fc.add(circ)
      const lbl = new IText('LOGO', {
        left: w * 0.47, top: h * 0.43,
        fontSize: 28, fill: '#ffffff', fontWeight: 'bold', fontFamily: 'Impact',
        selectable: false, evented: false,
      })
      fc.add(lbl)

    } else if (preset === 'name_number') {
      // Bottom band with company name area
      fc.add(new Rect({ left: 0, top: h * 0.65, width: w, height: h * 0.35, fill: c1 + 'cc', selectable: false, evented: false }))
      const nameText = new IText(brand.companyName || 'COMPANY NAME', {
        left: w * 0.08, top: h * 0.7,
        fontSize: Math.round(h * 0.12), fill: c2,
        fontFamily: brand.fontChoice, fontWeight: 'bold',
      })
      fc.add(nameText)
    }

    fc.renderAll()
  }, [brand.colors, brand.companyName, brand.fontChoice])

  // ── Delete selected ────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (active) { fc.remove(active); fc.renderAll() }
  }, [])

  // ── Clear canvas ───────────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    fc.getObjects().forEach((obj: any) => fc.remove(obj))
    fc.renderAll()
  }, [])

  // ── Add logo to canvas ─────────────────────────────────────────────────────
  const addLogoToCanvas = useCallback(async (url: string) => {
    const fc = fabricRef.current
    if (!fc) return
    const { FabricImage } = await import('fabric')
    const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    const maxW = (fc.width || 900) * 0.2
    img.scaleToWidth(maxW)
    img.set({ left: 20, top: 20 })
    fc.add(img)
    fc.setActiveObject(img)
    fc.renderAll()
  }, [])

  // ── Export sketch ──────────────────────────────────────────────────────────
  const exportSketch = useCallback(async (): Promise<string> => {
    const fc = fabricRef.current
    if (!fc) throw new Error('Canvas not ready')
    setSketchExporting(true)
    const dataUrl = fc.toDataURL({ format: 'png', quality: 0.85, multiplier: 1 })
    const res  = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], 'sketch.png', { type: 'image/png' })
    const url  = await uploadFile(file)
    setSketchExporting(false)
    return url
  }, [])

  // ── Polling ────────────────────────────────────────────────────────────────
  const startPolling = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/mockup/status/${id}`)
        const data = await res.json()
        if (data.step_name) setGenStatus(data.step_name)
        if (data.current_step) setGenStep(data.current_step)

        if (data.status === 'concept_ready' || data.status === 'complete') {
          clearInterval(pollRef.current!)
          setFinalUrl(data.final_mockup_url || data.concept_url)
          if (data.print_url) setPrintUrl(data.print_url)
          setStep(5)
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setGenError(data.error_message || 'Generation failed')
        }
      } catch { /* network blip — keep polling */ }
    }, POLL_MS)
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePhotoUpload = async (file: File) => {
    setUploading(true)
    setUploadErr(null)
    try {
      setVehiclePhotoFile(file)
      const preview = URL.createObjectURL(file)
      setVehiclePhotoPreview(preview)
      const url = await uploadFile(file)
      setVehiclePhotoUrl(url)
    } catch (err: any) {
      setUploadErr(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true)
    try {
      const url = await uploadFile(file)
      setBrand(b => ({ ...b, logoUrl: url }))
      if (fabricRef.current && step === 2) await addLogoToCanvas(url)
    } catch { /* silent */ }
    finally { setLogoUploading(false) }
  }

  const handleGenerate = async () => {
    setGenError(null)
    setStep(4)
    try {
      const sketchUrl = await exportSketch()

      const body: Record<string, unknown> = {
        vehicle_photo_url: vehiclePhotoUrl,
        sketch_url:        sketchUrl,
        company_name:      brand.companyName,
        tagline:           brand.tagline,
        phone:             brand.phone,
        website:           brand.website,
        logo_url:          brand.logoUrl || undefined,
        brand_colors:      brand.colors,
        font_choice:       brand.fontChoice,
        style:             brand.style,
        product_type:      productType,
        org_id:            orgId || ORG_ID,
      }

      if (productType === 'signage') {
        body.sign_type      = signType
        body.sign_width_in  = signWidthIn
        body.sign_height_in = signHeightIn
      }
      if (productType === 'apparel') {
        body.apparel_type       = apparelType
        body.apparel_base_color = apparelColor
        body.print_area         = printArea
      }

      const res  = await fetch('/api/mockup/customer-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setMockupId(data.mockup_id)
      startPolling(data.mockup_id)
    } catch (err: any) {
      setGenError(err.message)
    }
  }

  const handlePrintExport = async () => {
    if (!mockupId || !finalUrl) return
    setPrintExporting(true)
    try {
      const upRes   = await fetch('/api/mockup/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_id: mockupId, concept_url: finalUrl, org_id: orgId || ORG_ID }),
      })
      const upData  = await upRes.json()
      const upscaledUrl = upData.upscaled_url || finalUrl

      const pdfRes  = await fetch('/api/mockup/export-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_id: mockupId, upscaled_url: upscaledUrl, org_id: orgId || ORG_ID }),
      })
      const pdfData = await pdfRes.json()
      if (pdfData.print_url) {
        setPrintUrl(pdfData.print_url)
        window.open(pdfData.print_url, '_blank')
      }
    } catch { /* silent */ }
    finally { setPrintExporting(false) }
  }

  const handleLeadSubmit = async () => {
    if (!mockupId) return
    setLeadSubmitting(true)
    try {
      const res = await fetch('/api/prospects/from-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockup_id:   mockupId,
          org_id:      orgId || ORG_ID,
          lead_name:   lead.name,
          lead_email:  lead.email,
          lead_phone:  lead.phone,
          notes:       lead.notes,
          product_type: productType,
        }),
      })
      if (res.ok) setLeadSubmitted(true)
    } catch { /* silent */ }
    finally { setLeadSubmitting(false) }
  }

  // ── Step labels ─────────────────────────────────────────────────────────────
  const stepLabels = initialType
    ? ['Upload', 'Design', 'Brand', 'Generate', 'Result']
    : ['Type', 'Upload', 'Design', 'Brand', 'Generate', 'Result']
  const totalSteps = stepLabels.length - 1
  const displayStep = initialType ? step - 1 : step // offset if type is pre-set

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderProductPicker() {
    const types = [
      { value: 'wrap',     icon: Car,        label: 'Vehicle Wrap',  desc: 'Upload your vehicle photo and design your wrap' },
      { value: 'signage',  icon: LayoutGrid, label: 'Signage',       desc: 'Design a sign, banner, or yard sign' },
      { value: 'apparel',  icon: Shirt,      label: 'Apparel',       desc: 'T-shirts, hoodies, hats and more' },
    ]
    return (
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>What are you designing?</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Choose a product to get started. Our AI will generate a print-ready design.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {types.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                onClick={() => { setProductType(t.value as ProductType); setStep(1) }}
                style={{
                  background: 'var(--surface2)', border: '2px solid var(--surface2)',
                  borderRadius: 12, padding: '24px 20px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseOut={e  => (e.currentTarget.style.borderColor = 'var(--surface2)')}
              >
                <Icon size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{t.desc}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderUploadStep() {
    if (productType === 'wrap') {
      return (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Upload Your Vehicle Photo</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Take a photo or upload an existing one. Best results with a side-view shot in good lighting.</p>

          {!vehiclePhotoPreview ? (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed var(--accent)', borderRadius: 12, padding: '48px 24px',
              cursor: 'pointer', background: 'var(--surface2)', gap: 12,
            }}>
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
              {uploading ? <Loader2 size={40} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} /> : (
                <Upload size={40} style={{ color: 'var(--accent)' }} />
              )}
              <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{uploading ? 'Uploading…' : 'Click to upload or take a photo'}</span>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>JPG, PNG, HEIC — max 20 MB</span>
              {uploadErr && <span style={{ color: 'var(--red)', fontSize: 13 }}>{uploadErr}</span>}
            </label>
          ) : (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxHeight: 400 }}>
              <img src={vehiclePhotoPreview} alt="Vehicle" style={{ width: '100%', objectFit: 'cover', borderRadius: 12 }} />
              <button
                onClick={() => { setVehiclePhotoPreview(null); setVehiclePhotoUrl(null) }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6,
                  color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 13,
                }}
              >
                Change Photo
              </button>
              {uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (productType === 'signage') {
      return (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Sign Details</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Tell us about your sign. We&apos;ll generate it print-ready at your exact dimensions.</p>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Sign Type</label>
              <select value={signType} onChange={e => setSignType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }}>
                {SIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Width (inches)</label>
                <input type="number" value={signWidthIn} min={4} max={240} onChange={e => setSignWidthIn(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Height (inches)</label>
                <input type="number" value={signHeightIn} min={4} max={240} onChange={e => setSignHeightIn(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13 }}>
              Print size: <strong style={{ color: 'var(--text1)' }}>{signWidthIn}" × {signHeightIn}"</strong> at 300 DPI =&nbsp;
              <strong style={{ color: 'var(--accent)' }}>{signWidthIn * 300} × {signHeightIn * 300}px</strong> with 0.125" bleed
            </div>
          </div>
        </div>
      )
    }

    // Apparel
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Apparel Setup</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Choose your product and we&apos;ll set up the right canvas and print size.</p>
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 10 }}>Product Type</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {APPAREL_TYPES.map(t => (
                <button key={t.value} onClick={() => setApparelType(t.value)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                    background: apparelType === t.value ? 'var(--accent)' : 'var(--surface2)',
                    color: apparelType === t.value ? '#fff' : 'var(--text2)',
                    border: 'none',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 10 }}>Base Color</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['white', 'black', 'navy', 'grey'].map(c => (
                <button key={c} onClick={() => setApparelColor(c)}
                  style={{
                    width: 36, height: 36, borderRadius: 6, cursor: 'pointer', textTransform: 'capitalize',
                    background: c === 'white' ? '#f3f4f6' : c === 'black' ? '#1f2937' : c === 'navy' ? '#1e3a5f' : '#6b7280',
                    border: apparelColor === c ? '2px solid var(--accent)' : '2px solid transparent',
                    color: c === 'white' ? '#111' : '#fff', fontSize: 10, fontWeight: 600,
                  }}>
                  {c[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 10 }}>Print Area</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PRINT_AREAS.map(a => (
                <button key={a} onClick={() => setPrintArea(a)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    background: printArea === a ? 'var(--accent)' : 'var(--surface2)',
                    color: printArea === a ? '#fff' : 'var(--text2)',
                    border: 'none',
                  }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderCanvasStep() {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Design Your {productType === 'wrap' ? 'Wrap' : productType === 'signage' ? 'Sign' : 'Design'}</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>
          Use preset layouts or draw zones with your brand colors. The AI will refine your concept into a polished design.
        </p>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          {/* Preset layouts */}
          <span style={{ color: 'var(--text3)', fontSize: 12, marginRight: 4 }}>Presets:</span>
          {CANVAS_PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              title={p.desc}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'var(--surface2)', color: 'var(--text2)', border: 'none', cursor: 'pointer' }}>
              {p.label}
            </button>
          ))}

          <div style={{ width: 1, height: 24, background: 'var(--surface2)', margin: '0 4px' }} />

          {/* Tools */}
          <button title="Select / Move"
            onClick={() => setActiveTool('select')}
            style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeTool === 'select' ? 'var(--accent)' : 'var(--surface2)', color: activeTool === 'select' ? '#fff' : 'var(--text2)' }}>
            <Brush size={14} />
          </button>
          <button title="Add Color Zone"
            onClick={() => setActiveTool('rect')}
            style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeTool === 'rect' ? 'var(--accent)' : 'var(--surface2)', color: activeTool === 'rect' ? '#fff' : 'var(--text2)' }}>
            <Plus size={14} />
          </button>
          <button title="Add Text"
            onClick={() => setActiveTool('text')}
            style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeTool === 'text' ? 'var(--accent)' : 'var(--surface2)', color: activeTool === 'text' ? '#fff' : 'var(--text2)' }}>
            <Type size={14} />
          </button>
          <button title="Delete Selected" onClick={deleteSelected}
            style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text2)' }}>
            <Trash2 size={14} />
          </button>
          <button title="Clear Canvas" onClick={clearCanvas}
            style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text2)' }}>
            <RotateCcw size={14} />
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--surface2)', margin: '0 4px' }} />

          {/* Color picker */}
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>Color:</span>
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setActiveColor(c)}
              style={{
                width: 22, height: 22, borderRadius: 4, background: c, border: 'none', cursor: 'pointer',
                outline: activeColor === c ? '2px solid var(--accent)' : '2px solid transparent',
                outlineOffset: 1,
              }} />
          ))}
          <input type="color" value={activeColor} onChange={e => setActiveColor(e.target.value)}
            title="Custom color"
            style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }} />

          {/* Logo upload */}
          <label title="Add Logo" style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, background: 'var(--surface2)', color: 'var(--text2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ImageIcon size={14} />
            <span>Logo</span>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
          </label>
        </div>

        {/* Canvas */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--surface2)', position: 'relative', background: '#111' }}>
          {!isMounted ? (
            <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
          )}
          {!canvasReady && isMounted && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
              <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            </div>
          )}
        </div>

        {activeTool !== 'select' && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13, color: 'var(--accent)' }}>
            {activeTool === 'rect' ? 'Click anywhere on the canvas to place a color zone' : 'Click anywhere to place a text block — double-click to edit'}
          </div>
        )}
      </div>
    )
  }

  function renderBrandStep() {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
          {productType === 'apparel' ? 'Design Details' : 'Your Brand Info'}
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          This information will be composited onto your design.
        </p>
        <div style={{ display: 'grid', gap: 14 }}>
          {productType !== 'apparel' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Company Name *</label>
                  <input value={brand.companyName} onChange={e => setBrand(b => ({ ...b, companyName: e.target.value }))}
                    placeholder="USA Wrap Co"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Phone</label>
                  <input value={brand.phone} onChange={e => setBrand(b => ({ ...b, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Tagline / Slogan</label>
                <input value={brand.tagline} onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))}
                  placeholder="Your slogan here"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
            </>
          )}

          {/* Brand Colors */}
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 10 }}>Brand Colors</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {brand.colors.map((c, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <input type="color" value={c}
                    onChange={e => setBrand(b => {
                      const cols = [...b.colors]
                      cols[i] = e.target.value
                      return { ...b, colors: cols }
                    })}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Color {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 8 }}>Logo {brand.logoUrl ? '✓' : '(optional)'}</label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--surface2)', cursor: 'pointer', fontSize: 13, color: 'var(--text1)' }}>
              {logoUploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
              {brand.logoUrl ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            </label>
            {brand.logoUrl && <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--green)' }}>Uploaded</span>}
          </div>

          {/* Style */}
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 10 }}>Design Style</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['bold', 'clean', 'dynamic'] as StyleVibe[]).map(s => (
                <button key={s} onClick={() => setBrand(b => ({ ...b, style: s }))}
                  style={{
                    padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, textTransform: 'capitalize',
                    background: brand.style === s ? 'var(--accent)' : 'var(--surface2)',
                    color: brand.style === s ? '#fff' : 'var(--text2)',
                    border: 'none',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <label style={{ color: 'var(--text2)', fontSize: 13, display: 'block', marginBottom: 6 }}>Font</label>
            <select value={brand.fontChoice} onChange={e => setBrand(b => ({ ...b, fontChoice: e.target.value }))}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14 }}>
              {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
    )
  }

  function renderGenerateStep() {
    const STEPS_LABELS = [
      'Analyzing your design',
      'Applying to your vehicle',
      'Refining details',
      'Adding your brand',
      'Finishing up',
    ]
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <Wand2 size={48} style={{ color: 'var(--accent)', margin: '0 auto 24px', display: 'block' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Generating Your Design</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Our AI is working on your mockup. This takes about 30–60 seconds.</p>

        {genError ? (
          <div style={{ padding: '16px 20px', borderRadius: 10, background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', color: 'var(--red)', marginBottom: 16 }}>
            <AlertCircle size={18} style={{ display: 'inline', marginRight: 8 }} />
            {genError}
          </div>
        ) : (
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            {STEPS_LABELS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i < genStep ? 'var(--green)' : i === genStep ? 'var(--accent)' : 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i < genStep ? <CheckCircle size={14} color="#fff" /> :
                   i === genStep ? <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> :
                   <span style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</span>}
                </div>
                <span style={{ color: i <= genStep ? 'var(--text1)' : 'var(--text3)', fontSize: 14 }}>{label}</span>
              </div>
            ))}
            <p style={{ marginTop: 16, color: 'var(--text3)', fontSize: 13 }}>{genStatus}</p>
          </div>
        )}

        {genError && (
          <button onClick={() => setStep(3)}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
            Go Back & Try Again
          </button>
        )}
      </div>
    )
  }

  function renderResultsStep() {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Your Mockup is Ready!</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          Download the print-ready file (300 DPI with bleed marks) or request a quote to get started.
        </p>

        {finalUrl && (
          <div style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--surface2)' }}>
            <img src={finalUrl} alt="Generated mockup" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        {/* Print spec */}
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
          Print spec:&nbsp;
          {productType === 'signage' && <><strong style={{ color: 'var(--text1)' }}>{signWidthIn}" × {signHeightIn}"</strong> at </>}
          <strong style={{ color: 'var(--accent)' }}>300 DPI</strong>, print-ready PDF with 0.125" bleed marks
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          {finalUrl && (
            <a href={finalUrl} download="mockup-preview.png" target="_blank" rel="noopener"
              style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text1)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <Download size={16} /> Download Preview
            </a>
          )}
          <button onClick={handlePrintExport} disabled={printExporting}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: printExporting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            {printExporting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Preparing…</> : <><Download size={16} /> Download Print-Ready PDF</>}
          </button>
          {printUrl && (
            <a href={printUrl} download="print-ready.pdf" target="_blank" rel="noopener"
              style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--green)', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <CheckCircle size={16} /> PDF Ready — Download
            </a>
          )}
        </div>

        {/* Lead capture */}
        {!leadSubmitted ? (
          <div style={{ padding: '24px', borderRadius: 12, border: '1px solid var(--surface2)', background: 'var(--surface2)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Ready to get a quote?</h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 18 }}>We&apos;ll reach out within 1 business day with pricing and next steps.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 12, display: 'block', marginBottom: 4 }}>Your Name *</label>
                <input value={lead.name} onChange={e => setLead(l => ({ ...l, name: e.target.value }))}
                  placeholder="Jane Smith"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--surface)', background: 'var(--surface)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 12, display: 'block', marginBottom: 4 }}>Email *</label>
                <input type="email" value={lead.email} onChange={e => setLead(l => ({ ...l, email: e.target.value }))}
                  placeholder="jane@company.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--surface)', background: 'var(--surface)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 12, display: 'block', marginBottom: 4 }}>Phone</label>
                <input value={lead.phone} onChange={e => setLead(l => ({ ...l, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--surface)', background: 'var(--surface)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ color: 'var(--text2)', fontSize: 12, display: 'block', marginBottom: 4 }}>Notes</label>
                <input value={lead.notes} onChange={e => setLead(l => ({ ...l, notes: e.target.value }))}
                  placeholder="Any details..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--surface)', background: 'var(--surface)', color: 'var(--text1)', fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleLeadSubmit} disabled={leadSubmitting || !lead.name || !lead.email}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: (!lead.name || !lead.email) ? 0.5 : 1 }}>
                {leadSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                Request a Quote
              </button>
              {onStartProject && mockupId && finalUrl && (
                <button onClick={() => onStartProject(mockupId!, finalUrl!)}
                  style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 14 }}>
                  Start This Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', borderRadius: 12, border: '1px solid var(--green)', background: 'rgba(34,192,122,0.08)', textAlign: 'center' }}>
            <CheckCircle size={32} style={{ color: 'var(--green)', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Quote Requested!</h3>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>We&apos;ll be in touch within 1 business day. Check your email for confirmation.</p>
          </div>
        )}
      </div>
    )
  }

  // ── Step validation (can proceed?) ─────────────────────────────────────────
  const canProceed = (): boolean => {
    if (!initialType && step === 0) return true
    const s = initialType ? step : step - 1
    if (s === 0) {
      if (productType === 'wrap') return !!vehiclePhotoUrl && !uploading
      if (productType === 'signage') return signWidthIn > 0 && signHeightIn > 0
      return true
    }
    if (s === 1) return canvasReady
    if (s === 2) return true // brand info — always proceed
    return true
  }

  const handleNext = () => {
    if (!initialType && step === 0) { setStep(1); return }
    const s = initialType ? step : step - 1
    if (s === 2) { handleGenerate(); return } // step 3 = brand → trigger generate
    setStep(prev => prev + 1)
  }

  const handleBack = () => setStep(prev => Math.max(0, prev - 1))

  // ── Active step content ─────────────────────────────────────────────────────
  const currentContent = () => {
    if (!initialType && step === 0) return renderProductPicker()
    const s = initialType ? step : step - 1
    if (s === 0) return renderUploadStep()
    if (s === 1) return renderCanvasStep()
    if (s === 2) return renderBrandStep()
    if (s === 3) return renderGenerateStep()
    return renderResultsStep()
  }

  const isGenerateStep = (initialType ? step === 3 : step === 4)
  const isResultStep   = (initialType ? step === 4 : step === 5)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <Stepper step={initialType ? step : step} labels={stepLabels} />

      <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--surface2)', padding: '28px 28px 24px', minHeight: 400 }}>
        {currentContent()}
      </div>

      {/* Nav buttons */}
      {!isGenerateStep && !isResultStep && !(step === 0 && !initialType) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button onClick={handleBack}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={handleNext} disabled={!canProceed()}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: canProceed() ? 'pointer' : 'not-allowed', opacity: canProceed() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
            {(initialType ? step === 2 : step === 3) ? (
              <><Wand2 size={16} /> Generate Design</>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      )}

      {/* Result nav */}
      {isResultStep && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button onClick={() => setStep(0)}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}
