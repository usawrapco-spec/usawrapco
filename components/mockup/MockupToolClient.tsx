'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Wand2, Download, RefreshCw, Globe, Check, Palette, Building2,
  Car, ChevronDown, Upload, X, Clock, ImageIcon, FileText,
  Layers, Zap, History, Eye, Plus, AlertCircle, Star,
} from 'lucide-react'
import VehicleSelector from '@/components/shared/VehicleSelector'
import type { VehicleSelectResult } from '@/components/shared/VehicleSelector'
import type { Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: Profile
  defaultProjectId?: string
  defaultYear?: string
  defaultMake?: string
  defaultModel?: string
}

interface BrandAnalysis {
  colors: string[]
  keywords: string[]
  styleNotes: string
}

interface HistoryRecord {
  id: string
  vehicle_year: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_color: string | null
  wrap_style: string | null
  result_url: string | null
  design_score: number | null
  created_at: string
  project_id: string | null
  customer_id: string | null
  brand_data: Record<string, unknown> | null
}

type GenerationStep = 'idle' | 'analyzing' | 'building' | 'generating' | 'compositing' | 'done' | 'error'
type ActiveTab = 'generator' | 'history'

// ── Constants ─────────────────────────────────────────────────────────────────

const VEHICLE_COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue']

const VIEW_ANGLES = [
  'Driver Side', 'Passenger Side', 'Front 3/4', 'Rear 3/4', 'Full Front', 'Full Rear',
]

const INDUSTRIES = [
  'Plumbing', 'HVAC', 'Electrical', 'Landscaping', 'Construction',
  'Food & Beverage', 'Medical', 'Real Estate', 'Retail', 'Other',
]

const WRAP_STYLES: Array<{ id: string; label: string; icon: string; desc: string }> = [
  { id: 'Full Color Change',         label: 'Full Color Change',         icon: '🎨', desc: 'Solid color vinyl wrap, complete color transformation' },
  { id: 'Company Branding / Logo',   label: 'Company Branding',          icon: '🏢', desc: 'Bold business branding, logos, contact info' },
  { id: 'Racing / Sport Stripes',    label: 'Racing / Stripes',          icon: '⚡', desc: 'Speed lines, sport graphics, dynamic look' },
  { id: 'Geometric / Abstract',      label: 'Geometric / Abstract',      icon: '◆', desc: 'Angular shapes, patterns, modern design' },
  { id: 'Photography / Scene',       label: 'Photography / Scene',       icon: '📸', desc: 'Photographic imagery, full scene coverage' },
  { id: 'Gradient / Color Fade',     label: 'Gradient / Fade',           icon: '🌅', desc: 'Smooth color transitions, ombre effects' },
  { id: 'Minimalist / Clean',        label: 'Minimalist / Clean',        icon: '⬜', desc: 'Subtle, understated, professional' },
  { id: 'Bold & Aggressive',         label: 'Bold & Aggressive',         icon: '🔥', desc: 'High contrast, dramatic, eye-catching' },
]

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: '',
  analyzing: 'Analyzing brand profile...',
  building: 'Building vehicle template...',
  generating: 'Generating design concept...',
  compositing: 'Compositing layers...',
  done: 'Render complete',
  error: 'Generation failed',
}

const STEP_ORDER: GenerationStep[] = ['analyzing', 'building', 'generating', 'compositing', 'done']

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  label: {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '9px 12px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%', padding: '9px 12px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)',
    fontSize: 13, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const,
  },
  section: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '18px 20px', marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 14,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  pill: (active: boolean): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
    color: active ? 'var(--accent)' : 'var(--text2)',
    whiteSpace: 'nowrap' as const, transition: 'all 0.15s',
  }),
  select: {
    width: '100%', padding: '9px 12px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)',
    fontSize: 13, outline: 'none', appearance: 'none' as const,
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: React.ReactNode }) {
  return (
    <div style={S.sectionTitle}>
      {icon}
      <span>{title}</span>
      {badge && <span style={{ marginLeft: 'auto' }}>{badge}</span>}
    </div>
  )
}

