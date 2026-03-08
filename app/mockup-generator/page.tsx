'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Car, Truck, Bus, Package, Anchor, Wand2,
  ChevronRight, ChevronLeft, Check, Loader2, Upload, X,
  Sparkles, ImageIcon, Download, RefreshCw, ZoomIn, ZoomOut,
  Search, ChevronDown, AlertTriangle, Zap, Bot, Layers, Globe, Pencil,
  LayoutGrid, RectangleHorizontal, Square, Wind,
  ThumbsUp, ThumbsDown, Calendar, Video, MapPin,
} from 'lucide-react'
import MockupEditor from '@/components/mockup/MockupEditor'

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
  { id: 'box_truck', label: 'Box Truck',         sub: '14-26 ft box body',          Icon: Package },
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
]

const BRAND_COLORS_PRESET = [
  '#1a1a2e', '#16213e', '#0f3460', '#e94560',
  '#2d6a4f', '#40916c', '#52b788', '#95d5b2',
  '#f77f00', '#fcbf49', '#d62828', '#3a0ca3',
  '#4361ee', '#4cc9f0', '#7209b7', '#ffffff',
  '#e5e5e5', '#888888', '#333333', '#111111',
]

const BOAT_SUB_TYPES = [
  { id: 'center_console', label: 'Center Console',  desc: 'Fishing, open deck, T-top' },
  { id: 'bowrider',       label: 'Bowrider',         desc: 'Sport, open bow seating' },
  { id: 'pontoon',        label: 'Pontoon',           desc: 'Flat deck, dual pontoons' },
  { id: 'bass',           label: 'Bass Boat',         desc: 'Low-profile, sleek hull' },
  { id: 'cruiser',        label: 'Cabin Cruiser',     desc: 'Enclosed cabin, yacht-style' },
  { id: 'ski',            label: 'Ski / Wake Boat',   desc: 'Inboard, tower, wakeboard' },
  { id: 'jetski',         label: 'Jet Ski / PWC',     desc: 'Personal watercraft' },
]

const COVERAGE_OPTIONS = [
  { id: 'full',          label: 'Full Wrap',      desc: '100% coverage',          pct: 1.0  },
  { id: 'three_quarter', label: '3/4 Wrap',       desc: 'Sides + roof + hood',    pct: 0.75 },
  { id: 'half',          label: 'Half Wrap',      desc: 'Lower half + doors',     pct: 0.60 },
  { id: 'quarter',       label: 'Quarter Wrap',   desc: 'Key branding areas',     pct: 0.30 },
  { id: 'spot',          label: 'Spot Graphics',  desc: 'Logo + contact decals',  pct: 0.15 },
]

const SIGN_TYPES = [
  { id: 'coroplast_18x24',   label: 'Yard Sign',         sub: '18" x 24"',    w: 18,  h: 24,  Icon: Square,              size_key: 'portrait_4_3' },
  { id: 'coroplast_24x36',   label: 'Coroplast Sign',    sub: '24" x 36"',    w: 24,  h: 36,  Icon: Square,              size_key: 'portrait_4_3' },
  { id: 'banner_2x4',        label: 'Banner 2x4',        sub: '2 ft x 4 ft',  w: 24,  h: 48,  Icon: RectangleHorizontal, size_key: 'portrait_4_3' },
  { id: 'banner_3x8',        label: 'Banner 3x8',        sub: '3 ft x 8 ft',  w: 36,  h: 96,  Icon: RectangleHorizontal, size_key: 'banner_3_1'  },
  { id: 'banner_4x8',        label: 'Banner 4x8',        sub: '4 ft x 8 ft',  w: 48,  h: 96,  Icon: RectangleHorizontal, size_key: 'banner_3_1'  },
  { id: 'a_frame_24x36',     label: 'A-Frame Sign',      sub: '24" x 36"',    w: 24,  h: 36,  Icon: LayoutGrid,          size_key: 'portrait_4_3' },
  { id: 'door_magnet_12x18', label: 'Car Door Magnet',   sub: '12" x 18"',    w: 12,  h: 18,  Icon: Car,                 size_key: 'portrait_4_3' },
  { id: 'window_cling_sq',   label: 'Window Graphic',    sub: '12" x 12"',    w: 12,  h: 12,  Icon: Wind,                size_key: 'square_hd'   },
]

const PIPELINE_STEPS_GENERATE = [
  { key: 'brand',    label: 'Analyzing brand...' },
  { key: 'concepts', label: 'Creating design concepts...' },
  { key: 'done',     label: 'Almost ready...' },
]

const PIPELINE_STEPS_FINALIZE = [
  { key: 'polish',  label: 'Processing...' },
  { key: 'done',    label: 'Almost ready...' },
]

const APPROVE_STEPS = [
  { key: 'process', label: 'Processing...' },
  { key: 'done',    label: 'Almost ready...' },
]

const WRAP_STEPS = [
  { id: 1, label: 'Vehicle Type' },
  { id: 2, label: 'Your Vehicle' },
  { id: 3, label: 'Brand & Generate' },
  { id: 4, label: 'Pick Concept' },
  { id: 5, label: 'Result' },
]

const SIGN_STEPS = [
  { id: 1, label: 'Sign Type' },
  { id: 2, label: 'Brand & Generate' },
  { id: 3, label: 'Pick Concept' },
  { id: 4, label: 'Result' },
]

const DECKING_STEPS = [
  { id: 1, label: 'Boat Type' },
  { id: 2, label: 'Deck Layout' },
  { id: 3, label: 'Brand & Generate' },
  { id: 4, label: 'Pick Concept' },
  { id: 5, label: 'Result' },
]

