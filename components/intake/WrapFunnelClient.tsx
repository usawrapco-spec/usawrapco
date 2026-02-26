'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Check, Sparkles, ArrowRight, Upload, X, RefreshCw, Lock, Phone, Mail, User, Building2, Globe, Instagram, Car, Loader2, AlertCircle, Calendar, Clock, Star, Flame, Users } from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const POPULAR_MAKES = [
  'Toyota','Honda','Ford','Chevrolet','GMC','RAM','Dodge','Jeep','Subaru',
  'Hyundai','Kia','Nissan','BMW','Mercedes-Benz','Audi','Tesla','Volkswagen',
  'Mazda','Lexus','Acura','Cadillac','Buick','Lincoln','Volvo','Porsche',
  'Land Rover','INFINITI','Chrysler','Mitsubishi','Rivian','Genesis','Mini',
  'Alfa Romeo','Fiat','Isuzu','Sprinter',
]

const COVERAGE_OPTIONS = [
  { id: 'decal', label: 'Decal', desc: 'Doors & panels', pct: '10–20%', icon: '▪' },
  { id: 'quarter', label: 'Quarter Wrap', desc: 'Rear section', pct: '25–35%', icon: '◧' },
  { id: 'half', label: 'Half Wrap', desc: 'Rear half', pct: '40–60%', icon: '◑' },
  { id: 'full', label: 'Full Wrap', desc: 'Entire vehicle', pct: '100%', icon: '●' },
]

const STYLE_OPTIONS = [
  { id: 'clean', label: 'Clean & Professional', desc: 'Minimal lines, brand focused' },
  { id: 'bold', label: 'Bold & Eye-catching', desc: 'High contrast, high impact' },
  { id: 'minimal', label: 'Minimal', desc: 'Simple, elegant, understated' },
  { id: 'custom', label: 'Custom Direction', desc: "I'll describe it myself" },
]

const VEHICLE_SQFT: Record<string, Record<string, number>> = {
  sedan:     { decal: 20, quarter: 60,  half: 120, full: 200 },
  suv:       { decal: 25, quarter: 80,  half: 160, full: 250 },
  truck:     { decal: 25, quarter: 85,  half: 170, full: 260 },
  van:       { decal: 30, quarter: 110, half: 220, full: 320 },
  box_truck: { decal: 40, quarter: 150, half: 300, full: 450 },
}

const PROGRESS_MESSAGES = [
  'Analyzing your brand colors...',
  'Mapping your vehicle template...',
  'Selecting design elements...',
  'Designing your wrap...',
  'Applying brand identity...',
  'Adding finishing touches...',
  'Almost ready...',
]

const YEARS = Array.from({ length: 30 }, (_, i) => String(2026 - i))

const TESTIMONIALS = [
  {
    quote: "The AI mockup sold my client instantly. Had a signed contract before they even left the meeting.",
    name: "Mark T.",
    role: "Fleet Manager, ProPlumb",
    vehicle: "2023 Ford Transit",
  },
  {
    quote: "We went from 'just thinking about it' to a full wrap order in 20 minutes. Incredible tool.",
    name: "Sarah K.",
    role: "Owner, K9 Dog Training",
    vehicle: "2022 Ram ProMaster",
  },
  {
    quote: "The mockup matched our brand colors perfectly. Customers recognize us instantly on the road now.",
    name: "Dave R.",
    role: "Owner, Riverside HVAC",
    vehicle: "2024 GMC Sierra",
  },
]

const SLOT_TIMES = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVehicleType(make: string, model: string): string {
  const s = `${make} ${model}`.toLowerCase()
  if (/transit|sprinter|promaster|express|savana|econoline|nv\s*cargo/.test(s)) return 'van'
  if (/box\s*truck|npr|w4500|low cab/.test(s)) return 'box_truck'
  if (/f-?150|f-?250|f-?350|silverado|sierra|ram 15|tundra|tacoma|ranger|colorado|frontier|ridgeline|titan/.test(s)) return 'truck'
  if (/explorer|expedition|suburban|tahoe|yukon|navigator|sequoia|pilot|4runner|highlander|rav4|cr-?v|escape|edge|bronco|blazer|traverse|enclave|acadia|cx-5|cx-9|outback|forester|rogue|pathfinder|murano|armada|qx|gx|lx|mdx|rdx|wrangler|cherokee|equinox|terrain|trailblazer|trax|encore|envision/.test(s)) return 'suv'
  return 'sedan'
}

function estimatePrice(make: string, model: string, coverage: string): { low: number; high: number } | null {
  if (!make || !model || !coverage) return null
  const type = getVehicleType(make, model)
  const sqft = VEHICLE_SQFT[type]?.[coverage] ?? VEHICLE_SQFT.sedan[coverage]
  if (!sqft) return null
  return {
    low: Math.round(sqft * 10 / 100) * 100,
    high: Math.round(sqft * 14 / 100) * 100,
  }
}