function ColorSwatch({ hex, onRemove }: { hex: string; onRemove: () => void }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <div
        title={hex}
        style={{
          width: 28, height: 28, borderRadius: 6, background: hex,
          border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer',
        }}
      />
      <button
        onClick={onRemove}
        style={{
          position: 'absolute', top: -6, right: -6, width: 14, height: 14,
          borderRadius: '50%', background: 'var(--red)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 10, padding: 0,
        }}
      >
        <X size={8} />
      </button>
    </div>
  )
}

function StepIndicator({ step, currentStep }: { step: GenerationStep; currentStep: GenerationStep }) {
  const order = STEP_ORDER
  const stepIdx = order.indexOf(step)
  const currentIdx = order.indexOf(currentStep)

  let state: 'done' | 'active' | 'pending'
  if (currentStep === 'done' || stepIdx < currentIdx) state = 'done'
  else if (stepIdx === currentIdx) state = 'active'
  else state = 'pending'

  const color = state === 'done' ? 'var(--green)' : state === 'active' ? 'var(--accent)' : 'var(--text3)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: state === 'done' ? 'rgba(34,192,122,0.15)' : state === 'active' ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {state === 'done' ? (
          <Check size={10} style={{ color: 'var(--green)' }} />
        ) : state === 'active' ? (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)', animation: 'pulse 1s ease-in-out infinite',
          }} />
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)' }} />
        )}
      </div>
      <span style={{ fontSize: 12, color, fontWeight: state === 'active' ? 600 : 400 }}>
        {STEP_LABELS[step]}
      </span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MockupToolClient({
  profile,
  defaultProjectId,
  defaultYear = '',
  defaultMake = '',
  defaultModel = '',
}: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator')

  // Vehicle
  const [vehicle, setVehicle] = useState<VehicleSelectResult>({
    year: defaultYear, make: defaultMake, model: defaultModel,
    sqft: null, base_price: null, install_hours: null, measurement: null,
  })
  const [vehicleColor, setVehicleColor] = useState('White')
  const [customColor, setCustomColor] = useState('')
  const [viewAngle, setViewAngle] = useState('Driver Side')

  // Brand Profile
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [newColorHex, setNewColorHex] = useState('#4f7fff')
  const [industry, setIndustry] = useState('')
  const [logoBase64, setLogoBase64] = useState('')
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [brandAnalyzed, setBrandAnalyzed] = useState(false)

  // Wrap Style
  const [wrapStyle, setWrapStyle] = useState('Company Branding / Logo')

  // Additional
  const [colorScheme, setColorScheme] = useState('')
  const [specificElements, setSpecificElements] = useState('')

  // Generation
  const [genStep, setGenStep] = useState<GenerationStep>('idle')
  const [predictionId, setPredictionId] = useState('')
  const [brandData, setBrandData] = useState<Record<string, unknown>>({})
  const [imageUrl, setImageUrl] = useState('')
  const [brandAnalysis, setBrandAnalysis] = useState<BrandAnalysis | null>(null)
  const [prompt, setPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genCtxRef = useRef<Record<string, string>>({})

  // History
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── Load history ────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data } = await supabase
        .from('mockup_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setHistory(data || [])
    } catch { /* ignore */ }
    setHistoryLoading(false)
  }, [supabase])

  useEffect(() => {
    if (activeTab === 'history') loadHistory()
  }, [activeTab, loadHistory])

  // ── Analyze brand from website ──────────────────────────────────────────────

  const analyzeWebsite = async () => {
    if (!websiteUrl) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, logoBase64: logoBase64 || undefined }),
      })
      const data = await res.json()
      if (data.colors?.length) {
        const hexes = (data.colors as Array<{ hex: string } | string>)
          .map(c => typeof c === 'string' ? c : c.hex)
          .filter(Boolean)
        setBrandColors(hexes.slice(0, 5))
      }
      if (data.style) setWrapStyle(data.style === 'minimal' ? 'Minimalist / Clean' : wrapStyle)
      setBrandAnalyzed(true)
    } catch { /* ignore */ }
    setAnalyzing(false)
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setLogoBase64(dataUrl)
      setLogoPreviewUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // ── Color management ────────────────────────────────────────────────────────

  const addBrandColor = () => {
    if (brandColors.includes(newColorHex)) return
    setBrandColors(prev => [...prev, newColorHex].slice(0, 6))
  }

  const removeBrandColor = (idx: number) => {
    setBrandColors(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Polling ─────────────────────────────────────────────────────────────────

  const poll = useCallback(async (id: string, count = 0) => {
    if (count > 40) {
      setError('Generation timed out. Please try again.')
      setGenStep('error')
      return
    }

    // Advance progress steps visually
    if (count === 3) setGenStep('compositing')
    else if (count === 8) setGenStep('done') // optimistic

    const ctx = genCtxRef.current
    const qs = new URLSearchParams({
      id,
      ...(ctx.vehicleYear && { vehicleYear: ctx.vehicleYear }),
      ...(ctx.vehicleMake && { vehicleMake: ctx.vehicleMake }),
      ...(ctx.vehicleModel && { vehicleModel: ctx.vehicleModel }),
      ...(ctx.vehicleColor && { vehicleColor: ctx.vehicleColor }),
      ...(ctx.viewAngle && { viewAngle: ctx.viewAngle }),
      ...(ctx.wrapStyle && { wrapStyle: ctx.wrapStyle }),
      ...(ctx.projectId && { projectId: ctx.projectId }),
      ...(ctx.customerId && { customerId: ctx.customerId }),
      ...(ctx.userId && { userId: ctx.userId }),
    })

    try {
      const res = await fetch(`/api/ai/generate-mockup?${qs.toString()}`)
      const data = await res.json()

      if (data.status === 'succeeded' && data.imageUrl) {
        setImageUrl(data.imageUrl)
        setGenStep('done')
        loadHistory()
        return
      }
      if (data.status === 'failed' || data.error) {
        setError(data.error || 'Generation failed')
        setGenStep('error')
        return
      }
    } catch { /* continue polling */ }

    pollRef.current = setTimeout(() => poll(id, count + 1), 3000)
  }, [loadHistory])

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [])

  // ── Generate ────────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!vehicle.year && !vehicle.make) {
      setError('Please select a vehicle year and make first.')
      return
    }
    if (pollRef.current) clearTimeout(pollRef.current)
    setError('')
    setImageUrl('')
    setBrandAnalysis(null)
    setPrompt('')
    setGenStep('analyzing')

    const finalColor = vehicleColor === 'other' ? customColor : vehicleColor

    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          vehicleColor: finalColor,
          viewAngle,
          wrapStyle,
          websiteUrl,
          companyName,
          brandColors,
          industry,
          logoBase64: logoBase64 || undefined,
          colorScheme,
          specificElements,
          projectId: defaultProjectId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Generation failed')
        setGenStep('error')
        return
      }

      setGenStep('building')
      if (data.brandAnalysis) setBrandAnalysis(data.brandAnalysis)
      if (data.prompt) setPrompt(data.prompt)

      if (data.status === 'succeeded' && data.imageUrl) {
        setImageUrl(data.imageUrl)
        setGenStep('done')
        loadHistory()
        return
      }

      // Start polling
      if (data.predictionId) {
        setPredictionId(data.predictionId)
        genCtxRef.current = {
          vehicleYear: vehicle.year,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model || '',
          vehicleColor: finalColor,
          viewAngle,
          wrapStyle,
          projectId: defaultProjectId || '',
          userId: profile.id,
        }
        setBrandData(data.brandData || {})
        setGenStep('generating')
        pollRef.current = setTimeout(() => poll(data.predictionId, 0), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
      setGenStep('error')
    }
  }

  const isGenerating = ['analyzing', 'building', 'generating', 'compositing'].includes(genStep)
  const elapsedRef = useRef(0)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Page header + tabs */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>
          AI Mockup Tool
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Generate photorealistic vehicle wrap mockups powered by Flux Pro.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          {(['generator', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text3)',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'generator' ? <><Wand2 size={12} style={{ display: 'inline', marginRight: 5 }} />{tab}</> : <><History size={12} style={{ display: 'inline', marginRight: 5 }} />{tab}</>}
            </button>
          ))}
        </div>
      </div>

      {/* ── GENERATOR TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
          <div>

            {/* SECTION 1: VEHICLE */}
            <div style={S.section}>
              <SectionHeader icon={<Car size={13} />} title="Vehicle" badge={
                vehicle.make ? (
                  <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={10} /> Selected
                  </span>
                ) : undefined
              } />

              <div style={{ marginBottom: 14 }}>
                <VehicleSelector
                  onVehicleSelect={setVehicle}
                  defaultYear={defaultYear}
                  defaultMake={defaultMake}
                  defaultModel={defaultModel}
                />
              </div>

              {vehicle.sqft && (
                <div style={{ padding: '8px 10px', background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--text2)', marginBottom: 14 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{vehicle.sqft} sqft</span>
                  {vehicle.base_price && <span style={{ marginLeft: 8, color: 'var(--text3)' }}>Est. ${vehicle.base_price.toLocaleString()}–${Math.round(vehicle.base_price * 1.4).toLocaleString()}</span>}
                </div>
              )}

              {/* Vehicle Color */}
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Vehicle Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VEHICLE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setVehicleColor(c)}
                      style={S.pill(vehicleColor === c)}
                    >
                      {c}
                    </button>
                  ))}
                  <button onClick={() => setVehicleColor('other')} style={S.pill(vehicleColor === 'other')}>
                    Other
                  </button>
                </div>
                {vehicleColor === 'other' && (
                  <input
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    placeholder="e.g. Pearl White, Forest Green..."
                    style={{ ...S.input, marginTop: 8 }}
                  />
                )}
              </div>

              {/* View Angle */}
              <div>
                <label style={S.label}>View Angle</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VIEW_ANGLES.map(a => (
                    <button
                      key={a}
                      onClick={() => setViewAngle(a)}
                      style={S.pill(viewAngle === a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 2: BRAND PROFILE */}
            <div style={S.section}>
              <SectionHeader icon={<Building2 size={13} />} title="Brand Profile" badge={
                brandAnalyzed ? (
                  <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={10} /> Analyzed
                  </span>
                ) : undefined
              } />

              {/* Website URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Customer Website</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && analyzeWebsite()}
                    placeholder="https://customer-website.com"
                    style={{ ...S.input, flex: 1 }}
                  />
                  <button
                    onClick={analyzeWebsite}
                    disabled={!websiteUrl || analyzing}
                    style={{
                      padding: '0 12px', borderRadius: 8, border: 'none',
                      background: websiteUrl ? 'var(--accent)' : 'var(--surface2)',
                      color: websiteUrl ? '#fff' : 'var(--text3)',
                      fontSize: 12, fontWeight: 700,
                      cursor: websiteUrl && !analyzing ? 'pointer' : 'default',
                      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <Globe size={12} />
                    {analyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </div>

              {/* Company Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Company Name</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="ABC Plumbing Co."
                  style={S.input}
                />
              </div>

              {/* Brand Colors */}
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Brand Colors</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {brandColors.map((hex, i) => (
                    <ColorSwatch key={i} hex={hex} onRemove={() => removeBrandColor(i)} />
                  ))}
                  {brandColors.length < 6 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={e => setNewColorHex(e.target.value)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--surface2)' }}
                      />
                      <button
                        onClick={addBrandColor}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: '1px dashed var(--border)',
                          background: 'var(--surface2)', color: 'var(--text3)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {brandColors.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {brandColors.map((hex, i) => (
                      <span key={i} style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{hex}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Industry */}
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Industry</label>
                <div style={{ position: 'relative' }}>
                  <select value={industry} onChange={e => setIndustry(e.target.value)} style={S.select}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label style={S.label}>Logo Upload</label>
                {logoPreviewUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={logoPreviewUrl} alt="Logo" style={{ height: 40, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: '4px 8px', maxWidth: 100 }} />
                    <button
                      onClick={() => { setLogoBase64(''); setLogoPreviewUrl('') }}
                      style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1px dashed var(--border)', borderRadius: 8, padding: '14px',
                      textAlign: 'center', cursor: 'pointer', color: 'var(--text3)', fontSize: 12,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Upload size={16} style={{ opacity: 0.5 }} />
                    <span>Drop logo here or click to upload</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>PNG, JPG, SVG</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </div>
            </div>

            {/* SECTION 3: WRAP STYLE */}
            <div style={S.section}>
              <SectionHeader icon={<Layers size={13} />} title="Wrap Style" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {WRAP_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setWrapStyle(style.id)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      border: wrapStyle === style.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: wrapStyle === style.id ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{style.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: wrapStyle === style.id ? 'var(--accent)' : 'var(--text1)', marginBottom: 2 }}>
                      {style.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.3 }}>{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 4: ADDITIONAL DETAILS */}
            <div style={S.section}>
              <SectionHeader icon={<FileText size={13} />} title="Additional Details" />

              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Color Scheme</label>
                <input
                  value={colorScheme}
                  onChange={e => setColorScheme(e.target.value)}
                  placeholder="e.g. navy blue and gold, red gradient..."
                  style={S.input}
                />
              </div>

              <div>
                <label style={S.label}>Specific Elements</label>
                <textarea
                  value={specificElements}
                  onChange={e => setSpecificElements(e.target.value)}
                  placeholder="Logos, icons, shapes, textures, design notes..."
                  rows={3}
                  style={S.textarea}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--red)' }}>{error}</span>
              </div>
            )}

            {/* GENERATE BUTTON */}
            <button
              onClick={generate}
              disabled={isGenerating || (!vehicle.year && !vehicle.make)}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: isGenerating || (!vehicle.year && !vehicle.make)
                  ? 'var(--surface2)'
                  : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: isGenerating || (!vehicle.year && !vehicle.make) ? 'var(--text3)' : '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: isGenerating || (!vehicle.year && !vehicle.make) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {isGenerating ? (
                <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
              ) : (
                <><Wand2 size={16} /> {imageUrl ? 'Regenerate Mockup' : 'Generate Mockup'}</>
              )}
            </button>

            {/* GENERATION PROGRESS */}
            {isGenerating && (
              <div style={{ ...S.section, marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={11} /> Generation Progress
                  <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> ~45s
                  </span>
                </div>
                {STEP_ORDER.map(step => (
                  <StepIndicator key={step} step={step} currentStep={genStep} />
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
          <div>
            {/* Main image area */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', minHeight: 480,
              display: 'flex', flexDirection: 'column',
            }}>
              {imageUrl ? (
                <>
                  {/* Generated image */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    <img
                      src={imageUrl}
                      alt="Generated mockup"
                      style={{ width: '100%', display: 'block', borderRadius: '12px 12px 0 0', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <a
                      href={imageUrl}
                      download="vehicle-wrap-mockup.webp"
                      style={{
                        padding: '8px 14px', borderRadius: 8, background: 'var(--accent)',
                        color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Download size={13} /> Download HD
                    </a>
                    <button
                      onClick={generate}
                      disabled={isGenerating}
                      style={{
                        padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <RefreshCw size={13} /> Regenerate
                    </button>
                    {defaultProjectId && (
                      <button
                        onClick={() => {
                          // Attach to project — open in new tab
                          window.location.href = `/projects/${defaultProjectId}`
                        }}
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Eye size={13} /> Use in Estimate
                      </button>
                    )}
                  </div>

                  {/* Brand Analysis Card */}
                  {brandAnalysis && (
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 10 }}>
                        Brand Analysis
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {brandAnalysis.colors.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Palette size={12} style={{ color: 'var(--text3)' }} />
                            <div style={{ display: 'flex', gap: 4 }}>
                              {brandAnalysis.colors.slice(0, 5).map((hex, i) => (
                                <div key={i} title={hex} style={{ width: 16, height: 16, borderRadius: 3, background: hex, border: '1px solid rgba(255,255,255,0.1)' }} />
                              ))}
                            </div>
                          </div>
                        )}
                        {brandAnalysis.keywords.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {brandAnalysis.keywords.slice(0, 4).map(kw => (
                              <span key={kw} style={{ padding: '2px 7px', background: 'rgba(79,127,255,0.1)', borderRadius: 10, fontSize: 10, color: 'var(--accent)' }}>
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} style={{ color: 'var(--amber)' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>8/10</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Design Score</span>
                        </div>
                      </div>
                      {brandAnalysis.styleNotes && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{brandAnalysis.styleNotes}</div>
                      )}
                    </div>
                  )}

                  {/* Prompt (collapsible) */}
                  {prompt && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                      <button
                        onClick={() => setShowPrompt(v => !v)}
                        style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <ChevronDown size={11} style={{ transform: showPrompt ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        {showPrompt ? 'Hide prompt' : 'Show prompt used'}
                      </button>
                      {showPrompt && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, fontFamily: 'JetBrains Mono, monospace' }}>
                          {prompt}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : isGenerating ? (
                /* Loading state */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 20 }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '3px solid var(--surface2)', borderTopColor: 'var(--accent)',
                      animation: 'spin 1s linear infinite',
                    }} />
                    <div style={{ position: 'absolute', inset: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wand2 size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
                      {STEP_LABELS[genStep]}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>Estimated time: ~45 seconds</div>
                  </div>
                  {/* Mirror steps in right panel */}
                  <div style={{ width: '100%', maxWidth: 300 }}>
                    {STEP_ORDER.map(step => (
                      <StepIndicator key={step} step={step} currentStep={genStep} />
                    ))}
                  </div>
                </div>
              ) : (
                /* Placeholder */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ImageIcon size={32} style={{ color: 'var(--text3)', opacity: 0.5 }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
                      Configure your vehicle and brand
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                      Then click Generate Mockup to create a photorealistic wrap design
                    </div>
                  </div>

                  {/* Example grid */}
                  <div style={{ width: '100%', marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 10, textAlign: 'center' }}>
                      Example Outputs
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {['Commercial Van', 'Pickup Truck', 'Box Truck'].map(label => (
                        <div
                          key={label}
                          style={{
                            height: 90, borderRadius: 8, background: 'var(--surface2)',
                            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 4,
                          }}
                        >
                          <Car size={20} style={{ color: 'var(--text3)', opacity: 0.4 }} />
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div>Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>No mockups generated yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Generate your first mockup above</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {history.map(record => (
                <div
                  key={record.id}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}
                >
                  {record.result_url ? (
                    <img
                      src={record.result_url}
                      alt="Mockup"
                      style={{ width: '100%', height: 180, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ height: 180, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={32} style={{ color: 'var(--text3)', opacity: 0.3 }} />
                    </div>
                  )}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)', marginBottom: 2 }}>
                      {[record.vehicle_year, record.vehicle_make, record.vehicle_model].filter(Boolean).join(' ') || 'Vehicle Mockup'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                      {record.wrap_style} · {new Date(record.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {record.result_url && (
                        <a
                          href={record.result_url}
                          download="mockup.webp"
                          style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Download size={11} /> View
                        </a>
                      )}
                      {record.project_id && (
                        <a
                          href={`/projects/${record.project_id}`}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={11} /> Job
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
