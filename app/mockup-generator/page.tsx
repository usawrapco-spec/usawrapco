'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Car, Truck, Bus, Package, Anchor, Wand2,
  ChevronRight, ChevronLeft, Check, Loader2, Upload, X,
  Sparkles, ImageIcon, Download, RefreshCw, ZoomIn, ZoomOut,
  Search, ChevronDown, AlertTriangle, Zap, Bot, Layers, Globe,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface VehicleMeasurement {
  id: string
  make: string
  model: string
  year_start: number | null
  year_end: number | null
  full_wrap_sqft: number | null
  side_sqft: number | null
  hood_sqft: number | null
  roof_sqft: number | null
  back_sqft: number | null
  linear_feet: number | null
  body_style: string | null
}

interface MockupStatus {
  id: string
  status: string
  current_step: number | null
  step_name: string | null
  flat_design_url: string | null
  final_mockup_url: string | null
  concept_url: string | null
  render_url?: string | null
  upscaled_url: string | null
  print_url: string | null
  error_step: string | null
  error_message: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const BODY_TYPES = [
  { id: 'car',       label: 'Car / Sedan',      sub: 'Sedan, Coupe, Hatchback',    Icon: Car   },
  { id: 'suv',       label: 'SUV / Crossover',  sub: 'SUV, CUV, Minivan',          Icon: Car   },
  { id: 'pickup',    label: 'Pickup Truck',      sub: 'Full-size, Mid-size',        Icon: Truck },
  { id: 'van',       label: 'Cargo Van',         sub: 'Transit, ProMaster, NV',     Icon: Bus   },
  { id: 'sprinter',  label: 'Sprinter / Hi-Roof',sub: 'High-roof, Extended',        Icon: Bus   },
  { id: 'box_truck', label: 'Box Truck',         sub: '14–26 ft box body',          Icon: Package },
  { id: 'trailer',   label: 'Trailer',           sub: 'Semi, flatbed, enclosed',    Icon: Truck },
  { id: 'boat',      label: 'Boat / Marine',     sub: 'Hull, deck, console',        Icon: Anchor },
]

const POPULAR_VEHICLES = [
  { label: 'Ford Transit',       year: '2024', make: 'Ford',          model: 'Transit' },
  { label: 'MB Sprinter',        year: '2024', make: 'Mercedes-Benz', model: 'Sprinter' },
  { label: 'RAM ProMaster',      year: '2024', make: 'Ram',           model: 'ProMaster' },
  { label: 'Ford F-150',         year: '2024', make: 'Ford',          model: 'F-150' },
  { label: 'Chevy Silverado',    year: '2024', make: 'Chevrolet',     model: 'Silverado 1500' },
  { label: 'Toyota Tacoma',      year: '2024', make: 'Toyota',        model: 'Tacoma' },
  { label: 'Tesla Model Y',      year: '2023', make: 'Tesla',         model: 'Model Y' },
  { label: 'Box Truck (E-Series)', year: '2024', make: 'Ford',        model: 'E-Series' },
] as const

const YEARS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i)

const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Food & Beverage',
  'Real Estate', 'Construction', 'Medical', 'Transportation', 'Retail',
  'Cleaning Services', 'Auto Services', 'Security', 'Technology', 'Other',
]

const STYLE_OPTIONS = [
  { value: 'bold_aggressive',   label: 'Bold & Aggressive',      desc: 'High contrast, sharp angles, powerful look' },
  { value: 'clean_professional',label: 'Clean & Professional',   desc: 'Minimal, polished, corporate feel' },
  { value: 'luxury_premium',    label: 'Luxury Premium',         desc: 'Elegant, refined, premium materials' },
  { value: 'fun_playful',       label: 'Fun & Playful',          desc: 'Bright colors, friendly, approachable' },
  { value: 'industrial_tough',  label: 'Industrial Tough',       desc: 'Rugged, heavy-duty, no-nonsense' },
]

const BRAND_COLORS_PRESET = [
  '#1a1a2e', '#16213e', '#0f3460', '#e94560',
  '#2d6a4f', '#40916c', '#52b788', '#95d5b2',
  '#f77f00', '#fcbf49', '#d62828', '#3a0ca3',
  '#4361ee', '#4cc9f0', '#7209b7', '#ffffff',
  '#e5e5e5', '#888888', '#333333', '#111111',
]

