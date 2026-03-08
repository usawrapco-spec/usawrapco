'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Car, Truck, Bus, Package, Anchor, Wand2,
  ChevronRight, ChevronLeft, Check, Loader2, Upload, X,
  Sparkles, ImageIcon, Download, RefreshCw, ZoomIn, ZoomOut,
  Search, ChevronDown, AlertTriangle, Zap, Bot, Layers, Globe, Pencil,
  LayoutGrid, RectangleHorizontal, Square, Wind,
  ThumbsUp, ThumbsDown, Calendar, Video, MapPin, Lock,
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
  { id: 'center_console', label: 'Center Console',    desc: 'Fishing, open deck, T-top' },
  { id: 'bowrider',       label: 'Bowrider',           desc: 'Sport, open bow seating' },
  { id: 'pontoon',        label: 'Pontoon',             desc: 'Flat deck, dual pontoons' },
  { id: 'bass',           label: 'Bass Boat',           desc: 'Low-profile, sleek hull' },
  { id: 'cruiser',        label: 'Cabin Cruiser',       desc: 'Enclosed cabin, yacht-style' },
  { id: 'ski',            label: 'Ski / Wake Boat',     desc: 'Inboard, tower, wakeboard' },
  { id: 'jetski',         label: 'Jet Ski / PWC',       desc: 'Personal watercraft' },
  { id: 'mini_jet',       label: 'Mini Jet Boat',       desc: 'Compact jet-powered, river ready' },
  { id: 'aluminum',       label: 'Aluminum / Jon Boat', desc: 'Utility flat, fishing' },
]