// Legacy alias
const STEPS = WRAP_STEPS

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
    car: 3500, suv: 4500, pickup: 4200, van: 5500,
    sprinter: 6500, box_truck: 7500, trailer: 9000, boat: 5000,
  }
  const b = base[bodyType] || 3000
  const sqftFactor = Math.max(0.8, Math.min(1.5, sqft / 280))
  return Math.round(b * sqftFactor / 100) * 100
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MockupGeneratorPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [outputType, setOutputType] = useState<'wrap' | 'signage' | 'decking'>('wrap')
  const [signType, setSignType] = useState('')

  // Concept picker
  const [concepts, setConcepts] = useState<Record<string, string | null>>({ a: null, b: null, c: null, d: null, e: null, f: null })
  const [selectedConcept, setSelectedConcept] = useState<string>('a')
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeStep, setFinalizeStep] = useState(0)
  const [conceptFeedback, setConceptFeedback] = useState('')
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null)
  const [conceptVotes, setConceptVotes] = useState<Record<string, 'up' | 'down' | null>>({ a: null, b: null, c: null, d: null, e: null, f: null })
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // Step 1 - Body Type
  const [bodyType, setBodyType] = useState('')
  const [boatSubType, setBoatSubType] = useState('')

  // Step 2 - Vehicle
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
  const [coverages, setCoverages] = useState<string[]>(['full'])
  const [estimatedSqft, setEstimatedSqft] = useState<number | null>(null)
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)

  // Step 3 - Brand
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
  const logoRef = useRef<HTMLInputElement>(null)

  // Step 4 - Generating
  const [mockupId, setMockupId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  // Step 5 - Result
  const [mockupStatus, setMockupStatus] = useState<MockupStatus | null>(null)
  const [renderUrl, setRenderUrl] = useState<string | null>(null)
  const [showFlat, setShowFlat] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveStep, setApproveStep] = useState(0)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [printUrl, setPrintUrl] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)

  // Inspiration images
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([])
  const [inspirationPreviews, setInspirationPreviews] = useState<string[]>([])
  const [inspirationUrls, setInspirationUrls] = useState<string[]>([])
  const inspirationRef = useRef<HTMLInputElement>(null)

  // Booking step
  const [bookingType, setBookingType] = useState<'zoom' | 'inshop' | null>(null)

  // Decking state
  const [deckArea, setDeckArea] = useState('full_deck')
  const [boatYear, setBoatYear] = useState('')
  const [boatMake, setBoatMake] = useState('')
  const [boatModelLen, setBoatModelLen] = useState('')
  const [deckSqft, setDeckSqft] = useState(120)

  // Sign-specific intake state
  const [signHeadline, setSignHeadline] = useState('')
  const [signSubcopy, setSignSubcopy] = useState('')
  const [signCta, setSignCta] = useState('')

  // Design notes (all output types)
  const [designNotes, setDesignNotes] = useState('')

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  // ── YMM cascade: Year -> Makes ──────────────────────────────────────────────
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

  // ── YMM cascade: Make -> Models ─────────────────────────────────────────────
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

  // ── YMM cascade: Model -> Full Measurement ──────────────────────────────────
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
          setBodyType(detectedType)
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

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length < 4) return digits
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
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
      // Attempt bg removal + color extraction in parallel
      try {
        const [bgRes, colorRes] = await Promise.all([
          fetch('/api/mockup/remove-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: dataUrl }),
          }),
          fetch('/api/mockup/scrape-brand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logo_base64: dataUrl }),
          }),
        ])
        const bgData = await bgRes.json()
        if (bgData.success && !bgData.skipped) setLogoNoBg(bgData.imageBase64)
        const colorData = await colorRes.json()
        if (colorData.brand_colors?.length) setBrandColors(colorData.brand_colors.slice(0, 5))
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

  // ── Inspiration image upload ─────────────────────────────────────────────────
  const handleInspirationUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newFiles = [...inspirationFiles, ...files].slice(0, 5)
    setInspirationFiles(newFiles)
    // Generate previews
    const previews: string[] = []
    for (const f of newFiles) {
      previews.push(URL.createObjectURL(f))
    }
    setInspirationPreviews(previews)
  }, [inspirationFiles])

  async function uploadInspirationImages(): Promise<string[]> {
    if (!inspirationFiles.length) return []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const urls: string[] = []
      for (const file of inspirationFiles) {
        const ext = file.name.split('.').pop() || 'png'
        const path = `inspiration/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const ab = await file.arrayBuffer()
        const { error } = await supabase.storage.from('project-files').upload(path, new Uint8Array(ab), {
          contentType: file.type, upsert: true,
        })
        if (!error) {
          const { data } = supabase.storage.from('project-files').getPublicUrl(path)
          urls.push(data.publicUrl)
        }
      }
      setInspirationUrls(urls)
      return urls
    } catch { return [] }
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
      if (data.phone) setPhone(formatPhone(data.phone))
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
        setPipelineStep(Math.max(0, Math.min(dbStep - 1, PIPELINE_STEPS_GENERATE.length - 1)))
        if (data.status === 'concepts_ready' || data.status === 'concept_ready' || data.status === 'complete' || data.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setPipelineStep(PIPELINE_STEPS_GENERATE.length - 1)
          setGenerating(false)
          if (data.status === 'failed') {
            setGenError(data.error_message || 'Generation failed')
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
    setConcepts({ a: null, b: null, c: null, d: null, e: null, f: null })
    setConceptFeedback('')
    setShowFeedbackFor(null)
    setConceptVotes({ a: null, b: null, c: null })

    const signInfo = SIGN_TYPES.find(s => s.id === signType)

    try {
      const logoUrl = await getLogoUrl()
      const inspoUrls = await uploadInspirationImages()
      const signStyleNotes = outputType === 'signage'
        ? [
            styleChoice,
            signHeadline ? `Headline: "${signHeadline}"` : '',
            signSubcopy ? `Body: ${signSubcopy}` : '',
            signCta ? `CTA: "${signCta}"` : '',
          ].filter(Boolean).join('. ')
        : outputType === 'decking'
        ? [
            styleChoice,
            `Deck area: ${deckArea}`,
            (boatYear || boatMake || boatModelLen) ? `Boat: ${[boatYear, boatMake, boatModelLen].filter(Boolean).join(' ')}` : '',
            designNotes || '',
          ].filter(Boolean).join('. ')
        : [styleChoice, designNotes].filter(Boolean).join('. ')

      const res = await fetch('/api/mockup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_type: outputType,
          sign_type: signType || undefined,
          sign_width_in: signInfo?.w,
          sign_height_in: signInfo?.h,
          size_key: signInfo?.size_key || 'landscape_16_9',
          vehicle_make: outputType === 'decking' ? boatMake : selectedMake,
          vehicle_model: outputType === 'decking' ? boatModelLen : selectedModel,
          vehicle_year: outputType === 'decking' ? boatYear : selectedYear,
          vehicle_body_type: outputType === 'decking' ? 'boat' : bodyType,
          vehicle_sqft: outputType === 'decking' ? deckSqft : estimatedSqft,
          wrap_coverage: coverages[0] || 'full',
          company_name: companyName,
          tagline, phone, website,
          logo_url: logoUrl,
          brand_colors: brandColors,
          industry,
          style_notes: signStyleNotes || undefined,
          inspiration_urls: inspoUrls,
          boat_sub_type: boatSubType || undefined,
          ...(outputType === 'decking' ? {
            deck_area: deckArea,
            boat_details: [boatYear, boatMake, boatModelLen].filter(Boolean).join(' '),
          } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'Generation failed')
        setGenerating(false)
        return
      }
      setMockupId(data.mockup_id)
      setConcepts({
        a: data.concept_a_url || null,
        b: data.concept_b_url || null,
        c: data.concept_c_url || null,
        d: data.concept_d_url || null,
        e: data.concept_e_url || null,
        f: data.concept_f_url || null,
      })
      setPipelineStep(PIPELINE_STEPS_GENERATE.length - 1)
      setGenerating(false)
      // Go to concept picker step (wrap: 4, signage: 3)
      setStep(outputType === 'signage' ? 3 : 4)
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  async function handleFinalize(concept: string) {
    if (!mockupId) return
    setSelectedConcept(concept)
    setFinalizing(true)
    setFinalizeStep(0)
    setGenError(null)

    try {
      const timer = setInterval(() => setFinalizeStep(s => Math.min(s + 1, PIPELINE_STEPS_FINALIZE.length - 2)), 10000)
      const res = await fetch('/api/mockup/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_id: mockupId, selected_concept: concept, feedback: conceptFeedback || undefined }),
      })
      clearInterval(timer)
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'Finalization failed')
        setFinalizing(false)
        return
      }
      setRenderUrl(data.render_url || null)
      setMockupStatus({
        id: mockupId,
        status: 'concept_ready',
        current_step: 6,
        step_name: 'Concept ready',
        flat_design_url: data.flat_design_url,
        final_mockup_url: data.concept_url,
        concept_url: data.concept_url,
        render_url: data.render_url,
        upscaled_url: null,
        print_url: null,
        error_step: null,
        error_message: null,
      })
      setFinalizeStep(PIPELINE_STEPS_FINALIZE.length - 1)
      setFinalizing(false)
      setStep(outputType === 'signage' ? 4 : 5)
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Finalization failed')
      setFinalizing(false)
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
    setSignType('')
    setSelectedYear('')
    setSelectedMake('')
    setSelectedModel('')
    setVehicleMeasurement(null)
    setTemplateTier(null)
    setCoverages(['full'])
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
    setConcepts({ a: null, b: null, c: null, d: null, e: null, f: null })
    setFinalizing(false); setFinalizeStep(0)
    setConceptFeedback('')
    setShowFeedbackFor(null)
    setConceptVotes({ a: null, b: null, c: null })
    setBookingType(null)
    setDeckArea('full_deck')
    setBoatYear('')
    setBoatMake('')
    setBoatModelLen('')
    setDeckSqft(120)
    setSignHeadline('')
    setSignSubcopy('')
    setSignCta('')
    setDesignNotes('')
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text1)',
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
  }
  const sel: React.CSSProperties = { ...inp, appearance: 'none', cursor: 'pointer' }

  const vehicleSelected = !!(selectedMake && selectedModel)
  const primaryDisplay = renderUrl || mockupStatus?.final_mockup_url || mockupStatus?.concept_url

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Wand2 size={28} style={{ color: 'var(--accent)' }} />
            <h1 style={{
              fontSize: 28, fontWeight: 800, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
            }}>AI Mockup Generator</h1>
          </div>
          {/* Output type toggle */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, border: '1px solid var(--border)', gap: 2 }}>
            {(['wrap', 'signage', 'decking'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setOutputType(type); setStep(1); setSignType(''); setBodyType('') }}
                style={{
                  padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: outputType === type ? 'var(--accent)' : 'transparent',
                  color: outputType === type ? '#fff' : 'var(--text2)',
                }}
              >
                {type === 'wrap' ? 'Vehicle Wrap' : type === 'signage' ? 'Signage' : 'Boat Decking'}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text3)', marginTop: 6 }}>
          {outputType === 'wrap'
            ? 'Select your vehicle, enter your brand info, and get 3 design concepts in minutes.'
            : outputType === 'signage'
            ? 'Generate professional print-ready signs, banners, and door magnets.'
            : 'Design custom SeaDek and marine vinyl decking for your boat.'}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, overflowX: 'auto' }}>
        {(outputType === 'signage' ? SIGN_STEPS : outputType === 'decking' ? DECKING_STEPS : WRAP_STEPS).map((s, i) => {
          const done = step > s.id
          const active = step === s.id
          const stepList = outputType === 'signage' ? SIGN_STEPS : outputType === 'decking' ? DECKING_STEPS : WRAP_STEPS
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div
                onClick={() => { if (done && !generating && !approving) setStep(s.id) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px', borderRadius: 10,
                  background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                  cursor: done ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <Check size={13} style={{ color: '#fff' }} />
                    : <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : 'var(--text3)' }}>{s.id}</span>
                  }
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                }}>{s.label}</span>
              </div>
              {i < stepList.length - 1 && (
                <ChevronRight size={14} style={{ color: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Sign Type (signage mode) ──────────────────────────────────── */}
      {step === 1 && outputType === 'signage' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>What type of sign?</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 28 }}>Choose the format and size.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
            {SIGN_TYPES.map(st => {
              const Icon = st.Icon
              const sel2 = signType === st.id
              return (
                <div key={st.id} onClick={() => { setSignType(st.id); setTimeout(() => setStep(2), 100) }}
                  style={{ padding: '20px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: sel2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: sel2 ? 'rgba(79,127,255,0.08)' : 'var(--surface2)', transition: 'all 0.15s' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: sel2 ? 'rgba(79,127,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Icon size={26} style={{ color: sel2 ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sel2 ? 'var(--accent)' : 'var(--text1)', marginBottom: 3 }}>{st.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{st.sub}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStep(2)} disabled={!signType}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: signType ? 'var(--accent)' : 'var(--surface2)', color: signType ? '#fff' : 'var(--text3)', fontSize: 15, fontWeight: 700, border: 'none', cursor: signType ? 'pointer' : 'not-allowed' }}>
              Next: Brand Info <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Body Type (wrap mode) ─────────────────────────────────────── */}
      {step === 1 && outputType === 'wrap' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
            What type of vehicle are we wrapping?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 28 }}>
            Choose the category that best matches your vehicle.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {BODY_TYPES.map(bt => {
              const Icon = bt.Icon
              const sel2 = bodyType === bt.id
              return (
                <div
                  key={bt.id}
                  onClick={() => { setBodyType(bt.id); setBoatSubType(''); if (bt.id !== 'boat') setTimeout(() => setStep(2), 120) }}
                  style={{
                    padding: '24px 20px', borderRadius: 14, cursor: 'pointer',
                    border: sel2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: sel2 ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    textAlign: 'center', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    width: 60, height: 60, borderRadius: 14,
                    background: sel2 ? 'rgba(79,127,255,0.15)' : 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={30} style={{ color: sel2 ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: sel2 ? 'var(--accent)' : 'var(--text1)', marginBottom: 3 }}>
                      {bt.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{bt.sub}</div>
                  </div>
                  {sel2 && (
                    <Check size={16} style={{ color: 'var(--accent)', position: 'absolute', top: 12, right: 12 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Boat sub-type selector */}
          {bodyType === 'boat' && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
                What type of boat?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 16 }}>
                Select your hull type for the most accurate mockup.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {BOAT_SUB_TYPES.map(bt => {
                  const sel = boatSubType === bt.id
                  return (
                    <div
                      key={bt.id}
                      onClick={() => { setBoatSubType(bt.id); setTimeout(() => setStep(2), 120) }}
                      style={{
                        padding: '16px 14px', borderRadius: 12, cursor: 'pointer',
                        border: sel ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: sel ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: sel ? 'var(--accent)' : 'var(--text1)', marginBottom: 2 }}>
                        {bt.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{bt.desc}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: Boat Type (decking mode) ─────────────────────────────────── */}
      {step === 1 && outputType === 'decking' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>What type of boat?</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 28 }}>
            Select your hull type for the most accurate decking mockup.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
            {BOAT_SUB_TYPES.map(bt => {
              const sel2 = boatSubType === bt.id
              return (
                <div
                  key={bt.id}
                  onClick={() => setBoatSubType(bt.id)}
                  style={{
                    padding: '18px 16px', borderRadius: 12, cursor: 'pointer',
                    border: sel2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: sel2 ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    transition: 'all 0.15s', position: 'relative',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: sel2 ? 'rgba(79,127,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Layers size={22} style={{ color: sel2 ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: sel2 ? 'var(--accent)' : 'var(--text1)', marginBottom: 3 }}>{bt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{bt.desc}</div>
                  {sel2 && <Check size={14} style={{ color: 'var(--accent)', position: 'absolute', top: 10, right: 10 }} />}
                </div>
              )
            })}
          </div>

          {/* Deck Area selector */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', display: 'block', marginBottom: 14 }}>
              Which deck area are we covering?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {[
                { id: 'full_deck',       label: 'Full Deck',           desc: 'Complete top-to-bottom coverage' },
                { id: 'cockpit_only',    label: 'Cockpit Only',        desc: 'Seating and helm area' },
                { id: 'bow_only',        label: 'Bow Only',            desc: 'Forward deck section' },
                { id: 'gunwales_trim',   label: 'Gunwales & Trim',     desc: 'Perimeter rails and trim' },
                { id: 'helm_platform',   label: 'Helm Platform',       desc: 'Helm station area only' },
              ].map(da => {
                const sel2 = deckArea === da.id
                return (
                  <div key={da.id} onClick={() => setDeckArea(da.id)}
                    style={{
                      padding: '14px 14px', borderRadius: 10, cursor: 'pointer',
                      border: sel2 ? '2px solid var(--cyan)' : '1px solid var(--border)',
                      background: sel2 ? 'rgba(34,211,238,0.07)' : 'var(--surface2)',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sel2 ? 'var(--cyan)' : 'var(--text1)', marginBottom: 2 }}>{da.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{da.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep(2)}
              disabled={!boatSubType}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: boatSubType ? 'var(--accent)' : 'var(--surface2)', color: boatSubType ? '#fff' : 'var(--text3)', fontSize: 15, fontWeight: 700, border: 'none', cursor: boatSubType ? 'pointer' : 'not-allowed' }}>
              Next: Deck Details <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Deck Layout / Measurements (decking mode) ─────────────────── */}
      {step === 2 && outputType === 'decking' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Boat details & deck dimensions</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 26 }}>
            We&apos;ll use these dimensions to scale the mockup correctly.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boat Year</label>
              <input style={inp} placeholder="e.g. 2019" value={boatYear} onChange={e => setBoatYear(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boat Make</label>
              <input style={inp} placeholder="Sea Ray, Grady-White, Boston Whaler..." value={boatMake} onChange={e => setBoatMake(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boat Model / Length</label>
              <input style={inp} placeholder="e.g. 30ft Center Console, SX230, 370 Sundancer..." value={boatModelLen} onChange={e => setBoatModelLen(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deck Square Footage (estimate)
              </label>
              <input
                type="number"
                style={inp}
                value={deckSqft}
                min={20}
                max={2000}
                onChange={e => setDeckSqft(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Price estimate */}
          {deckSqft > 0 && (
            <div style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', marginBottom: 6 }}>Estimated Decking Cost</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                ${(deckSqft * 22).toLocaleString()} &ndash; ${(deckSqft * 32).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                Based on {deckSqft} sqft at $22&ndash;$32/sqft installed (SeaDek / marine vinyl)
              </div>
            </div>
          )}

          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            We&apos;ll use these dimensions to scale the mockup correctly and calculate material quantities.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Next: Brand Info <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Your Vehicle ──────────────────────────────────────────────── */}
      {step === 2 && outputType !== 'decking' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
            Select your vehicle
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 26 }}>
            We use this to size the design correctly and calculate your quote.
          </p>

          {dbError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 22 }}>
              <AlertTriangle size={17} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600 }}>Vehicle database error - use search below</span>
            </div>
          )}

          {/* Popular quick-picks */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Popular Vehicles
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {POPULAR_VEHICLES.map(v => {
                const isActive = selectedMake === v.make && selectedModel === v.model
                return (
                  <button
                    key={v.label}
                    onClick={() => applyYMM(v.year, v.make, v.model)}
                    style={{
                      padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 500, cursor: 'pointer',
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Year */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedYear}
                  onChange={e => { setSelectedYear(e.target.value); setSelectedMake(''); setSelectedModel('') }}
                  style={sel}
                >
                  <option value="">Year</option>
                  {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
            {/* Make */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMake}
                  onChange={e => { setSelectedMake(e.target.value); setSelectedModel('') }}
                  disabled={!selectedYear || loadingMakes}
                  style={{ ...sel, opacity: (!selectedYear || loadingMakes) ? 0.45 : 1 }}
                >
                  <option value="">{loadingMakes ? 'Loading...' : 'Make'}</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
            {/* Model */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  disabled={!selectedMake || loadingModels}
                  style={{ ...sel, opacity: (!selectedMake || loadingModels) ? 0.45 : 1 }}
                >
                  <option value="">{loadingModels ? 'Loading...' : 'Model'}</option>
                  {modelOptions.map(m => <option key={m.model} value={m.model}>{m.model}{m.sqft ? ` - ${m.sqft} sqft` : ''}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* OR search */}
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>OR SEARCH</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                style={{ ...inp, paddingLeft: 40 }}
                placeholder="Search by make or model..."
                value={vehicleSearch}
                onChange={e => handleVehicleSearch(e.target.value)}
              />
              {vehicleSearching && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />}
            </div>
            {vehicleResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                {vehicleResults.map((v, i) => (
                  <button key={i} onClick={() => selectVehicleFromSearch(v)}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--text1)', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>{v.year_start} {v.make} {v.model}</span>
                    {v.body_style && <span style={{ color: 'var(--text3)', marginLeft: 10, fontSize: 12 }}>{v.body_style}</span>}
                    {v.full_wrap_sqft && <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 12 }}>{v.full_wrap_sqft} sqft</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected vehicle card */}
          {vehicleSelected && (
            <div style={{ background: 'rgba(34,192,122,0.05)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 14, padding: 22, marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text1)' }}>{selectedYear} {selectedMake} {selectedModel}</div>
                  <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 3 }}>
                    {vehicleMeasurement?.body_style || bodyType || 'Vehicle'}
                    {estimatedSqft ? ` · ${estimatedSqft} sqft` : ''}
                  </div>
                </div>
                {estimatedPrice && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${estimatedPrice.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>est. full wrap</div>
                  </div>
                )}
              </div>

              {vehicleMeasurement && (vehicleMeasurement.hood_sqft || vehicleMeasurement.roof_sqft || vehicleMeasurement.side_sqft || vehicleMeasurement.back_sqft) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Hood',  val: vehicleMeasurement.hood_sqft },
                    { label: 'Roof',  val: vehicleMeasurement.roof_sqft },
                    { label: 'Sides', val: vehicleMeasurement.side_sqft },
                    { label: 'Back',  val: vehicleMeasurement.back_sqft },
                  ].map(p => p.val ? (
                    <div key={p.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '9px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{p.val}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.label} sqft</div>
                    </div>
                  ) : null)}
                </div>
              ) : null}

              {/* Template badge */}
              {templateTier !== null && (
                <div>
                  {templateTier === 1 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                      <Check size={12} style={{ color: 'var(--green)' }} />
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>Exact template available</span>
                    </div>
                  )}
                  {templateTier === 2 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                      <Zap size={12} style={{ color: 'var(--amber)' }} />
                      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Similar template available</span>
                    </div>
                  )}
                  {templateTier === 3 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                      <Bot size={12} style={{ color: 'var(--accent)' }} />
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>AI-rendered mockup</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fallback */}
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 22 }}>
            {"Don't see your vehicle? "}
            <button
              onClick={() => { setSelectedMake('Custom'); setSelectedModel('Vehicle'); setEstimatedSqft(280); setEstimatedPrice(3000); setStep(3) }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Continue anyway
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!vehicleSelected}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: vehicleSelected ? 'var(--accent)' : 'var(--surface2)', color: vehicleSelected ? '#fff' : 'var(--text3)', fontSize: 15, fontWeight: 700, border: 'none', cursor: vehicleSelected ? 'pointer' : 'not-allowed' }}
            >
              Next: Brand Info <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 (wrap/decking) / STEP 2 (signage): Brand & Generate ─────── */}
      {((outputType === 'wrap' && step === 3) || (outputType === 'signage' && step === 2) || (outputType === 'decking' && step === 3)) && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Your brand info</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 22 }}>
            Paste your website to auto-fill, or enter manually. We&apos;ll generate 3 concepts.
          </p>

          {/* ── Website auto-fill (primary path) ── */}
          <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} /> Fastest way - paste your website
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
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
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 10,
                  background: scraping || !websiteScrapeUrl.trim() ? 'var(--surface2)' : 'var(--accent)',
                  color: scraping || !websiteScrapeUrl.trim() ? 'var(--text3)' : '#fff',
                  fontSize: 15, fontWeight: 700, border: 'none',
                  cursor: scraping || !websiteScrapeUrl.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {scraping ? <><Loader2 size={15} className="animate-spin" /> Scanning...</> : <><Sparkles size={15} /> Auto-Fill</>}
              </button>
            </div>
            {scrapeError && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--red)' }}>{scrapeError}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text3)' }}>
              Pulls company name, phone, colors &amp; logo from your website automatically.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Sign-specific fields — shown only for signage mode */}
            {outputType === 'signage' && (
              <>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Headline Text *</label>
                  <input style={inp} placeholder="e.g. 24/7 Emergency Plumbing" value={signHeadline} onChange={e => setSignHeadline(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supporting Text / Body Copy</label>
                  <textarea
                    rows={3}
                    style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="Supporting text, bullet points, special offer..."
                    value={signSubcopy}
                    onChange={e => setSignSubcopy(e.target.value)}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Call to Action</label>
                  <input style={inp} placeholder='e.g. "Call Now!", "Free Estimate", "Visit Our Website"' value={signCta} onChange={e => setSignCta(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                  <input style={inp} placeholder="(253) 555-0100" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</label>
                  <input style={inp} placeholder="yoursite.com" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
              </>
            )}

            {/* Generic fields — shown for wrap and decking modes */}
            {outputType !== 'signage' && (
              <>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name *</label>
                  <input style={inp} placeholder="e.g. Pacific Northwest Plumbing" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tagline</label>
                  <input style={inp} placeholder="Fast. Reliable. Local." value={tagline} onChange={e => setTagline(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                  <input style={inp} placeholder="(253) 555-0100" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</label>
                  <input style={inp} placeholder="yoursite.com" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry</label>
                  <div style={{ position: 'relative' }}>
                    <select style={{ ...inp, appearance: 'none' }} value={industry} onChange={e => setIndustry(e.target.value)}>
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map(i2 => <option key={i2} value={i2}>{i2}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </>
            )}

            {/* Logo */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo (optional)</label>
              <div
                onClick={() => logoRef.current?.click()}
                style={{ height: 90, border: logoPreview ? '1px solid var(--border)' : '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', gap: 10, position: 'relative' }}
              >
                {logoPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Logo" style={{ maxHeight: 70, maxWidth: 160, objectFit: 'contain' }} />
                    <button onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); setLogoNoBg(null) }}
                      style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} style={{ color: '#fff' }} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={18} style={{ color: 'var(--text3)' }} />
                    <span style={{ fontSize: 14, color: 'var(--text3)' }}>Upload logo</span>
                  </>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </div>

            {/* Brand colors */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand Colors (pick up to 3)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {BRAND_COLORS_PRESET.map(c => (
                  <button key={c} onClick={() => {
                    if (brandColors.includes(c)) setBrandColors(brandColors.filter(x => x !== c))
                    else if (brandColors.length < 3) setBrandColors([...brandColors, c])
                  }} style={{ width: 34, height: 34, borderRadius: 7, background: c, border: brandColors.includes(c) ? '3px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                  onBlur={() => { if (!brandColors.includes(customColor) && brandColors.length < 3) setBrandColors([...brandColors, customColor]) }}
                  style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
              </div>
              {brandColors.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {brandColors.map(c => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{c.toUpperCase()}</span>
                      <button onClick={() => setBrandColors(brandColors.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex' }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Design Style */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Design Style</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {STYLE_OPTIONS.map(s2 => (
                  <div key={s2.value} onClick={() => setStyleChoice(s2.value)}
                    style={{ padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: styleChoice === s2.value ? '2px solid var(--accent)' : '1px solid var(--border)', background: styleChoice === s2.value ? 'rgba(79,127,255,0.07)' : 'var(--surface2)' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: styleChoice === s2.value ? 'var(--accent)' : 'var(--text1)', marginBottom: 3 }}>{s2.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{s2.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Design notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Describe Your Design (optional)</label>
              <textarea
                rows={3}
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="e.g. Logo centered on both sides, phone number large on rear, gradient from dark navy to light blue..."
                value={designNotes}
                onChange={e => setDesignNotes(e.target.value)}
              />
            </div>

            {/* Coverage selector — multi-select so customer can compare prices */}
            {outputType === 'wrap' && vehicleSelected && (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Wrap Coverage
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>— select all you want to compare</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {COVERAGE_OPTIONS.map(c => {
                    const coveragePrice = estimatedPrice ? Math.round((estimatedPrice * c.pct) / 100) * 100 : null
                    const selected = coverages.includes(c.id)
                    return (
                      <div
                        key={c.id}
                        onClick={() => setCoverages(prev =>
                          prev.includes(c.id)
                            ? prev.length > 1 ? prev.filter(x => x !== c.id) : prev
                            : [...prev, c.id]
                        )}
                        style={{
                          padding: '14px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                          border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: selected ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                          position: 'relative',
                        }}
                      >
                        {selected && (
                          <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={10} style={{ color: '#fff' }} />
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text1)', marginBottom: 3 }}>{c.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{c.desc}</div>
                        {coveragePrice && (
                          <div style={{ fontSize: 15, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--green)', marginTop: 4 }}>
                            ~${coveragePrice.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inspiration images */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Inspiration / Reference Images (optional)
              </label>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>
                Upload photos of wraps you like — the AI will use them as design inspiration.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {inspirationPreviews.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Inspiration ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => {
                      setInspirationFiles(f => f.filter((_, idx) => idx !== i))
                      setInspirationPreviews(p => p.filter((_, idx) => idx !== i))
                    }} style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {inspirationFiles.length < 5 && (
                  <div
                    onClick={() => inspirationRef.current?.click()}
                    style={{ width: 90, height: 90, border: '2px dashed var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'var(--surface2)' }}
                  >
                    <ImageIcon size={18} style={{ color: 'var(--text3)' }} />
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>Add</span>
                  </div>
                )}
              </div>
              <input ref={inspirationRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleInspirationUpload} />
            </div>
          </div>

          {/* Generation progress */}
          {generating && (
            <div style={{ marginTop: 24, marginBottom: 20 }}>
              {PIPELINE_STEPS_GENERATE.map((ps, i) => {
                const done = pipelineStep > i; const active = pipelineStep === i
                return (
                  <div key={ps.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < PIPELINE_STEPS_GENERATE.length - 1 ? '1px solid var(--border)' : 'none', opacity: pipelineStep < i ? 0.3 : 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done ? <Check size={13} style={{ color: 'var(--green)' }} /> : active ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <span style={{ fontSize: 10, color: 'var(--text3)' }}>{i + 1}</span>}
                    </div>
                    <span style={{ fontSize: 14, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)', fontWeight: active ? 600 : 400 }}>{ps.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {genError && (
            <div style={{ padding: '14px 18px', borderRadius: 10, marginTop: 20, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 14, color: 'var(--red)' }}>
              {genError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(outputType === 'signage' ? 1 : 2)} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.4 : 1 }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={outputType === 'signage' ? (!signHeadline.trim() || generating) : (!companyName.trim() || generating)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 36px', borderRadius: 10,
                background: (outputType === 'signage' ? (!signHeadline.trim() || generating) : (!companyName.trim() || generating)) ? 'rgba(79,127,255,0.5)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 16, fontWeight: 800, border: 'none',
                cursor: (outputType === 'signage' ? (!signHeadline.trim() || generating) : (!companyName.trim() || generating)) ? 'not-allowed' : 'pointer',
                boxShadow: (outputType === 'signage' ? (!signHeadline.trim() || generating) : (!companyName.trim() || generating)) ? 'none' : '0 4px 20px rgba(79,127,255,0.4)',
              }}
            >
              {generating
                ? <><Loader2 size={18} className="animate-spin" /> Creating Concepts...</>
                : <><Sparkles size={18} /> Generate My {outputType === 'signage' ? 'Sign' : outputType === 'decking' ? 'Decking' : 'Wrap'} Concepts</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4 (wrap/decking) / STEP 3 (signage): Concept Picker ─────────── */}
      {((outputType === 'wrap' && step === 4) || (outputType === 'signage' && step === 3) || (outputType === 'decking' && step === 4)) && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Choose Your Design Direction</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 16 }}>
            {Object.values(concepts).filter(Boolean).length} concepts generated. Pick the direction you like and tell us what to keep or change.
          </p>

          {/* Ballpark pricing summary */}
          {estimatedPrice && outputType === 'wrap' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Price Comparison — {selectedYear} {selectedMake} {selectedModel}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {COVERAGE_OPTIONS.filter(c => coverages.includes(c.id)).map(c => {
                  const price = Math.round((estimatedPrice * c.pct) / 100) * 100
                  const isPrimary = c.id === coverages[0]
                  return (
                    <div
                      key={c.id}
                      style={{
                        flex: '1 1 auto', minWidth: 130, padding: '14px 16px', borderRadius: 12, textAlign: 'center',
                        border: isPrimary ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isPrimary ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: isPrimary ? 'var(--accent)' : 'var(--text2)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isPrimary ? 'var(--accent)' : 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>~${price.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{c.desc}</div>
                      {isPrimary && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontWeight: 700 }}>used for concepts</div>}
                    </div>
                  )
                })}
              </div>
              {coverages.length > 1 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Concepts are generated for the top option. Select your coverage when booking.
                </div>
              )}
            </div>
          )}

          {Object.values(concepts).some(Boolean) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
              {([
                { id: 'a', url: concepts.a, label: 'Bold & Aggressive' },
                { id: 'b', url: concepts.b, label: 'Clean & Professional' },
                { id: 'c', url: concepts.c, label: 'Dynamic Gradient' },
                { id: 'd', url: concepts.d, label: 'Sleek Minimal' },
                { id: 'e', url: concepts.e, label: 'Vibrant Full-Color' },
                { id: 'f', url: concepts.f, label: 'Classic Traditional' },
              ]).map(concept => concept.url ? (
                <div
                  key={concept.id}
                  style={{
                    borderRadius: 14, overflow: 'hidden',
                    border: selectedConcept === concept.id ? '3px solid var(--accent)' : '1px solid var(--border)',
                    background: 'var(--surface2)', transition: 'border-color 0.15s',
                    position: 'relative',
                  }}
                >
                  {/* Image - click to expand */}
                  <div
                    onClick={() => setExpandedImage(concept.url)}
                    style={{ cursor: 'zoom-in', position: 'relative' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={concept.url} alt={concept.label} style={{ width: '100%', display: 'block', height: 320, objectFit: 'cover' }} />
                    {/* Logo preview overlay — bottom-left, mirrors where compositeText places it */}
                    {(logoNoBg || logoPreview) && (
                      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 4 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoNoBg || logoPreview || ''}
                          alt="Your logo"
                          style={{ height: 40, maxWidth: 100, objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '5px 9px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ZoomIn size={11} /> Click to expand
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    {/* Label and select */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selectedConcept === concept.id ? 'var(--accent)' : 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {concept.label}
                      </div>
                      {selectedConcept === concept.id && <Check size={18} style={{ color: 'var(--accent)' }} />}
                    </div>

                    {/* Thumbs up / down */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button
                        onClick={() => setConceptVotes(prev => ({ ...prev, [concept.id]: prev[concept.id] === 'up' ? null : 'up' }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                          background: conceptVotes[concept.id] === 'up' ? 'rgba(34,192,122,0.15)' : 'var(--bg)',
                          border: conceptVotes[concept.id] === 'up' ? '1px solid var(--green)' : '1px solid var(--border)',
                          color: conceptVotes[concept.id] === 'up' ? 'var(--green)' : 'var(--text3)',
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        <ThumbsUp size={14} /> Like
                      </button>
                      <button
                        onClick={() => setConceptVotes(prev => ({ ...prev, [concept.id]: prev[concept.id] === 'down' ? null : 'down' }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                          background: conceptVotes[concept.id] === 'down' ? 'rgba(242,90,90,0.15)' : 'var(--bg)',
                          border: conceptVotes[concept.id] === 'down' ? '1px solid var(--red)' : '1px solid var(--border)',
                          color: conceptVotes[concept.id] === 'down' ? 'var(--red)' : 'var(--text3)',
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        <ThumbsDown size={14} /> Dislike
                      </button>
                    </div>

                    {/* Select button */}
                    <button
                      onClick={() => { setSelectedConcept(concept.id); setShowFeedbackFor(concept.id) }}
                      style={{
                        width: '100%', padding: '11px 0', borderRadius: 9, cursor: 'pointer',
                        background: selectedConcept === concept.id ? 'var(--accent)' : 'var(--bg)',
                        border: selectedConcept === concept.id ? 'none' : '1px solid var(--border)',
                        color: selectedConcept === concept.id ? '#fff' : 'var(--text2)',
                        fontSize: 14, fontWeight: 700, textAlign: 'center',
                      }}
                    >
                      {selectedConcept === concept.id ? 'Selected' : 'Use This Concept'}
                    </button>
                  </div>
                </div>
              ) : null)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)', display: 'block', margin: '0 auto 14px' }} />
              <div style={{ fontSize: 15, color: 'var(--text3)' }}>Loading concepts...</div>
            </div>
          )}

          {/* Feedback textarea - shows when user picks a concept */}
          {showFeedbackFor && (
            <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
                Tell us what you love and what you&apos;d change about this design
              </div>
              <textarea
                value={conceptFeedback}
                onChange={e => setConceptFeedback(e.target.value)}
                placeholder="e.g. Love the color layout, but make the logo bigger. Change the background pattern to something simpler..."
                style={{
                  ...inp, minHeight: 100, resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {genError && (
            <div style={{ padding: '14px 18px', borderRadius: 10, marginBottom: 20, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 14, color: 'var(--red)' }}>
              {genError}
            </div>
          )}

          {/* Finalize progress */}
          {finalizing && (
            <div style={{ marginBottom: 24 }}>
              {PIPELINE_STEPS_FINALIZE.map((ps, i) => {
                const done = finalizeStep > i; const active = finalizeStep === i
                return (
                  <div key={ps.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < PIPELINE_STEPS_FINALIZE.length - 1 ? '1px solid var(--border)' : 'none', opacity: finalizeStep < i ? 0.3 : 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done ? <Check size={13} style={{ color: 'var(--green)' }} /> : active ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <span style={{ fontSize: 10, color: 'var(--text3)' }}>{i + 1}</span>}
                    </div>
                    <span style={{ fontSize: 14, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)', fontWeight: active ? 600 : 400 }}>{ps.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(outputType === 'signage' ? 2 : 3)} disabled={finalizing}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: finalizing ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={() => { setStep(outputType === 'signage' ? 2 : 3); setTimeout(() => handleGenerate(), 50) }} disabled={finalizing}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: finalizing ? 0.4 : 1 }}>
                <RefreshCw size={13} /> Regenerate All
              </button>

            </div>
            <button
              onClick={() => handleFinalize(selectedConcept)}
              disabled={finalizing || !Object.values(concepts).some(Boolean)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 10, background: finalizing || !Object.values(concepts).some(Boolean) ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)', color: finalizing || !Object.values(concepts).some(Boolean) ? 'var(--text3)' : '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: finalizing || !Object.values(concepts).some(Boolean) ? 'not-allowed' : 'pointer', boxShadow: !finalizing && Object.values(concepts).some(Boolean) ? '0 4px 20px rgba(79,127,255,0.4)' : 'none' }}
            >
              {finalizing ? <><Loader2 size={17} className="animate-spin" /> Finalizing...</> : <><Sparkles size={17} /> Continue with Selected</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5 (wrap/decking) / STEP 4 (signage): Result ───────────────── */}
      {((outputType === 'wrap' && step === 5) || (outputType === 'signage' && step === 4) || (outputType === 'decking' && step === 5)) && (
        <div>
          <div style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 28 }}>
            {/* Header */}
            <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={18} style={{ color: 'var(--accent)' }} /> Concept Ready
                </div>
                <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 2 }}>
                  {selectedYear} {selectedMake} {selectedModel} · {companyName || 'Custom Wrap'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => { setStep(outputType === 'signage' ? 2 : 3); handleGenerate() }} disabled={generating}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <RefreshCw size={13} /> Regenerate
                </button>
                <button onClick={() => setStep(outputType === 'signage' ? 2 : 3)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Adjust Brand
                </button>
                {primaryDisplay && (
                  <>
                    <button onClick={() => setShowEditor(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--purple)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      <Pencil size={13} /> Edit / Add Text
                    </button>
                    <button onClick={() => handleDownload(primaryDisplay, `wrap-concept-${selectedMake}-${Date.now()}.jpg`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.3)', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      <Download size={13} /> Download
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: 28 }}>
              {/* Primary image - vehicle render */}
              {primaryDisplay ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Car size={15} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {renderUrl ? 'On-Vehicle Render' : 'Design Concept'}
                    </span>
                  </div>
                  <div
                    style={{ position: 'relative', cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
                    onClick={() => setZoomed(!zoomed)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryDisplay}
                      alt="Vehicle wrap concept"
                      style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', display: 'block', maxHeight: zoomed ? 'none' : 600, objectFit: 'cover', transition: 'max-height 0.3s' }}
                    />
                    <div style={{ position: 'absolute', top: 12, right: 12, padding: '6px 10px', borderRadius: 7, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {zoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                      {zoomed ? 'Collapse' : 'Zoom'}
                    </div>
                  </div>

                  {/* Flat design toggle */}
                  {mockupStatus?.concept_url && renderUrl && (
                    <div style={{ marginTop: 16 }}>
                      <button
                        onClick={() => setShowFlat(!showFlat)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Layers size={14} /> {showFlat ? 'Hide flat design' : 'Also show flat design'}
                      </button>
                      {showFlat && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Flat Design</div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mockupStatus.concept_url}
                            alt="Flat wrap design"
                            style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', maxHeight: 400, objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
                  <ImageIcon size={36} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 16 }}>No image generated yet</div>
                </div>
              )}

              {/* Approve section */}
              <div style={{ marginTop: 28, padding: 24, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Happy with this concept?</div>
                <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>
                  Approve to generate your high-resolution print-ready files.
                </p>

                {approving && (
                  <div style={{ marginBottom: 20 }}>
                    {APPROVE_STEPS.map((as2, i) => {
                      const done = approveStep > i
                      const active = approveStep === i
                      return (
                        <div key={as2.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: approveStep < i ? 0.3 : 1 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {done ? <Check size={13} style={{ color: 'var(--green)' }} /> : active ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <span style={{ fontSize: 10, color: 'var(--text3)' }}>{i + 1}</span>}
                          </div>
                          <span style={{ fontSize: 14, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)', fontWeight: active ? 600 : 400 }}>{as2.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {approveError && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 14, color: 'var(--red)' }}>
                    {approveError}
                  </div>
                )}

                {printUrl ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => handleDownload(printUrl, `wrap-print-ready-${Date.now()}.pdf`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: 'var(--green)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                      <Download size={16} /> Download Print File
                    </button>
                    <button onClick={reset}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                      Start New Mockup
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleApprove}
                      disabled={approving || !mockupId}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 26px', borderRadius: 10, background: approving ? 'rgba(34,192,122,0.5)' : 'var(--green)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: approving ? 'not-allowed' : 'pointer' }}
                    >
                      {approving ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Check size={16} /> Approve &amp; Get Print Files</>}
                    </button>
                    <button onClick={reset}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                      Start Over
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Book Your Wrap section ($250 deposit) ── */}
          {outputType === 'wrap' && primaryDisplay && (
            <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Book Your Wrap</h2>
              <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 24 }}>
                Your $250 deposit secures your design. We&apos;ll vectorize your concept and our in-house designer will refine it with you.
              </p>

              {/* Summary card */}
              <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: 22, marginBottom: 24, border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Vehicle</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>{selectedYear} {selectedMake} {selectedModel}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Company</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>{companyName || 'Custom Wrap'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Estimated Price</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {estimatedPrice ? `$${estimatedPrice.toLocaleString()}` : 'TBD'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scheduling options */}
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>How would you like to meet with our designer?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
                <div
                  onClick={() => setBookingType('zoom')}
                  style={{
                    padding: '22px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: bookingType === 'zoom' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: bookingType === 'zoom' ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: bookingType === 'zoom' ? 'rgba(79,127,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={26} style={{ color: bookingType === 'zoom' ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: bookingType === 'zoom' ? 'var(--accent)' : 'var(--text1)' }}>Online Zoom Consultation</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Meet with our designer virtually</div>
                </div>
                <div
                  onClick={() => setBookingType('inshop')}
                  style={{
                    padding: '22px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: bookingType === 'inshop' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: bookingType === 'inshop' ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: bookingType === 'inshop' ? 'rgba(79,127,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={26} style={{ color: bookingType === 'inshop' ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: bookingType === 'inshop' ? 'var(--accent)' : 'var(--text1)' }}>In-Shop Visit</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Come see us in person</div>
                </div>
              </div>

              {/* $250 deposit button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    // Navigate to deposit page (or trigger Stripe checkout)
                    window.location.href = `/deposit?mockup_id=${mockupId}&type=${bookingType || 'zoom'}&vehicle=${encodeURIComponent(`${selectedYear} ${selectedMake} ${selectedModel}`)}&company=${encodeURIComponent(companyName)}`
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '16px 40px', borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                    color: '#fff', fontSize: 18, fontWeight: 800, border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 24px rgba(79,127,255,0.4)',
                  }}
                >
                  <Calendar size={20} /> Pay $250 Design Deposit
                </button>
                <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 360 }}>
                  Applied toward your total wrap cost. Includes vectorization and a design refinement session.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Image Expand Modal ─────────────────────────────────────────────────── */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40, cursor: 'zoom-out',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expandedImage}
              alt="Expanded concept"
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
            />
            <button
              onClick={() => setExpandedImage(null)}
              style={{
                position: 'absolute', top: -16, right: -16,
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text1)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Mockup Editor overlay ─────────────────────────────────────────────── */}
      {showEditor && primaryDisplay && (
        <MockupEditor
          imageUrl={primaryDisplay}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