const FONTS = [
  { value: 'Impact',            label: 'Impact',          preview: 'IMPACT' },
  { value: 'Bebas Neue',        label: 'Bebas Neue',      preview: 'BEBAS NEUE' },
  { value: 'Oswald',            label: 'Oswald',          preview: 'OSWALD' },
  { value: 'Montserrat',        label: 'Montserrat',      preview: 'MONTSERRAT' },
]

const COVERAGE_OPTIONS = [
  { id: 'full',          label: 'Full Wrap',    desc: '100% coverage' },
  { id: 'three_quarter', label: '3/4 Wrap',     desc: 'Sides + roof + hood' },
  { id: 'half',          label: 'Half Wrap',    desc: 'Lower half + doors' },
  { id: 'partial',       label: 'Partial',      desc: 'Custom sections' },
]

const PIPELINE_STEPS = [
  { key: 'brand',   label: 'Analyzing brand…' },
  { key: 'artwork', label: 'Creating custom artwork…' },
  { key: 'text',    label: 'Adding your information…' },
  { key: 'polish',  label: 'Applying photorealism…' },
  { key: 'render',  label: 'Rendering on vehicle…' },
  { key: 'done',    label: 'Concept ready!' },
]

const APPROVE_STEPS = [
  { key: 'upscale', label: 'Upscaling to print resolution…' },
  { key: 'pdf',     label: 'Creating print-ready PDF…' },
  { key: 'done',    label: 'Print files ready!' },
]

const STEPS = [
  { id: 1, label: 'Vehicle Type' },
  { id: 2, label: 'Your Vehicle' },
  { id: 3, label: 'Brand' },
  { id: 4, label: 'Generate' },
  { id: 5, label: 'Result' },
]

function bodyTypeToRenderCategory(bodyType: string): string {
  if (bodyType === 'box_truck') return 'box_truck'
  if (bodyType === 'trailer') return 'trailer'
  if (bodyType === 'sprinter') return 'sprinter'
  if (bodyType === 'van') return 'van'
  if (bodyType === 'pickup') return 'pickup'
  if (bodyType === 'suv') return 'suv'
  if (bodyType === 'car') return 'car'
  if (bodyType === 'boat') return 'boat'
  return 'van'
}

function bodyStyleToBodyType(bodyStyle: string): string {
  const bs = (bodyStyle || '').toLowerCase()
  if (bs.includes('box truck') || bs.includes('box_truck')) return 'box_truck'
  if (bs.includes('trailer')) return 'trailer'
  if (bs.includes('sprinter') || (bs.includes('van') && bs.includes('high'))) return 'sprinter'
  if (bs.includes('van') || bs.includes('cargo')) return 'van'
  if (bs.includes('pickup') || bs.includes('truck')) return 'pickup'
  if (bs.includes('suv') || bs.includes('crossover')) return 'suv'
  if (bs.includes('sedan') || bs.includes('coupe') || bs.includes('hatch')) return 'car'
  return 'van'
}