const DECK_STYLES = [
  { id: 'teak_straight',    label: 'Straight Teak',         desc: 'Classic parallel teak plank lines',              color: '#8B6914', accent: '#5a3e0a' },
  { id: 'teak_herringbone', label: 'Herringbone Teak',       desc: 'Diagonal alternating plank pattern',             color: '#9B7A1A', accent: '#6b4a10' },
  { id: 'teak_caulk',       label: 'Teak with Black Caulk',  desc: 'Traditional teak with black seam lines',         color: '#7a5c0e', accent: '#1a1a1a' },
  { id: 'carbon_fiber',     label: 'Carbon Fiber',           desc: 'Woven carbon fiber texture, sport look',         color: '#1a1a1a', accent: '#3a3a3a' },
  { id: 'diamond_grip',     label: 'Diamond Grip',           desc: 'Embossed diamond non-slip pattern',              color: '#2a2a3a', accent: '#4a4a6a' },
  { id: 'solid_grey',       label: 'Solid Grey',             desc: 'Clean flat grey, minimal and modern',            color: '#888',    accent: '#555' },
  { id: 'solid_black',      label: 'Solid Black',            desc: 'All black matte finish',                         color: '#111',    accent: '#333' },
  { id: 'custom',           label: 'Custom / Mixed',         desc: 'Tell us your vision — we can do combinations',   color: '#4f7fff', accent: '#2a4abf' },
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

const MARINE_STEPS = [
  { id: 1, label: 'Boat Service' },
  { id: 2, label: 'Boat Details' },
  { id: 3, label: 'Style & Brand' },
  { id: 4, label: 'Pick Concept' },
  { id: 5, label: 'Result' },
]

// Legacy alias
const STEPS = WRAP_STEPS

const FREE_WRAP_GENS = 2
const FREE_BOAT_GENS = 1

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

function estimatePrice(sqft: number, bodyType: string): { mid: number; low: number; high: number } {
  const base: Record<string, number> = {
    car: 3500, suv: 4500, pickup: 4200, van: 5500,
    sprinter: 6500, box_truck: 7500, trailer: 9000, boat: 5000,
  }
  const b = base[bodyType] || 3000
  const sqftFactor = Math.max(0.8, Math.min(1.5, sqft / 280))
  const mid = Math.round(b * sqftFactor / 100) * 100
  return {
    mid,
    low: Math.round(mid * 0.90 / 100) * 100,
    high: Math.round(mid * 1.05 / 100) * 100,
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MockupGeneratorPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [outputType, setOutputType] = useState<'wrap' | 'signage' | 'decking' | 'boat' | 'marine'>('wrap')
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
  const [estimatedPrice, setEstimatedPrice] = useState<{ mid: number; low: number; high: number } | null>(null)
  const [vehicleColor, setVehicleColor] = useState('White')
  const [fleetMode, setFleetMode] = useState(false)
  const [fleetVehicles, setFleetVehicles] = useState<Array<{
    year: string; make: string; model: string; bodyType: string
    sqft: number; price: { low: number; mid: number; high: number } | null
    color: string
  }>>([])

  // Revision modal state
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [revisionCallback, setRevisionCallback] = useState<(() => void) | null>(null)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [hasRegenerated, setHasRegenerated] = useState(false)

  // Exit gate / auth state
  const [showExitGate, setShowExitGate] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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
  const [processingLogo, setProcessingLogo] = useState(false)
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
  const [deckStyle, setDeckStyle] = useState('teak_straight')

  // Marine combined service state
  const [marineService, setMarineService] = useState<'wrap' | 'decking' | 'both'>('wrap')

  // Sign-specific intake state
  const [signHeadline, setSignHeadline] = useState('')
  const [signSubcopy, setSignSubcopy] = useState('')
  const [signCta, setSignCta] = useState('')

  // Design notes (all output types)
  const [designNotes, setDesignNotes] = useState('')

  // Example mockups gallery
  const [exampleMockups, setExampleMockups] = useState<Array<{ id: string; concept_a_url: string | null; company_name: string | null; vehicle_make: string | null; vehicle_model: string | null }>>([])

  useEffect(() => {
    supabase.from('mockup_results')
      .select('id, concept_a_url, company_name, vehicle_make, vehicle_model')
      .in('status', ['concepts_ready', 'concept_ready'])
      .not('concept_a_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data?.length) setExampleMockups(data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exit gate on browser unload — only if they have generated something and aren't logged in
  useEffect(() => {
    if (!mockupId || isLoggedIn) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      setShowExitGate(true)
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [mockupId, isLoggedIn])

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
        setProcessingLogo(true)
        // Process logo in background: remove bg + extract colors
        ;(async () => {
          try {
            const [bgRes, colorRes] = await Promise.all([
              fetch('/api/mockup/remove-bg', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: data.logo_url }),
              }),
              fetch('/api/mockup/scrape-brand', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo_url: data.logo_url }),
              }),
            ])
            const bgData = await bgRes.json()
            if (bgData.success && !bgData.skipped && bgData.imageBase64) {
              setLogoNoBg(bgData.imageBase64)
            } else {
              setLogoNoBg(data.logo_url)
            }
            const colorData = await colorRes.json()
            if (colorData.brand_colors?.length) setBrandColors(colorData.brand_colors.slice(0, 3))
          } catch { setLogoNoBg(data.logo_url) }
          finally { setProcessingLogo(false) }
        })()
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
    // Check free generation limit
    const genKey = `portal_gen_count_${outputType}`
    const used = parseInt(localStorage.getItem(genKey) || '0', 10)
    const freeLimit = (outputType === 'boat' || outputType === 'marine') ? FREE_BOAT_GENS : FREE_WRAP_GENS
    if (!isLoggedIn && used >= freeLimit) {
      setShowExitGate(true)
      return
    }
    localStorage.setItem(genKey, String(used + 1))

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
      const marineNotes = (outputType === 'marine' && (marineService === 'decking' || marineService === 'both'))
        ? `Marine vinyl decking style: ${DECK_STYLES.find(d => d.id === deckStyle)?.label} — ${DECK_STYLES.find(d => d.id === deckStyle)?.desc}. `
        : ''
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
        : outputType === 'marine'
        ? [
            marineNotes,
            styleChoice,
            outputType === 'marine' ? `Service: ${marineService}` : '',
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
          vehicle_make: (outputType === 'decking' || outputType === 'marine') ? boatMake : selectedMake,
          vehicle_model: (outputType === 'decking' || outputType === 'marine') ? boatModelLen : selectedModel,
          vehicle_year: (outputType === 'decking' || outputType === 'marine') ? boatYear : selectedYear,
          vehicle_body_type: (outputType === 'decking' || outputType === 'marine') ? 'boat' : (outputType === 'boat' ? 'boat' : bodyType),
          vehicle_sqft: (outputType === 'decking' || outputType === 'marine') ? deckSqft : estimatedSqft,
          vehicle_paint_color: vehicleColor,
          wrap_coverage: coverages[0] || 'full',
          company_name: companyName,
          tagline, phone, website,
          logo_url: logoUrl,
          brand_colors: brandColors,
          industry,
          style_notes: signStyleNotes || undefined,
          inspiration_urls: inspoUrls,
          boat_sub_type: boatSubType || undefined,
          ...((outputType === 'decking' || outputType === 'marine') ? {
            deck_area: deckArea,
            boat_details: [boatYear, boatMake, boatModelLen].filter(Boolean).join(' '),
            ...(outputType === 'marine' ? { marine_service: marineService, deck_style: deckStyle } : {}),
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
      // Go to concept picker step (wrap/boat: 4, signage: 3)
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
      // boat and wrap both go to step 5
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
    setDeckStyle('teak_straight')
    setMarineService('wrap')
    setSignHeadline('')
    setSignSubcopy('')
    setSignCta('')
    setDesignNotes('')
    setProcessingLogo(false)
    setVehicleColor('White')
    setFleetMode(false)
    setFleetVehicles([])
    setHasRegenerated(false)
    setShowRevisionModal(false)
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
  const isDeckingOnly = outputType === 'marine' && marineService === 'decking'

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
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, border: '1px solid var(--border)', gap: 2, flexWrap: 'wrap' }}>
            {([
              { id: 'wrap', label: 'Vehicle Wrap', locked: false },
              { id: 'marine', label: 'Boat Wraps & Decking', locked: false },
              { id: 'signage', label: 'Signage', locked: !isLoggedIn },
            ] as const).map(({ id, label, locked }) => (
              <button key={id}
                onClick={() => {
                  if (locked) { setShowExitGate(true); return }
                  setOutputType(id as 'wrap' | 'signage' | 'marine')
                  setStep(1)
                  setSignType('')
                  setBodyType(id === 'marine' ? '' : '')
                }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: outputType === id ? 'var(--accent)' : 'transparent',
                  color: outputType === id ? '#fff' : locked ? 'var(--text3)' : 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 5, position: 'relative' }}>
                {locked && <Lock size={11} />}
                {label}
                {locked && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', marginLeft: 2 }}>Sign in to unlock</span>}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text3)', marginTop: 6 }}>
          {outputType === 'wrap'
            ? 'Select your vehicle, enter your brand info, and get 3 design concepts in minutes.'
            : outputType === 'marine'
            ? 'Choose boat wrap, deck vinyl, or both — get AI concepts for your vessel in minutes.'
            : outputType === 'signage'
            ? 'Generate professional print-ready signs, banners, and door magnets.'
            : 'Design custom marine vinyl decking for your boat — teak patterns, flat styles, and more.'}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        STEP {step} OF {(outputType === 'signage' ? SIGN_STEPS : outputType === 'decking' ? DECKING_STEPS : outputType === 'marine' ? MARINE_STEPS : WRAP_STEPS).length}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, overflowX: 'auto' }}>
        {(outputType === 'signage' ? SIGN_STEPS : outputType === 'decking' ? DECKING_STEPS : outputType === 'marine' ? MARINE_STEPS : WRAP_STEPS).map((s, i) => {
          const done = step > s.id
          const active = step === s.id
          const stepList = outputType === 'signage' ? SIGN_STEPS : outputType === 'decking' ? DECKING_STEPS : outputType === 'marine' ? MARINE_STEPS : WRAP_STEPS
          // boat uses same steps as wrap
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

      {/* ── STEP 1: Marine (Boat Wraps & Decking) ────────────────────────────── */}
      {step === 1 && outputType === 'marine' && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>What are you looking for?</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 28 }}>Choose your service — we can do one or both on the same boat.</p>

          {/* Service picker */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
            {([
              { id: 'wrap' as const,    label: 'Boat Wrap',        desc: 'Full hull and body graphics — your brand, colors, and design printed on marine-grade vinyl',                                     icon: Anchor },
              { id: 'decking' as const, label: 'Deck Vinyl',       desc: 'Marine vinyl flooring for your deck, cockpit, and swim platform — non-slip, UV resistant',                                       icon: Layers },
              { id: 'both' as const,    label: 'Wrap + Decking',   desc: 'Complete boat transformation — matching wrap and deck vinyl for a unified look',                                                  icon: Sparkles },
            ]).map(s => {
              const Icon = s.icon
              return (
                <div key={s.id} onClick={() => setMarineService(s.id)}
                  style={{ padding: '20px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: marineService === s.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: marineService === s.id ? 'rgba(79,127,255,0.08)' : 'var(--surface2)', transition: 'all 0.15s' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: marineService === s.id ? 'rgba(79,127,255,0.15)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Icon size={26} style={{ color: marineService === s.id ? 'var(--accent)' : 'var(--text2)' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: marineService === s.id ? 'var(--accent)' : 'var(--text1)', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' as const }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              )
            })}
          </div>

          {/* Boat type */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>What type of boat?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
            {BOAT_SUB_TYPES.map(b => (
              <div key={b.id} onClick={() => setBoatSubType(b.id)}
                style={{ padding: '14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  border: boatSubType === b.id ? '2px solid var(--cyan)' : '1px solid var(--border)',
                  background: boatSubType === b.id ? 'rgba(34,211,238,0.08)' : 'var(--surface2)', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: boatSubType === b.id ? 'var(--cyan)' : 'var(--text1)', marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStep(2)} disabled={!boatSubType}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10,
                background: boatSubType ? 'var(--accent)' : 'var(--surface2)',
                color: boatSubType ? '#fff' : 'var(--text3)', fontSize: 15, fontWeight: 700, border: 'none',
                cursor: boatSubType ? 'pointer' : 'not-allowed' }}>
              Next <ChevronRight size={16} />
            </button>
          </div>
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

      {/* ── STEP 2: Deck Layout / Measurements (decking or marine mode) ──────── */}
      {step === 2 && (outputType === 'decking' || outputType === 'marine') && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Boat details &amp; deck dimensions</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 26 }}>
            We&apos;ll use these dimensions to scale the mockup correctly.
          </p>

          {/* Deck style picker — only for decking or both */}
          {(outputType === 'decking' || (outputType === 'marine' && (marineService === 'decking' || marineService === 'both'))) && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Deck Style</h3>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Pick the look for your marine vinyl decking.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {DECK_STYLES.map(ds => (
                  <div key={ds.id} onClick={() => setDeckStyle(ds.id)}
                    style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      border: deckStyle === ds.id ? '2px solid var(--cyan)' : '1px solid var(--border)',
                      transition: 'all 0.15s' }}>
                    {/* Visual swatch */}
                    <div style={{ height: 64, background: ds.color, position: 'relative', overflow: 'hidden' }}>
                      {ds.id.startsWith('teak') && ds.id !== 'teak_herringbone' && (
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, ${ds.accent} 0px, ${ds.accent} 2px, transparent 2px, transparent 12px)`, opacity: 0.7 }} />
                      )}
                      {ds.id === 'teak_herringbone' && (
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(45deg, ${ds.accent} 0px, ${ds.accent} 2px, transparent 2px, transparent 12px)`, opacity: 0.7 }} />
                      )}
                      {ds.id === 'diamond_grip' && (
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(45deg, ${ds.accent} 0px, ${ds.accent} 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, ${ds.accent} 0px, ${ds.accent} 1px, transparent 1px, transparent 8px)`, opacity: 0.8 }} />
                      )}
                      {ds.id === 'carbon_fiber' && (
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(45deg, ${ds.accent} 0px, ${ds.accent} 2px, transparent 2px, transparent 6px), repeating-linear-gradient(-45deg, ${ds.accent} 0px, ${ds.accent} 2px, transparent 2px, transparent 6px)` }} />
                      )}
                      {deckStyle === ds.id && (
                        <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} style={{ color: '#000' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px', background: deckStyle === ds.id ? 'rgba(34,211,238,0.08)' : 'var(--surface2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: deckStyle === ds.id ? 'var(--cyan)' : 'var(--text1)', marginBottom: 2 }}>{ds.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.3 }}>{ds.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            {(outputType === 'decking' || (outputType === 'marine' && (marineService === 'decking' || marineService === 'both'))) && (
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
            )}
          </div>

          {/* Price estimate */}
          {(marineService === 'decking' || marineService === 'both' || outputType === 'decking') && deckSqft > 0 && (
            <div style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', marginBottom: 6 }}>Estimated Decking Cost</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                ${(deckSqft * 36).toLocaleString()} &ndash; ${(deckSqft * 44).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                Estimate based on marine vinyl decking, installed
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
      {step === 2 && outputType !== 'decking' && outputType !== 'signage' && outputType !== 'marine' && (
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
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${estimatedPrice.low.toLocaleString()} &ndash; ${estimatedPrice.high.toLocaleString()}
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

          {/* Vehicle Color Picker */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Vehicle Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['White', 'Black', 'Silver', 'Gray', 'Navy Blue', 'Red', 'Dark Green', 'Brown', 'Beige', 'Yellow'].map(c => (
                <button key={c} onClick={() => setVehicleColor(c)}
                  style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: vehicleColor === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: vehicleColor === c ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                    color: vehicleColor === c ? 'var(--accent)' : 'var(--text2)' }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Used to show exposed paint in partial wrap designs</div>
          </div>

          {/* Fleet Mode */}
          {vehicleSelected && (
            <div style={{ marginTop: 0, marginBottom: 22, padding: '14px 18px', borderRadius: 12, background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: fleetMode ? 14 : 0 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Fleet Mode</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Add up to 3 vehicles — see pricing per vehicle</div>
                </div>
                <button onClick={() => setFleetMode(f => !f)}
                  style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: fleetMode ? 'var(--accent)' : 'var(--surface2)',
                    border: '1px solid var(--border)', color: fleetMode ? '#fff' : 'var(--text2)' }}>
                  {fleetMode ? 'Fleet On' : 'Enable Fleet'}
                </button>
              </div>
              {fleetMode && (
                <div>
                  {fleetVehicles.map((fv, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', marginBottom: 8 }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                        {fv.color} {fv.year} {fv.make} {fv.model}
                      </div>
                      {fv.price && (
                        <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                          ${fv.price.low.toLocaleString()} – ${fv.price.high.toLocaleString()}
                        </div>
                      )}
                      <button onClick={() => setFleetVehicles(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {fleetVehicles.length < 2 && selectedMake && selectedModel && (
                    <button
                      onClick={() => {
                        if (!selectedMake || !selectedModel) return
                        setFleetVehicles(prev => [...prev, {
                          year: selectedYear, make: selectedMake, model: selectedModel,
                          bodyType: bodyType || 'van', sqft: estimatedSqft || 280,
                          price: estimatedPrice, color: vehicleColor,
                        }])
                      }}
                      style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px dashed var(--border)',
                        background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      + Add {[selectedYear, selectedMake, selectedModel].filter(Boolean).join(' ')} to fleet
                    </button>
                  )}
                  {fleetVehicles.length > 0 && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Fleet total estimate</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {(() => {
                          const all = [estimatedPrice, ...fleetVehicles.map(fv => fv.price)].filter(Boolean) as Array<{low:number;high:number;mid:number}>
                          const low = all.reduce((s, p) => s + p.low, 0)
                          const high = all.reduce((s, p) => s + p.high, 0)
                          return `$${low.toLocaleString()} – $${high.toLocaleString()}`
                        })()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{1 + fleetVehicles.length} vehicles, full wraps</div>
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
              onClick={() => { setSelectedMake('Custom'); setSelectedModel('Vehicle'); setEstimatedSqft(280); setEstimatedPrice({ mid: 3000, low: 2700, high: 3200 }); setStep(3) }}
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

      {/* ── STEP 3 (wrap/marine/decking) / STEP 2 (signage): Brand & Generate ─── */}
      {((outputType === 'wrap' && step === 3) || (outputType === 'marine' && step === 3) || (outputType === 'signage' && step === 2) || (outputType === 'decking' && step === 3)) && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>{isDeckingOnly ? 'Deck Style Confirmed' : 'Your brand info'}</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 22 }}>
            {isDeckingOnly ? 'Review your deck selection and add any notes for our team.' : 'Paste your website to auto-fill, or enter manually. We\'ll generate 3 concepts.'}
          </p>

          {/* Decking-only simplified form */}
          {isDeckingOnly && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ padding: '20px 24px', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 14, marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cyan)', marginBottom: 6 }}>Deck Vinyl — No Branding Needed</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
                  Marine decking is about aesthetics and functionality, not branding. We will render your selected <strong style={{ color: 'var(--text2)' }}>{DECK_STYLES.find(d => d.id === deckStyle)?.label}</strong> style on your {boatSubType.replace('_', ' ')} boat.
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Design Notes (optional)</label>
                <textarea value={designNotes} onChange={e => setDesignNotes(e.target.value)}
                  placeholder="e.g. Two-tone deck, white and teak accents on the bow only, black non-slip on swim platform..."
                  rows={3}
                  style={{ ...inp, resize: 'vertical' as const, fontFamily: 'inherit', minHeight: 80 }} />
              </div>
              {generating && (
                <div style={{ marginTop: 24, marginBottom: 20 }}>
                  <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--surface)', borderRadius: 24, padding: '40px 32px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--cyan)', display: 'block', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>Creating Deck Concepts</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>This typically takes 15-30 seconds</div>
                  </div>
                </div>
              )}
              {genError && (
                <div style={{ padding: '14px 18px', borderRadius: 10, marginTop: 20, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 14, color: 'var(--red)' }}>
                  {genError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
                <button onClick={() => setStep(2)} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.4 : 1 }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={handleGenerate} disabled={generating}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 10, background: generating ? 'rgba(34,211,238,0.4)' : 'linear-gradient(135deg, var(--cyan) 0%, #0891b2 100%)', color: generating ? 'var(--text3)' : '#000', fontSize: 16, fontWeight: 800, border: 'none', cursor: generating ? 'not-allowed' : 'pointer' }}>
                  {generating ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : <><Sparkles size={17} /> Generate Deck Concepts</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Website auto-fill (primary path) ── */}
          {!isDeckingOnly && (
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
          )}

          {!isDeckingOnly && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Sign-specific fields — shown only for signage mode */}
            {outputType === 'signage' && (
              <>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name *</label>
                  <input style={inp} placeholder="e.g. Pacific Northwest Plumbing" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Main Headline Text</label>
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
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Checkered background shows transparency */}
                      <div style={{
                        width: 120, height: 70, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                        backgroundImage: 'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)',
                        backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
                        backgroundColor: '#333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoNoBg || logoPreview}
                          alt="Logo"
                          style={{ maxHeight: 62, maxWidth: 112, objectFit: 'contain' }}
                        />
                      </div>
                      <div>
                        {processingLogo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)' }}>
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            Removing background &amp; extracting colors...
                          </div>
                        ) : logoNoBg && logoNoBg !== logoPreview ? (
                          <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={11} /> Background removed
                          </div>
                        ) : null}
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Click to change</div>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); setLogoNoBg(null); setScrapedLogoUrl(null) }}
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

            {/* Inspiration Gallery */}
            {exampleMockups.length > 0 && (
              <div style={{ gridColumn: 'span 2', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Inspiration — recent wrap concepts
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {exampleMockups.slice(0, 6).map(ex => ex.concept_a_url && (
                    <div key={ex.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ex.concept_a_url} alt="Example wrap" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '4px 6px' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {[ex.vehicle_make, ex.vehicle_model].filter(Boolean).join(' ') || 'Vehicle Wrap'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    const coverageLow = estimatedPrice ? Math.round(estimatedPrice.low * c.pct / 100) * 100 : null
                    const coverageHigh = estimatedPrice ? Math.round(estimatedPrice.high * c.pct / 100) * 100 : null
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
                        {coverageLow && coverageHigh && (
                          <div style={{ fontSize: 13, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--green)', marginTop: 4 }}>
                            ~${coverageLow.toLocaleString()} &ndash; ${coverageHigh.toLocaleString()}
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
          )}

          {/* Generation progress — Wrapmate-style loading */}
          {!isDeckingOnly && generating && (
            <div style={{ marginTop: 24, marginBottom: 20 }}>
              <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--surface)', borderRadius: 24, padding: '40px 32px', border: '1px solid var(--border)', textAlign: 'center' }}>
                {/* Circular progress */}
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface2)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent)" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - Math.min(pipelineStep + 1, PIPELINE_STEPS_GENERATE.length) / PIPELINE_STEPS_GENERATE.length)}`}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {Math.round(Math.min(pipelineStep + 1, PIPELINE_STEPS_GENERATE.length) / PIPELINE_STEPS_GENERATE.length * 100)}%
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>Creating Your Designs</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28 }}>Our AI is crafting unique concepts just for you</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Analyzing your vehicle', sub: 'Identifying high-visibility zones' },
                    { label: 'Processing brand assets', sub: 'Colors, logo, and typography' },
                    { label: 'Designing concepts', sub: 'Generating 6 unique styles' },
                  ].map((item, i) => {
                    const isDone = pipelineStep > i
                    const isActive = pipelineStep === i
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: isActive ? 'rgba(79,127,255,0.08)' : 'transparent', marginBottom: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isDone ? 'var(--accent)' : isActive ? 'rgba(79,127,255,0.2)' : 'var(--surface2)', border: `2px solid ${isDone || isActive ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isDone ? <Check size={13} style={{ color: '#fff' }} /> : isActive ? <Loader2 size={12} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} /> : <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{i + 1}</span>}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: isDone || isActive ? 700 : 400, color: isDone ? 'var(--green)' : isActive ? 'var(--text1)' : 'var(--text3)' }}>{item.label}</div>
                          {isActive && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.sub}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text3)' }}>This typically takes 15-30 seconds</div>
              </div>
            </div>
          )}

          {!isDeckingOnly && genError && (
            <div style={{ padding: '14px 18px', borderRadius: 10, marginTop: 20, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 14, color: 'var(--red)' }}>
              {genError}
            </div>
          )}

          {!isDeckingOnly && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(outputType === 'signage' ? 1 : 2)} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.4 : 1 }}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!companyName.trim() || generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 36px', borderRadius: 10,
                background: (!companyName.trim() || generating) ? 'rgba(79,127,255,0.5)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 16, fontWeight: 800, border: 'none',
                cursor: (!companyName.trim() || generating) ? 'not-allowed' : 'pointer',
                boxShadow: (outputType === 'signage' ? (!signHeadline.trim() || generating) : (!companyName.trim() || generating)) ? 'none' : '0 4px 20px rgba(79,127,255,0.4)',
              }}
            >
              {generating
                ? <><Loader2 size={18} className="animate-spin" /> Creating Concepts...</>
                : <><Sparkles size={18} /> Generate My {outputType === 'signage' ? 'Sign' : outputType === 'decking' ? 'Decking' : outputType === 'marine' ? (marineService === 'wrap' ? 'Wrap' : 'Marine') : 'Wrap'} Concepts</>
              }
            </button>
          </div>
          )}
        </div>
      )}

      {/* ── STEP 4 (wrap/marine/decking) / STEP 3 (signage): Concept Picker ──── */}
      {((outputType === 'wrap' && step === 4) || (outputType === 'marine' && step === 4) || (outputType === 'signage' && step === 3) || (outputType === 'decking' && step === 4)) && (
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Choose Your Design Direction</h2>
          <p style={{ fontSize: 15, color: 'var(--text3)', marginBottom: 16 }}>
            {Object.values(concepts).filter(Boolean).length} concepts generated. Pick the direction you like and tell us what to keep or change.
          </p>

          {/* Save to portal notice */}
          {mockupId && !isLoggedIn && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Save these designs to your portal</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sign in to save, share with your team, and access from anywhere</div>
              </div>
              <button onClick={() => setShowExitGate(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#0d1a10', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Go to Portal
              </button>
            </div>
          )}

          {/* Ballpark pricing summary */}
          {estimatedPrice && (outputType === 'wrap') && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Price Comparison — {selectedYear} {selectedMake} {selectedModel}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {COVERAGE_OPTIONS.filter(c => coverages.includes(c.id)).map(c => {
                  const priceLow = Math.round(estimatedPrice.low * c.pct / 100) * 100
                  const priceHigh = Math.round(estimatedPrice.high * c.pct / 100) * 100
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
                      <div style={{ fontSize: 18, fontWeight: 900, color: isPrimary ? 'var(--accent)' : 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>${priceLow.toLocaleString()} &ndash; ${priceHigh.toLocaleString()}</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start', marginBottom: 28 }}>
              {/* Left: How it works */}
              <div style={{ background: 'linear-gradient(135deg, #0f2040 0%, #1a1060 100%)', borderRadius: 16, padding: '28px 24px', color: '#fff', position: 'sticky', top: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>HOW IT WORKS</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, fontFamily: 'Barlow Condensed, sans-serif' }}>From concept to wrap</div>
                {[
                  { step: 1, label: 'Explore concepts', desc: 'AI-generated starting points — pick your favorite direction', active: true },
                  { step: 2, label: 'Lock in your design', desc: 'Our team refines it into a production-ready wrap', active: false },
                  { step: 3, label: 'We handle the rest', desc: 'Printed on premium vinyl, professionally installed', active: false },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: 16, opacity: s.active ? 1 : 0.6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.active ? 'var(--accent)' : 'rgba(255,255,255,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                      {s.active ? <span style={{ color: '#fff' }}>&#9733;</span> : s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{s.label}</div>
                      {s.active && <span style={{ fontSize: 11, color: '#22c07a', fontWeight: 700 }}>YOU ARE HERE</span>}
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginTop: 2 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
                {estimatedPrice && (
                  <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Estimated project cost</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${estimatedPrice.low.toLocaleString()} &ndash; ${estimatedPrice.high.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{selectedYear} {selectedMake} {selectedModel} &middot; {coverages[0]} wrap</div>
                  </div>
                )}
              </div>

              {/* Right: Scrollable concepts */}
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>Your Design Concepts</div>
                <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>Pick your favorite — our team will refine it to perfection.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {([
                    { id: 'a', url: concepts.a, label: 'Bold & Aggressive' },
                    { id: 'b', url: concepts.b, label: 'Clean & Professional' },
                    { id: 'c', url: concepts.c, label: 'Dynamic Gradient' },
                    { id: 'd', url: concepts.d, label: 'Sleek Minimal' },
                    { id: 'e', url: concepts.e, label: 'Vibrant Full-Color' },
                    { id: 'f', url: concepts.f, label: 'Classic Traditional' },
                  ]).filter(concept => concept.url).map(concept => (
                    <div key={concept.id} style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', border: selectedConcept === concept.id ? '2px solid var(--accent)' : '1px solid var(--border)', transition: 'border-color 0.15s' }}>
                      {/* Image */}
                      {/* Sign-shaped image display */}
                      {(() => {
                        const signInfo = outputType === 'signage' ? SIGN_TYPES.find(s => s.id === signType) : null
                        const signAspect = signInfo ? `${signInfo.w}/${signInfo.h}` : undefined
                        const isPortrait = signInfo && signInfo.h > signInfo.w
                        const isWide = signInfo && signInfo.w > signInfo.h * 1.5
                        return (
                          <div style={{ position: 'relative', cursor: 'zoom-in', background: signInfo ? '#f0f0f0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: signInfo ? '16px' : 0 }}
                            onClick={() => setExpandedImage(concept.url)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={concept.url!} alt={concept.label} style={{
                              display: 'block',
                              ...(signInfo
                                ? { width: isPortrait ? 'auto' : '100%', height: isPortrait ? 280 : 'auto', maxWidth: isWide ? '100%' : '60%', maxHeight: 320, objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }
                                : { width: '100%', maxHeight: 320, objectFit: 'cover' }
                              )
                            }} />
                            {/* Dimensions badge for signage */}
                            {signInfo && (
                              <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#fff', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                                {signInfo.w}" × {signInfo.h}"
                              </div>
                            )}
                            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#fff', fontWeight: 700 }}>Concept {concept.id.toUpperCase()}</div>
                            {(logoNoBg || logoPreview) && (
                              <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: 4 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logoNoBg || logoPreview || ''} alt="logo" style={{ height: 36, maxWidth: 90, objectFit: 'contain', display: 'block' }} />
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* Footer */}
                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: selectedConcept === concept.id ? 'var(--accent)' : 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{concept.label}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setConceptVotes(prev => ({ ...prev, [concept.id]: prev[concept.id] === 'up' ? null : 'up' }))}
                              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${conceptVotes[concept.id] === 'up' ? 'var(--green)' : 'var(--border)'}`, background: conceptVotes[concept.id] === 'up' ? 'rgba(34,192,122,0.1)' : 'transparent', color: conceptVotes[concept.id] === 'up' ? 'var(--green)' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <ThumbsUp size={12} />
                            </button>
                            <button onClick={() => setConceptVotes(prev => ({ ...prev, [concept.id]: prev[concept.id] === 'down' ? null : 'down' }))}
                              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${conceptVotes[concept.id] === 'down' ? 'var(--red)' : 'var(--border)'}`, background: conceptVotes[concept.id] === 'down' ? 'rgba(242,90,90,0.1)' : 'transparent', color: conceptVotes[concept.id] === 'down' ? 'var(--red)' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <ThumbsDown size={12} />
                            </button>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedConcept(concept.id); setShowFeedbackFor(concept.id) }}
                          style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: selectedConcept === concept.id ? 'var(--accent)' : 'var(--surface2)', color: selectedConcept === concept.id ? '#fff' : 'var(--text2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                          {selectedConcept === concept.id ? '✓ Selected' : 'Use This Concept'}
                        </button>
                        {/* Tweak textarea — only show for selected concept */}
                        {showFeedbackFor === concept.id && (
                          <div style={{ marginTop: 12 }}>
                            <textarea value={conceptFeedback} onChange={e => setConceptFeedback(e.target.value)}
                              placeholder="Tweak your design — describe what you'd like changed..."
                              rows={2}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                          </div>
                        )}
                        {/* Signage: "Proceed with this design" flow */}
                        {outputType === 'signage' && selectedConcept === concept.id && (
                          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(34,192,122,0.07)', border: '1px solid rgba(34,192,122,0.2)' }}>
                            <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 4 }}>Ready to print?</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4, marginBottom: 8 }}>
                              Our in-house design team will convert this to print-ready files and send you a final approval mockup before we begin production.
                            </div>
                            <button onClick={() => { setRevisionNotes(conceptFeedback); setRevisionCallback(() => () => { handleFinalize(concept.id) }); setShowRevisionModal(true) }}
                              style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#0d1a10', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <Check size={14} /> Proceed with This Design
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)', display: 'block', margin: '0 auto 14px' }} />
              <div style={{ fontSize: 15, color: 'var(--text3)' }}>Loading concepts...</div>
            </div>
          )}

          {/* Feedback hint */}
          {showFeedbackFor && (
            <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                Concept {showFeedbackFor.toUpperCase()} selected. Add any tweak notes in the card above, then click &ldquo;Continue with Selected&rdquo;.
              </div>
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
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 15, fontWeight: 600, cursor: (finalizing) ? 'not-allowed' : 'pointer', opacity: finalizing ? 0.4 : 1 }}>
                <ChevronLeft size={16} /> Back
              </button>
                <button onClick={() => {
                if (hasRegenerated) return
                setRevisionNotes('')
                setRevisionCallback(() => () => {
                  setStep(outputType === 'signage' ? 2 : 3)
                  setTimeout(() => handleGenerate(), 50)
                  setHasRegenerated(true)
                })
                setShowRevisionModal(true)
              }} disabled={finalizing || hasRegenerated}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: hasRegenerated ? 'var(--text3)' : 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: (finalizing || hasRegenerated) ? 'not-allowed' : 'pointer', opacity: finalizing ? 0.4 : 1 }}>
                {hasRegenerated ? 'Regen used' : <><RefreshCw size={13} /> Regenerate All</>}
              </button>

            </div>
            <button
              onClick={() => {
                setRevisionNotes(conceptFeedback)
                setRevisionCallback(() => () => {
                  handleFinalize(selectedConcept)
                })
                setShowRevisionModal(true)
              }}
              disabled={finalizing || !Object.values(concepts).some(Boolean)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 10, background: finalizing || !Object.values(concepts).some(Boolean) ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)', color: finalizing || !Object.values(concepts).some(Boolean) ? 'var(--text3)' : '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: finalizing || !Object.values(concepts).some(Boolean) ? 'not-allowed' : 'pointer', boxShadow: !finalizing && Object.values(concepts).some(Boolean) ? '0 4px 20px rgba(79,127,255,0.4)' : 'none' }}
            >
              {finalizing ? <><Loader2 size={17} className="animate-spin" /> Finalizing...</> : <><Sparkles size={17} /> Continue with Selected</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5 (wrap/marine/decking) / STEP 4 (signage): Result ─────────── */}
      {((outputType === 'wrap' && step === 5) || (outputType === 'marine' && step === 5) || (outputType === 'signage' && step === 4) || (outputType === 'decking' && step === 5)) && (
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
                  <button onClick={() => setShowEditor(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--purple)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    <Pencil size={13} /> Edit / Add Text
                  </button>
                )}
                <button onClick={reset}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Start New Project
                </button>
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
                  {mockupStatus?.flat_design_url && (
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
                            src={mockupStatus.flat_design_url}
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
                      Start New Project
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
                      Start New Project
                    </button>
                  </div>
                )}
              </div>

              {/* Fleet vehicle adder */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginTop: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Add more vehicles to your project</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>We will reach out to discuss year, make, model for each additional vehicle.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setFleetVehicles(prev => prev.length > 0 ? prev.slice(0, -1) : prev)}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>&#8722;</button>
                    <span style={{ fontSize: 20, fontWeight: 800, minWidth: 30, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>{1 + fleetVehicles.length}</span>
                    <button onClick={() => { if (fleetVehicles.length < 9) setFleetVehicles(prev => [...prev, { year: '', make: '', model: '', bodyType: bodyType || 'van', sqft: estimatedSqft || 280, price: estimatedPrice, color: vehicleColor }]) }}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>{1 + fleetVehicles.length} vehicle{(1 + fleetVehicles.length) !== 1 ? 's' : ''} &middot; ${((1 + fleetVehicles.length) * 250).toLocaleString()} design deposit</div>
                </div>
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
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {estimatedPrice ? `$${estimatedPrice.low.toLocaleString()} – $${estimatedPrice.high.toLocaleString()}` : 'TBD'}
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

      {/* ── Revision Modal (Change 4d) ─────────────────────────────────────────── */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(13,15,20,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 28px', maxWidth: 480, width: '100%' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 8 }}>Any revisions before we continue?</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>Tell us what to change — colors, text placement, style tweaks. Or leave blank to proceed as-is.</div>
            <textarea
              value={revisionNotes}
              onChange={e => setRevisionNotes(e.target.value)}
              placeholder="e.g. Make the logo larger, use more of the blue, add our phone number prominently on the rear..."
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowRevisionModal(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => {
                if (revisionNotes.trim()) setConceptFeedback(revisionNotes)
                setShowRevisionModal(false)
                revisionCallback?.()
              }}
                style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Sparkles size={16} /> {revisionNotes.trim() ? 'Apply Revisions & Continue' : 'Continue As-Is'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exit Gate / Signup Pitch Modal (Change 5d) ────────────────────────── */}
      {showExitGate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(13,15,20,0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '40px 32px', maxWidth: 520, width: '100%' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', color: 'var(--text1)', marginBottom: 8 }}>
                Don&apos;t lose your designs
              </div>
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>
                Create a free account to save your mockups, get a quote, and manage your fleet — all in one place.
              </div>
            </div>
            {/* App pitches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '🌲', title: 'PNW Portal', desc: 'Track your wrap projects, approve proofs, pay invoices, and message your crew — all from your phone.' },
                { icon: '🚛', title: 'Fleet Management App', desc: 'Schedule wraps across your entire fleet, track maintenance, manage branding assets, and get fleet pricing.' },
                { icon: '🎨', title: 'Design Studio', desc: 'Unlimited AI mockup generations, saved design history, and direct access to our design team.' },
              ].map((app, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{app.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{app.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{app.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* CTA */}
            <a href="/portal/login?next=/portal"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '15px 0', borderRadius: 12, background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)', color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em', boxSizing: 'border-box', marginBottom: 10 }}>
              <Sparkles size={18} /> Create Free Account &amp; Save My Designs
            </a>
            <button onClick={() => setShowExitGate(false)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
              Not now — continue browsing
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