function getSessionToken(): string {
  if (typeof window === 'undefined') return ''
  let token = localStorage.getItem('wf_session_token')
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '')
    localStorage.setItem('wf_session_token', token)
  }
  return token
}

function getUpcomingWeekdays(count: number): Date[] {
  const days: Date[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (days.length < count) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function formatSlotKey(d: Date, time: string): string {
  return `${d.toISOString().split('T')[0]}|${time}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelState {
  step: 1 | 2 | 3 | 4 | 5
  // Step 1
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vehicleModels: string[]
  loadingModels: boolean
  wrapCoverage: string
  estimatedPrice: { low: number; high: number } | null
  // Step 2
  websiteUrl: string
  scraping: boolean
  scraped: boolean
  scrapedLogo: string
  scrapedCompany: string
  brandColors: string[]
  uploadedLogo: string
  stylePreference: string
  instagramHandle: string
  businessDescription: string
  colorError: string
  // Step 3
  generating: boolean
  progressIdx: number
  predictionIds: string[]
  polling: boolean
  mockupUrls: string[]
  genError: string
  // Step 4
  contactName: string
  contactEmail: string
  contactPhone: string
  businessName: string
  submitting: boolean
  submitError: string
  // Step 5
  projectId: string
  customerId: string
  selectedSlot: string
  bookingLoading: boolean
  bookingConfirmed: boolean
  bookingError: string
  // Social proof
  testimonialIdx: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WrapFunnelClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionToken = useRef('')
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [s, setS] = useState<FunnelState>({
    step: 1,
    vehicleYear: '', vehicleMake: '', vehicleModel: '',
    vehicleModels: [], loadingModels: false,
    wrapCoverage: '', estimatedPrice: null,
    websiteUrl: '', scraping: false, scraped: false,
    scrapedLogo: '', scrapedCompany: '', brandColors: [],
    uploadedLogo: '', stylePreference: '', instagramHandle: '',
    businessDescription: '', colorError: '',
    generating: false, progressIdx: 0, predictionIds: [],
    polling: false, mockupUrls: [], genError: '',
    contactName: '', contactEmail: '', contactPhone: '',
    businessName: '', submitting: false, submitError: '',
    projectId: '', customerId: '',
    selectedSlot: '', bookingLoading: false, bookingConfirmed: false, bookingError: '',
    testimonialIdx: 0,
  })

  const upd = useCallback((patch: Partial<FunnelState>) => setS(prev => ({ ...prev, ...patch })), [])

  // ── Init: session token + UTM capture ──
  useEffect(() => {
    sessionToken.current = getSessionToken()

    const utm_source = searchParams.get('utm_source') || searchParams.get('source') || ''
    const utm_medium = searchParams.get('utm_medium') || ''
    const utm_campaign = searchParams.get('utm_campaign') || ''
    const ref_code = searchParams.get('ref') || ''

    if (utm_source || utm_medium || utm_campaign || ref_code) {
      fetch('/api/wrap-funnel/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken.current,
          utm_source,
          utm_medium,
          utm_campaign,
          ref_code,
        }),
      }).catch(() => {})
    }

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [searchParams])

  // ── Testimonial auto-rotate ──
  useEffect(() => {
    const t = setInterval(() => {
      setS(prev => ({ ...prev, testimonialIdx: (prev.testimonialIdx + 1) % TESTIMONIALS.length }))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // ── Save to DB on step change ──
  const save = useCallback(async (patch: Record<string, any>) => {
    if (!sessionToken.current) return
    await fetch('/api/wrap-funnel/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: sessionToken.current, ...patch }),
    })
  }, [])

  // ── Load models from NHTSA ──
  useEffect(() => {
    const { vehicleYear, vehicleMake } = s
    if (!vehicleYear || !vehicleMake) { upd({ vehicleModels: [], vehicleModel: '' }); return }
    upd({ loadingModels: true, vehicleModel: '' })
    const makeFmt = encodeURIComponent(vehicleMake.replace(/-/g, ' '))
    fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${makeFmt}/modelyear/${vehicleYear}?format=json`)
      .then(r => r.json())
      .then(data => {
        const models: string[] = [...new Set<string>((data.Results || []).map((r: any) => r.Model_Name as string))]
          .filter(Boolean)
          .sort()
        upd({ vehicleModels: models, loadingModels: false })
      })
      .catch(() => upd({ vehicleModels: [], loadingModels: false }))
  }, [s.vehicleYear, s.vehicleMake])

  // ── Update price estimate when vehicle or coverage changes ──
  useEffect(() => {
    const price = estimatePrice(s.vehicleMake, s.vehicleModel, s.wrapCoverage)
    upd({ estimatedPrice: price })
  }, [s.vehicleMake, s.vehicleModel, s.wrapCoverage])

  // ── Scrape logo + colors ──
  const scrapeWebsite = useCallback(async () => {
    const url = s.websiteUrl.trim()
    if (!url) return
    upd({ scraping: true, scraped: false, colorError: '' })
    try {
      const res = await fetch('/api/wrap-funnel/scrape-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.ok) {
        upd({
          scrapedLogo: data.logoUrl || '',
          scrapedCompany: data.companyName || '',
          brandColors: data.brandColors?.slice(0, 3) || [],
          scraped: true,
          scraping: false,
          businessName: s.businessName || data.companyName || '',
        })
      } else {
        upd({ scraping: false, colorError: data.error || 'Could not scrape website' })
      }
    } catch {
      upd({ scraping: false, colorError: 'Network error — check the URL and try again' })
    }
  }, [s.websiteUrl, s.businessName])

  // ── Generate mockups ──
  const generateMockups = useCallback(async () => {
    upd({ generating: true, genError: '', progressIdx: 0, mockupUrls: [] })

    progressTimer.current = setInterval(() => {
      setS(prev => ({ ...prev, progressIdx: Math.min(prev.progressIdx + 1, PROGRESS_MESSAGES.length - 1) }))
    }, 2000)

    await save({
      vehicle_year: s.vehicleYear,
      vehicle_make: s.vehicleMake,
      vehicle_model: s.vehicleModel,
      vehicle_trim: '',
      wrap_coverage: s.wrapCoverage,
      estimated_price_low: s.estimatedPrice?.low,
      estimated_price_high: s.estimatedPrice?.high,
      website_url: s.websiteUrl,
      logo_url: s.scrapedLogo || s.uploadedLogo,
      brand_colors: s.brandColors,
      style_preference: s.stylePreference,
      instagram_handle: s.instagramHandle,
      business_description: s.businessDescription,
      step_reached: 3,
    })

    try {
      const res = await fetch('/api/wrap-funnel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken.current,
          vehicle_year: s.vehicleYear,
          vehicle_make: s.vehicleMake,
          vehicle_model: s.vehicleModel,
          wrap_coverage: s.wrapCoverage,
          brand_colors: s.brandColors,
          style_preference: s.stylePreference,
          business_description: s.businessDescription,
          logo_url: s.scrapedLogo || s.uploadedLogo,
        }),
      })
      const data = await res.json()

      if (progressTimer.current) clearInterval(progressTimer.current)

      if (!data.ok) {
        upd({ generating: false, genError: data.error || 'Generation failed' })
        return
      }

      const immediateUrls = (data.predictions || [])
        .filter((p: any) => p.status === 'succeeded' && p.output?.[0])
        .map((p: any) => Array.isArray(p.output) ? p.output[0] : p.output)

      if (immediateUrls.length >= 2) {
        upd({ generating: false, mockupUrls: immediateUrls, step: 4 })
        await save({ mockup_urls: immediateUrls, step_reached: 4 })
        return
      }

      const ids = (data.predictions || []).map((p: any) => p.id).filter(Boolean)
      upd({ predictionIds: ids, polling: true, generating: false })

      let attempts = 0
      pollTimer.current = setInterval(async () => {
        attempts++
        if (attempts > 40) {
          clearInterval(pollTimer.current!)
          upd({ polling: false, genError: 'Generation timed out — please try again' })
          return
        }
        try {
          const pollRes = await fetch(`/api/wrap-funnel/poll?ids=${ids.join(',')}&session_token=${sessionToken.current}`)
          const pollData = await pollRes.json()
          if (pollData.allDone) {
            clearInterval(pollTimer.current!)
            const urls = pollData.completedUrls || []
            upd({ polling: false, mockupUrls: urls, step: urls.length > 0 ? 4 : 3, genError: urls.length === 0 ? 'No mockups generated' : '' })
            if (urls.length > 0) await save({ mockup_urls: urls, step_reached: 4 })
          }
        } catch { /* keep polling */ }
      }, 4000)
    } catch (err: any) {
      if (progressTimer.current) clearInterval(progressTimer.current)
      upd({ generating: false, genError: err.message || 'Failed to generate' })
    }
  }, [s, save])

  // ── Submit lead ──
  const submitLead = useCallback(async () => {
    if (!s.contactName.trim() || !s.contactEmail.trim()) {
      upd({ submitError: 'Name and email are required' }); return
    }
    upd({ submitting: true, submitError: '' })

    await save({
      contact_name: s.contactName,
      contact_email: s.contactEmail,
      contact_phone: s.contactPhone,
      business_name: s.businessName,
      step_reached: 4,
    })

    try {
      const res = await fetch('/api/wrap-funnel/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken.current }),
      })
      const data = await res.json()
      if (data.ok) {
        upd({ submitting: false, step: 5, projectId: data.project_id || '', customerId: data.customer_id || '' })
      } else {
        upd({ submitting: false, submitError: data.error || 'Something went wrong' })
      }
    } catch {
      upd({ submitting: false, submitError: 'Network error — please try again' })
    }
  }, [s, save])

  // ── Book appointment ──
  const bookAppointment = useCallback(async () => {
    if (!s.selectedSlot) return
    upd({ bookingLoading: true, bookingError: '' })
    try {
      const res = await fetch('/api/wrap-funnel/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken.current,
          slot: s.selectedSlot,
          contact_name: s.contactName,
          contact_email: s.contactEmail,
          vehicle: `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel}`,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        upd({ bookingLoading: false, bookingConfirmed: true })
      } else {
        upd({ bookingLoading: false, bookingError: data.error || 'Booking failed' })
      }
    } catch {
      upd({ bookingLoading: false, bookingError: 'Network error — please try again' })
    }
  }, [s])

  // ─── Render helpers ───────────────────────────────────────────────────────

  const stepLabel = (n: number) => ['Vehicle', 'Brand', 'Generating', 'Unlock', 'Done'][n - 1]

  // ─── Styles ───────────────────────────────────────────────────────────────

  const st = {
    page: {
      minHeight: '100vh',
      background: '#0a0c12',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: '0 16px 60px',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e8eaed',
    },
    header: {
      width: '100%',
      maxWidth: 720,
      padding: '28px 0 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logo: { fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' },
    logoAccent: { color: '#4f7fff' },
    stepBar: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
    },
    stepDot: (active: boolean, done: boolean) => ({
      width: 8, height: 8, borderRadius: '50%',
      background: done ? '#22c07a' : active ? '#4f7fff' : '#2a2d3a',
      transition: 'background 0.3s',
    }),
    card: {
      width: '100%',
      maxWidth: 720,
      marginTop: 32,
      background: '#13151c',
      borderRadius: 20,
      border: '1px solid #1e2230',
      padding: '40px 36px',
    },
    h1: {
      fontSize: 32,
      fontWeight: 800,
      letterSpacing: '-0.5px',
      margin: '0 0 8px',
      lineHeight: 1.2,
      fontFamily: "'Barlow Condensed', 'Inter', sans-serif",
    },
    h2: { fontSize: 22, fontWeight: 700, margin: '0 0 6px' },
    subtitle: { color: '#9299b5', fontSize: 15, margin: '0 0 32px' },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#9299b5', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
    select: {
      width: '100%',
      background: '#1a1d27',
      border: '1px solid #2a2d3a',
      borderRadius: 10,
      padding: '12px 14px',
      color: '#e8eaed',
      fontSize: 15,
      outline: 'none',
      cursor: 'pointer',
      appearance: 'none' as const,
      WebkitAppearance: 'none' as const,
    },
    input: {
      width: '100%',
      background: '#1a1d27',
      border: '1px solid #2a2d3a',
      borderRadius: 10,
      padding: '12px 14px',
      color: '#e8eaed',
      fontSize: 15,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
    fieldWrap: { marginBottom: 20, position: 'relative' as const },
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: '#4f7fff',
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      padding: '14px 28px',
      fontSize: 16,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s',
      width: '100%',
      justifyContent: 'center',
    },
    btnGreen: { background: '#22c07a' },
    btnOutline: {
      background: 'transparent',
      border: '1px solid #2a2d3a',
      color: '#e8eaed',
    },
    priceTag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: 'linear-gradient(135deg, #1a2a4a, #1a1d27)',
      border: '1px solid #4f7fff40',
      borderRadius: 12,
      padding: '12px 20px',
      marginTop: 24,
      fontSize: 15,
    },
    error: { color: '#f25a5a', fontSize: 14, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 },
    colorSwatch: (hex: string) => ({
      width: 40,
      height: 40,
      borderRadius: 8,
      background: hex,
      border: '2px solid #2a2d3a',
      cursor: 'pointer',
    }),
  }

  // ─── STEP 1: Vehicle ──────────────────────────────────────────────────────
  const renderStep1 = () => {
    const t = TESTIMONIALS[s.testimonialIdx]
    return (
      <div>
        <h1 style={st.h1}>
          Get Your Free<br />
          <span style={{ color: '#4f7fff' }}>Instant Wrap Mockup</span>
        </h1>
        <p style={st.subtitle}>No email required yet — just pick your vehicle and coverage</p>

        {/* Social proof counter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#1a1d27', border: '1px solid #22c07a30',
          borderRadius: 10, padding: '10px 16px', marginBottom: 24,
        }}>
          <Flame size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#e8eaed' }}>
            <strong style={{ color: '#22c07a' }}>247 business owners</strong> got their free mockup this month
          </span>
          <Users size={14} style={{ color: '#9299b5', marginLeft: 'auto', flexShrink: 0 }} />
        </div>

        <div style={st.fieldWrap}>
          <label style={st.label}>Vehicle Year</label>
          <div style={{ position: 'relative' }}>
            <select
              style={st.select}
              value={s.vehicleYear}
              onChange={e => upd({ vehicleYear: e.target.value })}
            >
              <option value="">Select year...</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9299b5' }} size={16} />
          </div>
        </div>

        <div style={st.row}>
          <div style={st.fieldWrap}>
            <label style={st.label}>Make</label>
            <div style={{ position: 'relative' }}>
              <select
                style={st.select}
                value={s.vehicleMake}
                onChange={e => upd({ vehicleMake: e.target.value })}
              >
                <option value="">Select make...</option>
                {POPULAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9299b5' }} size={16} />
            </div>
          </div>

          <div style={st.fieldWrap}>
            <label style={st.label}>Model</label>
            <div style={{ position: 'relative' }}>
              {s.loadingModels ? (
                <div style={{ ...st.select, display: 'flex', alignItems: 'center', gap: 8, color: '#9299b5' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading models...
                </div>
              ) : (
                <>
                  <select
                    style={{ ...st.select, color: s.vehicleModel ? '#e8eaed' : '#9299b5' }}
                    value={s.vehicleModel}
                    onChange={e => upd({ vehicleModel: e.target.value })}
                    disabled={!s.vehicleMake}
                  >
                    <option value="">{s.vehicleMake ? 'Select model...' : 'Select make first'}</option>
                    {s.vehicleModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9299b5' }} size={16} />
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={st.label}>Wrap Coverage</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {COVERAGE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => upd({ wrapCoverage: opt.id })}
                style={{
                  background: s.wrapCoverage === opt.id ? '#1a2a4a' : '#1a1d27',
                  border: s.wrapCoverage === opt.id ? '2px solid #4f7fff' : '2px solid #2a2d3a',
                  borderRadius: 12,
                  padding: '14px 10px',
                  cursor: 'pointer',
                  textAlign: 'center' as const,
                  color: '#e8eaed',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: s.wrapCoverage === opt.id ? '#4f7fff' : '#9299b5' }}>{opt.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#9299b5', marginTop: 2 }}>{opt.desc}</div>
                <div style={{ fontSize: 11, color: '#4f7fff', marginTop: 4 }}>{opt.pct}</div>
              </button>
            ))}
          </div>
        </div>

        {s.estimatedPrice && (
          <div style={st.priceTag}>
            <Sparkles size={16} style={{ color: '#4f7fff' }} />
            <span style={{ color: '#9299b5' }}>Estimated price:</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
              ${s.estimatedPrice.low.toLocaleString()} – ${s.estimatedPrice.high.toLocaleString()}
            </span>
            <span style={{ color: '#9299b5', fontSize: 13 }}>installed</span>
          </div>
        )}

        <button
          style={{
            ...st.btn,
            marginTop: 32,
            opacity: (s.vehicleYear && s.vehicleMake && s.vehicleModel && s.wrapCoverage) ? 1 : 0.4,
          }}
          disabled={!(s.vehicleYear && s.vehicleMake && s.vehicleModel && s.wrapCoverage)}
          onClick={() => {
            save({ vehicle_year: s.vehicleYear, vehicle_make: s.vehicleMake, vehicle_model: s.vehicleModel, wrap_coverage: s.wrapCoverage, estimated_price_low: s.estimatedPrice?.low, estimated_price_high: s.estimatedPrice?.high, step_reached: 2 })
            upd({ step: 2 })
          }}
        >
          See My Mockup <ArrowRight size={18} />
        </button>

        {/* Testimonial rotator */}
        <div style={{
          marginTop: 32,
          background: '#1a1d27',
          borderRadius: 14,
          padding: '20px 24px',
          borderLeft: '3px solid #4f7fff',
        }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} fill="#f59e0b" style={{ color: '#f59e0b' }} />
            ))}
          </div>
          <p style={{ fontSize: 15, color: '#e8eaed', lineHeight: 1.6, margin: '0 0 12px', fontStyle: 'italic' }}>
            "{t.quote}"
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#9299b5' }}>{t.role}</div>
            </div>
            <div style={{ fontSize: 12, color: '#4f7fff', background: '#1a2a4a', padding: '4px 10px', borderRadius: 6 }}>
              {t.vehicle}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
            {TESTIMONIALS.map((_, i) => (
              <div
                key={i}
                onClick={() => upd({ testimonialIdx: i })}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i === s.testimonialIdx ? '#4f7fff' : '#2a2d3a',
                  cursor: 'pointer', transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── STEP 2: Brand Info ───────────────────────────────────────────────────
  const renderStep2 = () => (
    <div>
      <h2 style={st.h2}>Tell us about your brand</h2>
      <p style={st.subtitle}>We'll extract your colors from your logo to build your mockup</p>

      <div style={st.fieldWrap}>
        <label style={st.label}>Business Website <span style={{ color: '#4f7fff' }}>(most important)</span></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Globe size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9299b5' }} />
            <input
              style={{ ...st.input, paddingLeft: 36 }}
              type="url"
              placeholder="https://yourbusiness.com"
              value={s.websiteUrl}
              onChange={e => upd({ websiteUrl: e.target.value, scraped: false })}
              onKeyDown={e => { if (e.key === 'Enter') scrapeWebsite() }}
            />
          </div>
          <button
            onClick={scrapeWebsite}
            disabled={s.scraping || !s.websiteUrl.trim()}
            style={{
              ...st.btn,
              width: 'auto',
              padding: '12px 20px',
              opacity: s.scraping || !s.websiteUrl.trim() ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {s.scraping ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {s.scraping ? 'Scanning...' : 'Scan'}
          </button>
        </div>
        {s.colorError && (
          <div style={st.error}>
            <AlertCircle size={14} /> {s.colorError}
          </div>
        )}
      </div>

      {/* Scraped result */}
      {s.scraped && (
        <div style={{ background: '#1a1d27', border: '1px solid #22c07a40', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Check size={16} style={{ color: '#22c07a' }} />
            <span style={{ color: '#22c07a', fontSize: 14, fontWeight: 600 }}>Brand scanned successfully!</span>
          </div>
          {s.scrapedLogo && (
            <img
              src={s.scrapedLogo}
              alt="Logo"
              style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain', marginBottom: 12, borderRadius: 6, background: '#fff', padding: 6 }}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}
          {s.brandColors.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#9299b5', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Logo Colors — confirm or adjust:
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                {s.brandColors.map((hex, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="color"
                      value={hex}
                      onChange={e => {
                        const colors = [...s.brandColors]
                        colors[i] = e.target.value
                        upd({ brandColors: colors })
                      }}
                      style={{ ...st.colorSwatch(hex), padding: 0, border: '2px solid #2a2d3a' }}
                    />
                    <span style={{ fontSize: 12, color: '#9299b5', fontFamily: 'JetBrains Mono, monospace' }}>{hex}</span>
                    <button
                      onClick={() => upd({ brandColors: s.brandColors.filter((_, j) => j !== i) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f25a5a', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {s.brandColors.length < 3 && (
                  <button
                    onClick={() => upd({ brandColors: [...s.brandColors, '#4f7fff'] })}
                    style={{ ...st.colorSwatch('#1a1d27'), border: '2px dashed #2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9299b5', fontSize: 18 }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No website — manual upload */}
      {!s.scraped && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#9299b5', fontSize: 13, marginBottom: 12 }}>No website? Upload your logo and pick your colors manually:</p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*,.svg,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                const dataUrl = ev.target?.result as string
                if (dataUrl) upd({ uploadedLogo: dataUrl, scraped: false })
              }
              reader.readAsDataURL(file)
            }}
          />
          <button
            onClick={() => logoInputRef.current?.click()}
            style={{ ...st.btn, ...st.btnOutline, marginBottom: 12 }}
          >
            <Upload size={16} /> Upload Logo
          </button>
          {s.uploadedLogo && (
            <img src={s.uploadedLogo} alt="Uploaded logo" style={{ maxHeight: 60, borderRadius: 6, background: '#fff', padding: 6, marginBottom: 12 }} />
          )}
          <div>
            <label style={st.label}>Brand Colors (pick up to 3)</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
              {s.brandColors.map((hex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="color"
                    value={hex}
                    onChange={e => {
                      const colors = [...s.brandColors]
                      colors[i] = e.target.value
                      upd({ brandColors: colors })
                    }}
                    style={{ ...st.colorSwatch(hex), padding: 0, border: '2px solid #2a2d3a' }}
                  />
                  <button
                    onClick={() => upd({ brandColors: s.brandColors.filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f25a5a', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {s.brandColors.length < 3 && (
                <button
                  onClick={() => upd({ brandColors: [...s.brandColors, '#4f7fff'] })}
                  style={{ ...st.colorSwatch('#1a1d27'), border: '2px dashed #2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9299b5', fontSize: 18 }}
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={st.fieldWrap}>
        <label style={st.label}>Design Style</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => upd({ stylePreference: opt.id })}
              style={{
                background: s.stylePreference === opt.id ? '#1a2a4a' : '#1a1d27',
                border: s.stylePreference === opt.id ? '2px solid #4f7fff' : '2px solid #2a2d3a',
                borderRadius: 12,
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left' as const,
                color: '#e8eaed',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: '#9299b5', marginTop: 3 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={st.row}>
        <div style={st.fieldWrap}>
          <label style={st.label}>Instagram Handle (optional)</label>
          <div style={{ position: 'relative' }}>
            <Instagram size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9299b5' }} />
            <input
              style={{ ...st.input, paddingLeft: 36 }}
              placeholder="@yourbusiness"
              value={s.instagramHandle}
              onChange={e => upd({ instagramHandle: e.target.value })}
            />
          </div>
        </div>
        <div style={st.fieldWrap}>
          <label style={st.label}>Business in one line (optional)</label>
          <input
            style={st.input}
            placeholder="e.g. Plumbing & HVAC services"
            value={s.businessDescription}
            onChange={e => upd({ businessDescription: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button style={{ ...st.btn, ...st.btnOutline, flex: '0 0 auto', width: 'auto', padding: '14px 24px' }} onClick={() => upd({ step: 1 })}>
          Back
        </button>
        <button
          style={{
            ...st.btn,
            flex: 1,
            opacity: s.brandColors.length > 0 && s.stylePreference ? 1 : 0.5,
          }}
          disabled={!(s.brandColors.length > 0 && s.stylePreference)}
          onClick={generateMockups}
        >
          <Sparkles size={18} /> Generate My Mockup
        </button>
      </div>
      {s.genError && <div style={{ ...st.error, marginTop: 12 }}><AlertCircle size={14} /> {s.genError}</div>}
    </div>
  )

  // ─── STEP 3: Generating ───────────────────────────────────────────────────
  const renderStep3 = () => (
    <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>
        <Car size={64} style={{ color: '#4f7fff', margin: '0 auto' }} />
      </div>
      <h2 style={{ ...st.h2, textAlign: 'center' as const, marginBottom: 12 }}>
        Our AI is creating your custom mockup...
      </h2>
      <p style={{ color: '#9299b5', marginBottom: 40 }}>
        This takes about 30 seconds. Hang tight!
      </p>

      {/* Animated progress bar */}
      <div style={{ background: '#1a1d27', borderRadius: 8, height: 6, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #4f7fff, #22c07a)',
          borderRadius: 8,
          width: `${Math.min(((s.progressIdx + 1) / PROGRESS_MESSAGES.length) * 90 + 10, 95)}%`,
          transition: 'width 2s ease',
        }} />
      </div>

      <p style={{ color: '#4f7fff', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        {PROGRESS_MESSAGES[s.progressIdx]}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i < s.progressIdx ? '#22c07a' : i === s.progressIdx % 3 ? '#4f7fff' : '#2a2d3a',
            transition: 'background 0.5s',
          }} />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ─── STEP 4: Reveal + Signup Gate ─────────────────────────────────────────
  const renderStep4 = () => (
    <div>
      <div style={{ textAlign: 'center' as const, marginBottom: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>Your free mockup is ready!</div>
        <p style={{ color: '#9299b5' }}>Sign up to unlock the full HD version and live editor</p>
      </div>

      {/* Blurry mockup previews */}
      <div style={{ display: 'grid', gridTemplateColumns: s.mockupUrls.length > 1 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 28 }}>
        {(s.mockupUrls.length > 0 ? s.mockupUrls : [null, null]).map((url, i) => (
          <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '3/2', background: '#1a1d27' }}>
            {url ? (
              <>
                <img
                  src={url}
                  alt={`Mockup ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px)', transform: 'scale(1.1)' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column' as const,
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(10,12,18,0.45)',
                }}>
                  <Lock size={24} style={{ color: '#fff', marginBottom: 8 }} />
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>USA Wrap Co Preview</span>
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2d3a' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div style={{ background: '#1a1d27', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Unlock full resolution + live editing:</p>
        {[
          'Full HD mockup download',
          'Edit colors, text, and design live',
          'See all 3 wrap coverage options',
          'Get exact pricing for your vehicle',
          'Free design consultation with our team',
        ].map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Check size={14} style={{ color: '#22c07a', flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: '#e8eaed' }}>{b}</span>
          </div>
        ))}
      </div>

      {/* Signup form */}
      <div style={st.row}>
        <div style={st.fieldWrap}>
          <label style={st.label}>Your Name *</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9299b5' }} />
            <input
              style={{ ...st.input, paddingLeft: 36 }}
              placeholder="John Smith"
              value={s.contactName}
              onChange={e => upd({ contactName: e.target.value })}
            />
          </div>
        </div>
        <div style={st.fieldWrap}>
          <label style={st.label}>Business Name</label>
          <div style={{ position: 'relative' }}>
            <Building2 size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9299b5' }} />
            <input
              style={{ ...st.input, paddingLeft: 36 }}
              placeholder="Smith Plumbing Co."
              value={s.businessName}
              onChange={e => upd({ businessName: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div style={st.row}>
        <div style={st.fieldWrap}>
          <label style={st.label}>Email Address *</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9299b5' }} />
            <input
              style={{ ...st.input, paddingLeft: 36 }}
              type="email"
              placeholder="john@yourbusiness.com"
              value={s.contactEmail}
              onChange={e => upd({ contactEmail: e.target.value })}
            />
          </div>
        </div>
        <div style={st.fieldWrap}>
          <label style={st.label}>Phone Number</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9299b5' }} />
            <input
              style={{ ...st.input, paddingLeft: 36 }}
              type="tel"
              placeholder="(555) 000-0000"
              value={s.contactPhone}
              onChange={e => upd({ contactPhone: e.target.value })}
            />
          </div>
        </div>
      </div>

      {s.submitError && <div style={{ ...st.error, marginBottom: 12 }}><AlertCircle size={14} /> {s.submitError}</div>}

      <button
        style={{ ...st.btn, ...st.btnGreen, opacity: s.submitting ? 0.7 : 1 }}
        disabled={s.submitting}
        onClick={submitLead}
      >
        {s.submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
        {s.submitting ? 'Creating your account...' : 'Unlock My Full Mockup'}
      </button>

      <p style={{ color: '#9299b5', fontSize: 12, textAlign: 'center' as const, marginTop: 12 }}>
        No spam. Your info is used only to send your mockup and quote.
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ─── STEP 5: Portal / Confirmation ────────────────────────────────────────
  const renderStep5 = () => {
    const weekdays = getUpcomingWeekdays(5)
    return (
      <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>
          <Sparkles size={64} style={{ color: '#22c07a', margin: '0 auto' }} />
        </div>
        <h2 style={{ ...st.h2, textAlign: 'center' as const, fontSize: 28, marginBottom: 12 }}>
          You're in! Your mockup is unlocked.
        </h2>
        <p style={{ color: '#9299b5', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          One of our wrap designers will reach out within 1 business hour. Here's a preview of your {s.vehicleMake} {s.vehicleModel}.
        </p>

        {/* Full mockups (unblurred) */}
        {s.mockupUrls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: s.mockupUrls.length > 1 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 32 }}>
            {s.mockupUrls.map((url, i) => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '3/2', background: '#1a1d27' }}>
                <img src={url} alt={`Mockup ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
          <button
            style={{ ...st.btn, ...st.btnGreen }}
            onClick={() => router.push('/portal')}
          >
            <Car size={18} /> View My Portal
          </button>
          <button
            style={{ ...st.btn, background: '#1a2a4a', border: '1px solid #4f7fff' }}
            onClick={() => router.push('/contact')}
          >
            <Phone size={18} /> Talk to a Designer
          </button>
        </div>

        {/* Appointment booking */}
        <div style={{ textAlign: 'left' as const, borderTop: '1px solid #1e2230', paddingTop: 28 }}>
          {s.bookingConfirmed ? (
            <div style={{
              background: '#0d2a1a', border: '1px solid #22c07a40',
              borderRadius: 14, padding: '24px 20px', textAlign: 'center' as const,
            }}>
              <Check size={32} style={{ color: '#22c07a', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Consultation Booked!</div>
              <p style={{ color: '#9299b5', fontSize: 14, margin: 0 }}>
                We'll send a confirmation to {s.contactEmail}. A designer will call you at the scheduled time.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Calendar size={18} style={{ color: '#4f7fff' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Book a Free Design Consultation</h3>
              </div>
              <p style={{ color: '#9299b5', fontSize: 14, marginBottom: 20 }}>
                Pick a time and we'll walk through your mockup live, answer questions, and give you an exact quote.
              </p>

              {/* Day/time slot picker */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                {weekdays.map(day => (
                  <div key={day.toISOString()}>
                    <div style={{
                      fontSize: 11, color: '#9299b5', textAlign: 'center' as const,
                      marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                    }}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: 12, color: '#e8eaed', textAlign: 'center' as const, marginBottom: 8, fontWeight: 600 }}>
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {SLOT_TIMES.map(time => {
                      const key = formatSlotKey(day, time)
                      const isSelected = s.selectedSlot === key
                      return (
                        <button
                          key={time}
                          onClick={() => upd({ selectedSlot: isSelected ? '' : key })}
                          style={{
                            width: '100%',
                            marginBottom: 4,
                            padding: '7px 4px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 8,
                            border: isSelected ? '2px solid #4f7fff' : '2px solid #2a2d3a',
                            background: isSelected ? '#1a2a4a' : '#1a1d27',
                            color: isSelected ? '#4f7fff' : '#9299b5',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                          }}
                        >
                          <Clock size={10} />
                          {time}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {s.bookingError && (
                <div style={{ ...st.error, marginBottom: 12 }}>
                  <AlertCircle size={14} /> {s.bookingError}
                </div>
              )}

              <button
                style={{
                  ...st.btn,
                  opacity: s.selectedSlot && !s.bookingLoading ? 1 : 0.4,
                }}
                disabled={!s.selectedSlot || s.bookingLoading}
                onClick={bookAppointment}
              >
                {s.bookingLoading
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Booking...</>
                  : <><Calendar size={18} /> Confirm Consultation</>
                }
              </button>
              <p style={{ color: '#9299b5', fontSize: 12, textAlign: 'center' as const, marginTop: 10 }}>
                15-minute call. No obligation.
              </p>
            </>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  const isLoading = s.generating || s.polling

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={st.header}>
        <div style={st.logo}>
          USA <span style={st.logoAccent}>WRAP</span> CO
        </div>
        <div style={st.stepBar}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={st.stepDot(s.step === n, s.step > n)} />
              {n < 5 && <div style={{ width: 16, height: 1, background: s.step > n ? '#22c07a' : '#2a2d3a' }} />}
            </div>
          ))}
          <span style={{ fontSize: 12, color: '#9299b5', marginLeft: 6 }}>
            Step {s.step === 3 && isLoading ? 3 : s.step} of 5 — {stepLabel(s.step)}
          </span>
        </div>
      </div>

      {/* Card */}
      <div style={st.card}>
        {s.step === 1 && renderStep1()}
        {s.step === 2 && renderStep2()}
        {(s.step === 3 || isLoading) && s.mockupUrls.length === 0 && renderStep3()}
        {s.step === 4 && renderStep4()}
        {s.step === 5 && renderStep5()}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1a1d27; color: #e8eaed; }
        input[type="color"] { cursor: pointer; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