function estimatePrice(sqft: number, bodyType: string): number {
  const base: Record<string, number> = {
    car: 2200, suv: 2800, pickup: 2600, van: 3400,
    sprinter: 3800, box_truck: 4200, trailer: 5500, boat: 3000,
  }
  const b = base[bodyType] || 3000
  const sqftFactor = Math.max(0.8, Math.min(1.5, sqft / 280))
  return Math.round(b * sqftFactor / 100) * 100
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MockupGeneratorPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)

  // Step 1 — Body Type
  const [bodyType, setBodyType] = useState('')

  // Step 2 — Vehicle
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [makes, setMakes] = useState<string[]>([])
  const [modelOptions, setModelOptions] = useState<{ model: string; sqft: number | null }[]>([])
  const [loadingMakes, setLoadingMakes] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [vehicleMeasurement, setVehicleMeasurement] = useState<VehicleMeasurement | null>(null)
  const [dbError, setDbError] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleResults, setVehicleResults] = useState<VehicleMeasurement[]>([])
  const [vehicleSearching, setVehicleSearching] = useState(false)
  const [templateTier, setTemplateTier] = useState<1 | 2 | 3 | null>(null)
  const [coverage, setCoverage] = useState('full')
  const [estimatedSqft, setEstimatedSqft] = useState<number | null>(null)
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)

  // Step 3 — Brand
  const [websiteScrapeUrl, setWebsiteScrapeUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [tagline, setTagline] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [styleChoice, setStyleChoice] = useState('')
  const [brandColors, setBrandColors] = useState<string[]>(['#1a56f0', '#ffffff'])
  const [customColor, setCustomColor] = useState('#000000')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoNoBg, setLogoNoBg] = useState<string | null>(null)
  const [scrapedLogoUrl, setScrapedLogoUrl] = useState<string | null>(null)
  const [styleNotes, setStyleNotes] = useState('')
  const [fontChoice, setFontChoice] = useState('Impact')
  const logoRef = useRef<HTMLInputElement>(null)

  // Step 4 — Generating
  const [mockupId, setMockupId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  // Step 5 — Result
  const [mockupStatus, setMockupStatus] = useState<MockupStatus | null>(null)
  const [renderUrl, setRenderUrl] = useState<string | null>(null)
  const [showFlat, setShowFlat] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveStep, setApproveStep] = useState(0)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [printUrl, setPrintUrl] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  // ── YMM cascade: Year → Makes ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedYear) { setMakes([]); setSelectedMake(''); setSelectedModel(''); return }
    setLoadingMakes(true)
    fetch(`/api/vehicles/makes?year=${selectedYear}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setDbError(true); setMakes([]) }
        else { setMakes(d.makes || []); setDbError(false) }
      })
      .catch(() => setDbError(true))
      .finally(() => setLoadingMakes(false))
  }, [selectedYear])

  // ── YMM cascade: Make → Models ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedYear || !selectedMake) { setModelOptions([]); setSelectedModel(''); return }
    setLoadingModels(true)
    fetch(`/api/vehicles/models?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setDbError(true); setModelOptions([]) }
        else { setModelOptions(d.models || []); setDbError(false) }
      })
      .catch(() => setDbError(true))
      .finally(() => setLoadingModels(false))
  }, [selectedYear, selectedMake])

  // ── YMM cascade: Model → Full Measurement ──────────────────────────────────
  useEffect(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return
    fetch(`/api/vehicles/lookup?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}`)
      .then(r => r.json())
      .then(d => {
        const m = d.measurement as VehicleMeasurement | null
        setVehicleMeasurement(m)
        if (m) {
          const sqft = m.full_wrap_sqft || 280
          const detectedType = bodyStyleToBodyType(m.body_style || '')
          if (!bodyType) setBodyType(detectedType)
          setEstimatedSqft(sqft)
          setEstimatedPrice(estimatePrice(sqft, bodyType || detectedType))
        } else {
          const modelInfo = modelOptions.find(mo => mo.model === selectedModel)
          const sqft = modelInfo?.sqft || 280
          setEstimatedSqft(sqft)
          setEstimatedPrice(estimatePrice(sqft, bodyType || 'van'))
        }
        // Check template tier
        fetch(`/api/vehicles/template?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&body_style=${encodeURIComponent(m?.body_style || '')}`)
          .then(r => r.json())
          .then(t => setTemplateTier(t.tier as 1 | 2 | 3 || 3))
          .catch(() => setTemplateTier(3))
      })
      .catch(() => {
        const modelInfo = modelOptions.find(mo => mo.model === selectedModel)
        const sqft = modelInfo?.sqft || 280
        setEstimatedSqft(sqft)
        setEstimatedPrice(estimatePrice(sqft, bodyType || 'van'))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMake, selectedModel])

  function applyYMM(year: string, make: string, model: string) {
    setSelectedYear(year)
    setSelectedMake(make)
    setSelectedModel(model)
    setVehicleMeasurement(null)
    setTemplateTier(null)
  }

  // ── Vehicle search ─────────────────────────────────────────────────────────
  function handleVehicleSearch(q: string) {
    setVehicleSearch(q)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (q.length < 2) { setVehicleResults([]); return }
    searchDebounceRef.current = setTimeout(async () => {
      setVehicleSearching(true)
      try {
        const res = await fetch(`/api/vehicles/search?q=${encodeURIComponent(q)}&limit=8`)
        const data = await res.json()
        setVehicleResults(data.vehicles || [])
      } finally {
        setVehicleSearching(false)
      }
    }, 300)
  }

  function selectVehicleFromSearch(v: VehicleMeasurement) {
    const year = v.year_start ? String(v.year_start) : ''
    applyYMM(year, v.make, v.model)
    setVehicleSearch(`${year} ${v.make} ${v.model}`)
    setVehicleResults([])
  }

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setLogoPreview(dataUrl)
      // Attempt bg removal
      try {
        const res = await fetch('/api/mockup/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl }),
        })
        const data = await res.json()
        if (data.success && !data.skipped) setLogoNoBg(data.imageBase64)
      } catch { /* silent */ }
    }
    reader.readAsDataURL(f)
  }, [])

  async function getLogoUrl(): Promise<string | null> {
    if (!logoFile) return logoNoBg || scrapedLogoUrl || null
    try {
      const ab = await logoFile.arrayBuffer()
      const buf = new Uint8Array(ab)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const ext = logoFile.name.split('.').pop() || 'png'
      const path = `logos/${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('project-files').upload(path, buf, {
        contentType: logoFile.type, upsert: true,
      })
      if (error) return null
      const { data } = supabase.storage.from('project-files').getPublicUrl(path)
      return data.publicUrl
    } catch { return null }
  }

  // ── Website scrape ─────────────────────────────────────────────────────────
  async function handleScrape() {
    if (!websiteScrapeUrl.trim()) return
    setScraping(true)
    setScrapeError(null)
    try {
      const res = await fetch('/api/mockup/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteScrapeUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setScrapeError(data.error || 'Scrape failed'); return }
      if (data.company_name) setCompanyName(data.company_name)
      if (data.tagline) setTagline(data.tagline)
      if (data.phone) setPhone(data.phone)
      if (data.website) setWebsite(data.website)
      if (data.brand_colors?.length) setBrandColors(data.brand_colors)
      if (data.logo_url) {
        setScrapedLogoUrl(data.logo_url)
        setLogoPreview(data.logo_url)
        setLogoNoBg(data.logo_url)
      }
    } catch (err: unknown) {
      setScrapeError(err instanceof Error ? err.message : 'Scrape failed')
    } finally {
      setScraping(false)
    }
  }

  // ── Generation ─────────────────────────────────────────────────────────────
  function startPolling(id: string) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mockup/status/${id}`)
        if (!res.ok) return
        const data: MockupStatus = await res.json()
        setMockupStatus(data)
        const dbStep = data.current_step || 0
        setPipelineStep(Math.max(0, Math.min(dbStep - 1, PIPELINE_STEPS.length - 1)))
        if (data.status === 'concept_ready' || data.status === 'complete' || data.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPipelineStep(PIPELINE_STEPS.length - 1)
          setGenerating(false)
          if (data.status === 'failed') {
            setGenError(data.error_message || 'Generation failed')
          } else {
            setStep(5)
          }
        }
      } catch { /* silent */ }
    }, 2000)
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenError(null)
    setPipelineStep(0)
    setMockupStatus(null)
    setRenderUrl(null)

    try {
      const logoUrl = await getLogoUrl()
      const res = await fetch('/api/mockup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_make: selectedMake,
          vehicle_model: selectedModel,
          vehicle_year: selectedYear,
          vehicle_body_type: bodyType,
          vehicle_sqft: estimatedSqft,
          wrap_coverage: coverage,
          company_name: companyName,
          tagline, phone, website,
          logo_url: logoUrl,
          brand_colors: brandColors,
          industry,
          style_notes: styleNotes || styleChoice,
          font_choice: fontChoice,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'Generation failed')
        setGenerating(false)
        return
      }
      setMockupId(data.mockup_id)
      setRenderUrl(data.render_url || null)
      setMockupStatus({
        id: data.mockup_id,
        status: data.status,
        current_step: 6,
        step_name: 'Concept ready',
        flat_design_url: data.flat_design_url,
        final_mockup_url: data.render_url || data.concept_url,
        concept_url: data.concept_url,
        render_url: data.render_url,
        upscaled_url: null,
        print_url: null,
        error_step: null,
        error_message: null,
      })
      setPipelineStep(PIPELINE_STEPS.length - 1)
      setGenerating(false)
      setStep(5)
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (generating && mockupId) startPolling(mockupId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating, mockupId])

  async function handleApprove() {
    if (!mockupId) return
    setApproving(true)
    setApproveError(null)
    setApproveStep(0)
    let s = 0
    const timer = setInterval(() => {
      s = Math.min(s + 1, APPROVE_STEPS.length - 2)
      setApproveStep(s)
    }, 8000)
    try {
      const res = await fetch('/api/mockup/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_id: mockupId }),
      })
      const data = await res.json()
      clearInterval(timer)
      if (!res.ok) { setApproveError(data.error || 'Approval failed'); setApproving(false); return }
      setPrintUrl(data.print_url)
      setApproveStep(APPROVE_STEPS.length - 1)
      setApproving(false)
    } catch (err: unknown) {
      clearInterval(timer)
      setApproveError(err instanceof Error ? err.message : 'Approval failed')
      setApproving(false)
    }
  }

  function handleDownload(url: string, name: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }

  function reset() {
    setStep(1)
    setBodyType('')
    setSelectedYear('')
    setSelectedMake('')
    setSelectedModel('')
    setVehicleMeasurement(null)
    setTemplateTier(null)
    setCoverage('full')
    setEstimatedSqft(null)
    setEstimatedPrice(null)
    setMockupId(null)
    setMockupStatus(null)
    setRenderUrl(null)
    setPrintUrl(null)
    setGenError(null)
    setApproveError(null)
    setPipelineStep(0)
    setApproveStep(0)
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px',
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text1)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const sel: React.CSSProperties = { ...inp, appearance: 'none', cursor: 'pointer' }

  const vehicleSelected = !!(selectedMake && selectedModel)
  const primaryDisplay = renderUrl || mockupStatus?.final_mockup_url || mockupStatus?.concept_url

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Wand2 size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
          }}>AI Mockup Generator</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Select your vehicle, enter your brand info, and see your wrap design in minutes.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div
                onClick={() => { if (done && !generating && !approving) setStep(s.id) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', borderRadius: 8,
                  background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                  cursor: done ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <Check size={11} style={{ color: '#fff' }} />
                    : <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#fff' : 'var(--text3)' }}>{s.id}</span>
                  }
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={12} style={{ color: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Body Type ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
            What type of vehicle are we wrapping?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
            Choose the category that best matches your vehicle.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {BODY_TYPES.map(bt => {
              const Icon = bt.Icon
              const sel2 = bodyType === bt.id
              return (
                <div
                  key={bt.id}
                  onClick={() => { setBodyType(bt.id); setTimeout(() => setStep(2), 120) }}
                  style={{
                    padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                    border: sel2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: sel2 ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    textAlign: 'center', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: sel2 ? 'rgba(79,127,255,0.15)' : 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={26} style={{ color: sel2 ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sel2 ? 'var(--accent)' : 'var(--text1)', marginBottom: 2 }}>
                      {bt.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{bt.sub}</div>
                  </div>
                  {sel2 && (
                    <Check size={14} style={{ color: 'var(--accent)', position: 'absolute' as const, top: 10, right: 10 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: Your Vehicle ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
            Select your vehicle
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 22 }}>
            We use this to size the design correctly and calculate your quote.
          </p>

          {dbError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
              <AlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>Vehicle database error — use search below</span>
            </div>
          )}

          {/* Popular quick-picks */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Popular Vehicles
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {POPULAR_VEHICLES.map(v => {
                const isActive = selectedMake === v.make && selectedModel === v.model
                return (
                  <button
                    key={v.label}
                    onClick={() => applyYMM(v.year, v.make, v.model)}
                    style={{
                      padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: isActive ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                      color: isActive ? 'var(--accent)' : 'var(--text2)',
                    }}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* YMM cascade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {/* Year */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedYear}
                  onChange={e => { setSelectedYear(e.target.value); setSelectedMake(''); setSelectedModel('') }}
                  style={sel}
                >
                  <option value="">Year</option>
                  {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
            {/* Make */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMake}
                  onChange={e => { setSelectedMake(e.target.value); setSelectedModel('') }}
                  disabled={!selectedYear || loadingMakes}
                  style={{ ...sel, opacity: (!selectedYear || loadingMakes) ? 0.45 : 1 }}
                >
                  <option value="">{loadingMakes ? 'Loading…' : 'Make'}</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
            {/* Model */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  disabled={!selectedMake || loadingModels}
                  style={{ ...sel, opacity: (!selectedMake || loadingModels) ? 0.45 : 1 }}
                >
                  <option value="">{loadingModels ? 'Loading…' : 'Model'}</option>
                  {modelOptions.map(m => <option key={m.model} value={m.model}>{m.model}{m.sqft ? ` — ${m.sqft} sqft` : ''}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* OR search */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>OR SEARCH</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                style={{ ...inp, paddingLeft: 36 }}
                placeholder="Search by make or model…"
                value={vehicleSearch}
                onChange={e => handleVehicleSearch(e.target.value)}
              />
              {vehicleSearching && <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />}
            </div>
            {vehicleResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                {vehicleResults.map((v, i) => (
                  <button key={i} onClick={() => selectVehicleFromSearch(v)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text1)', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>{v.year_start} {v.make} {v.model}</span>
                    {v.body_style && <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 11 }}>{v.body_style}</span>}
                    {v.full_wrap_sqft && <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 11 }}>{v.full_wrap_sqft} sqft</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected vehicle card */}
          {vehicleSelected && (
            <div style={{ background: 'rgba(34,192,122,0.05)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text1)' }}>{selectedYear} {selectedMake} {selectedModel}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {vehicleMeasurement?.body_style || bodyType || 'Vehicle'}
                    {estimatedSqft ? ` · ${estimatedSqft} sqft` : ''}
                  </div>
                </div>
                {estimatedPrice && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${estimatedPrice.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>est. full wrap</div>
                  </div>
                )}
              </div>

              {vehicleMeasurement && (vehicleMeasurement.hood_sqft || vehicleMeasurement.roof_sqft || vehicleMeasurement.side_sqft || vehicleMeasurement.back_sqft) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Hood',  val: vehicleMeasurement.hood_sqft },
                    { label: 'Roof',  val: vehicleMeasurement.roof_sqft },
                    { label: 'Sides', val: vehicleMeasurement.side_sqft },
                    { label: 'Back',  val: vehicleMeasurement.back_sqft },
                  ].map(p => p.val ? (
                    <div key={p.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{p.val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{p.label} sqft</div>
                    </div>
                  ) : null)}
                </div>
              ) : null}

              {/* Template badge */}
              {templateTier !== null && (
                <div>
                  {templateTier === 1 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
                      <Check size={11} style={{ color: 'var(--green)' }} />
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>Exact template available</span>
                    </div>
                  )}
                  {templateTier === 2 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
                      <Zap size={11} style={{ color: 'var(--amber)' }} />
                      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Similar template available</span>
                    </div>
                  )}
                  {templateTier === 3 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
                      <Bot size={11} style={{ color: 'var(--accent)' }} />
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>AI-rendered mockup</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Coverage selector */}
          {vehicleSelected && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Wrap Coverage
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {COVERAGE_OPTIONS.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setCoverage(c.id)}
                    style={{
                      padding: '10px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                      border: coverage === c.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: coverage === c.id ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: coverage === c.id ? 'var(--accent)' : 'var(--text1)', marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback */}
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
            {"Don't see your vehicle? "}
            <button
              onClick={() => { setSelectedMake('Custom'); setSelectedModel('Vehicle'); setEstimatedSqft(280); setEstimatedPrice(3000); setStep(3) }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Continue anyway
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!vehicleSelected}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 8, background: vehicleSelected ? 'var(--accent)' : 'var(--surface2)', color: vehicleSelected ? '#fff' : 'var(--text3)', fontSize: 13, fontWeight: 700, border: 'none', cursor: vehicleSelected ? 'pointer' : 'not-allowed' }}
            >
              Next: Brand Info <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Brand ─────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Tell us about your brand</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>
            Paste your website and we'll pull your brand info automatically, or fill it in below.
          </p>

          {/* ── Website auto-fill ── */}
          <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Globe size={12} /> Auto-Fill From Website
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="yourcompany.com"
                value={websiteScrapeUrl}
                onChange={e => setWebsiteScrapeUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleScrape() }}
              />
              <button
                onClick={handleScrape}
                disabled={scraping || !websiteScrapeUrl.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: 8,
                  background: scraping || !websiteScrapeUrl.trim() ? 'var(--surface2)' : 'var(--accent)',
                  color: scraping || !websiteScrapeUrl.trim() ? 'var(--text3)' : '#fff',
                  fontSize: 12, fontWeight: 700, border: 'none',
                  cursor: scraping || !websiteScrapeUrl.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {scraping ? <><Loader2 size={13} className="animate-spin" /> Scanning…</> : <><Sparkles size={13} /> Auto-Fill</>}
              </button>
            </div>
            {scrapeError && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)' }}>{scrapeError}</div>
            )}
            <div style={{ marginTop: 7, fontSize: 11, color: 'var(--text3)' }}>
              Pulls company name, tagline, phone, and brand colors from your logo — not random site colors.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name *</label>
              <input style={inp} placeholder="e.g. Pacific Northwest Plumbing" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tagline</label>
              <input style={inp} placeholder="Fast. Reliable. Local." value={tagline} onChange={e => setTagline(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
              <input style={inp} placeholder="(253) 555-0100" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</label>
              <input style={inp} placeholder="yoursite.com" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry</label>
              <select style={{ ...inp, appearance: 'none' }} value={industry} onChange={e => setIndustry(e.target.value)}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map(i2 => <option key={i2} value={i2}>{i2}</option>)}
              </select>
            </div>

            {/* Logo */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo (optional)</label>
              <div
                onClick={() => logoRef.current?.click()}
                style={{ height: 78, border: logoPreview ? '1px solid var(--border)' : '2px dashed var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', gap: 8, position: 'relative' }}
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" style={{ maxHeight: 60, maxWidth: 140, objectFit: 'contain' }} />
                    <button onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); setLogoNoBg(null) }}
                      style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} style={{ color: '#fff' }} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={16} style={{ color: 'var(--text3)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Upload logo</span>
                  </>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </div>

            {/* Brand colors */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand Colors (pick up to 3)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                {BRAND_COLORS_PRESET.map(c => (
                  <button key={c} onClick={() => {
                    if (brandColors.includes(c)) setBrandColors(brandColors.filter(x => x !== c))
                    else if (brandColors.length < 3) setBrandColors([...brandColors, c])
                  }} style={{ width: 30, height: 30, borderRadius: 6, background: c, border: brandColors.includes(c) ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                  onBlur={() => { if (!brandColors.includes(customColor) && brandColors.length < 3) setBrandColors([...brandColors, customColor]) }}
                  style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
              </div>
              {brandColors.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {brandColors.map(c => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 5px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{c.toUpperCase()}</span>
                      <button onClick={() => setBrandColors(brandColors.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex' }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Style */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Design Style</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                {STYLE_OPTIONS.map(s2 => (
                  <div key={s2.value} onClick={() => setStyleChoice(s2.value)}
                    style={{ padding: '10px 13px', borderRadius: 9, cursor: 'pointer', border: styleChoice === s2.value ? '2px solid var(--accent)' : '1px solid var(--border)', background: styleChoice === s2.value ? 'rgba(79,127,255,0.07)' : 'var(--surface2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: styleChoice === s2.value ? 'var(--accent)' : 'var(--text1)', marginBottom: 2 }}>{s2.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>{s2.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Font */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Text Font</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {FONTS.map(f => (
                  <div key={f.value} onClick={() => setFontChoice(f.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: fontChoice === f.value ? '2px solid var(--accent)' : '1px solid var(--border)', background: fontChoice === f.value ? 'rgba(79,127,255,0.07)' : 'var(--surface2)' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: fontChoice === f.value ? 'var(--accent)' : 'var(--text1)', fontFamily: `${f.value}, Impact, Arial Black, sans-serif`, lineHeight: 1 }}>{f.preview}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>{f.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Style notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Style Notes (optional)</label>
              <textarea
                style={{ ...inp, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }}
                placeholder="e.g. Dark background with flame graphics, large phone number on doors..."
                value={styleNotes}
                onChange={e => setStyleNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!companyName.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 8, background: companyName.trim() ? 'var(--accent)' : 'var(--surface2)', color: companyName.trim() ? '#fff' : 'var(--text3)', fontSize: 13, fontWeight: 700, border: 'none', cursor: companyName.trim() ? 'pointer' : 'not-allowed' }}
            >
              Next: Generate <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Generate ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Ready to generate your wrap concept</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 22 }}>
            Review your selections, then click Generate to start the AI pipeline.
          </p>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, background: 'var(--surface2)', borderRadius: 10, padding: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Vehicle</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{selectedYear} {selectedMake} {selectedModel}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{BODY_TYPES.find(b => b.id === bodyType)?.label || bodyType} · {COVERAGE_OPTIONS.find(c => c.id === coverage)?.label}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Company</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{companyName}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{industry || 'No industry'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Brand Colors</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {brandColors.map((c, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Font & Style</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: `${fontChoice}, Impact, sans-serif` }}>{fontChoice}</div>
              {styleChoice && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{STYLE_OPTIONS.find(s2 => s2.value === styleChoice)?.label}</div>}
            </div>
          </div>

          {/* Pipeline progress */}
          {generating && (
            <div style={{ marginBottom: 24 }}>
              {PIPELINE_STEPS.map((ps, i) => {
                const done = pipelineStep > i
                const active = pipelineStep === i
                return (
                  <div key={ps.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < PIPELINE_STEPS.length - 1 ? '1px solid var(--border)' : 'none', opacity: pipelineStep < i ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done
                        ? <Check size={13} style={{ color: 'var(--green)' }} />
                        : active
                          ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                          : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)' }}>
                      {ps.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {genError && (
            <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 13, color: 'var(--red)' }}>
              {genError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep(3)} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.4 : 1 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '12px 30px', borderRadius: 9,
                background: generating ? 'rgba(79,127,255,0.5)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 14, fontWeight: 800, border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
                boxShadow: generating ? 'none' : '0 4px 20px rgba(79,127,255,0.4)',
              }}
            >
              {generating
                ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                : <><Sparkles size={16} /> Generate My Wrap Concept</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Result ────────────────────────────────────────────────────── */}
      {step === 5 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={15} style={{ color: 'var(--accent)' }} /> Concept Ready
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {selectedYear} {selectedMake} {selectedModel} · {companyName || 'Custom Wrap'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button onClick={() => { setStep(4); handleGenerate() }} disabled={generating}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <RefreshCw size={11} /> Regenerate
              </button>
              <button onClick={() => setStep(3)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Adjust Brand
              </button>
              {primaryDisplay && (
                <button onClick={() => handleDownload(primaryDisplay, `wrap-concept-${selectedMake}-${Date.now()}.jpg`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.3)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <Download size={11} /> Download
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {/* Primary image — vehicle render */}
            {primaryDisplay ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Car size={13} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {renderUrl ? 'On-Vehicle Render' : 'Design Concept'}
                  </span>
                </div>
                <div
                  style={{ position: 'relative', cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
                  onClick={() => setZoomed(!zoomed)}
                >
                  <img
                    src={primaryDisplay}
                    alt="Vehicle wrap concept"
                    style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', display: 'block', maxHeight: zoomed ? 'none' : 520, objectFit: 'cover', transition: 'max-height 0.3s' }}
                  />
                  <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {zoomed ? <ZoomOut size={10} /> : <ZoomIn size={10} />}
                    {zoomed ? 'Collapse' : 'Zoom'}
                  </div>
                </div>

                {/* Flat design toggle */}
                {mockupStatus?.concept_url && renderUrl && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setShowFlat(!showFlat)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Layers size={12} /> {showFlat ? 'Hide flat design' : 'Also show flat design'}
                    </button>
                    {showFlat && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Flat Design</div>
                        <img
                          src={mockupStatus.concept_url}
                          alt="Flat wrap design"
                          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 300, objectFit: 'cover' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                <ImageIcon size={32} style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 14 }}>No image generated yet</div>
              </div>
            )}

            {/* Approve section */}
            <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Happy with this concept?</div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                Approve to upscale to print resolution and generate a print-ready PDF with bleed marks.
              </p>

              {approving && (
                <div style={{ marginBottom: 16 }}>
                  {APPROVE_STEPS.map((as, i) => {
                    const done = approveStep > i
                    const active = approveStep === i
                    return (
                      <div key={as.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', opacity: approveStep < i ? 0.3 : 1 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {done ? <Check size={11} style={{ color: 'var(--green)' }} /> : active ? <Loader2 size={11} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <span style={{ fontSize: 9, color: 'var(--text3)' }}>{i + 1}</span>}
                        </div>
                        <span style={{ fontSize: 12, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)', fontWeight: active ? 600 : 400 }}>{as.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {approveError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 12, color: 'var(--red)' }}>
                  {approveError}
                </div>
              )}

              {printUrl ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleDownload(printUrl, `wrap-print-ready-${Date.now()}.pdf`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8, background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                    <Download size={14} /> Download Print PDF
                  </button>
                  <button onClick={reset}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Start New Mockup
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleApprove}
                    disabled={approving || !mockupId}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, background: approving ? 'rgba(34,192,122,0.5)' : 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: approving ? 'not-allowed' : 'pointer' }}
                  >
                    {approving ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><Check size={14} /> Approve & Get Print Files</>}
                  </button>
                  <button onClick={reset}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Start Over
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
