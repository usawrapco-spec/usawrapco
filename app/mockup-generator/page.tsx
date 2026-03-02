'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wand2, Car, Building2, Palette, ChevronRight, ChevronLeft,
  Download, RefreshCw, Save, Check, Loader2, Upload, X,
  Sparkles, ImageIcon, Search, Type, FileText, Printer,
  ThumbsUp, ZoomIn, ZoomOut,
} from 'lucide-react'

interface VehicleTemplate {
  id: string
  make: string
  model: string
  year_start: number
  year_end: number
  sqft: number | null
  thumbnail_url: string | null
  status: string
}

interface MockupStatus {
  id: string
  status: string
  current_step: number | null
  step_name: string | null
  flat_design_url: string | null
  final_mockup_url: string | null
  concept_url: string | null
  upscaled_url: string | null
  print_url: string | null
  error_step: string | null
  error_message: string | null
}

const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Food & Beverage',
  'Real Estate', 'Construction', 'Medical', 'Transportation', 'Retail',
  'Cleaning Services', 'Auto Services', 'Security', 'Technology', 'Other',
]

const STYLES = [
  { value: 'bold_aggressive', label: 'Bold & Aggressive' },
  { value: 'clean_professional', label: 'Clean & Professional' },
  { value: 'luxury_premium', label: 'Luxury Premium' },
  { value: 'fun_playful', label: 'Fun & Playful' },
  { value: 'industrial_tough', label: 'Industrial Tough' },
]

const FONTS = [
  { value: 'Impact', label: 'Impact', preview: 'COMPANY NAME' },
  { value: 'Bebas Neue', label: 'Bebas Neue', preview: 'COMPANY NAME' },
  { value: 'Anton', label: 'Anton', preview: 'COMPANY NAME' },
  { value: 'Oswald', label: 'Oswald', preview: 'COMPANY NAME' },
  { value: 'Montserrat', label: 'Montserrat', preview: 'COMPANY NAME' },
  { value: 'Roboto Condensed', label: 'Roboto Condensed', preview: 'COMPANY NAME' },
]

const PIPELINE_STEPS = [
  { key: 'brand', label: 'Analyzing brand…', icon: '🎨' },
  { key: 'artwork', label: 'Creating custom artwork…', icon: '🖌️' },
  { key: 'text', label: 'Adding your information…', icon: '✍️' },
  { key: 'polish', label: 'Applying photorealism…', icon: '📸' },
  { key: 'done', label: 'Concept ready!', icon: '✅' },
]

const APPROVE_STEPS = [
  { key: 'upscale', label: 'Upscaling to print resolution…', icon: '🔬' },
  { key: 'pdf', label: 'Creating print-ready PDF…', icon: '📄' },
  { key: 'done', label: 'Print files ready!', icon: '✅' },
]

const STEPS = [
  { id: 1, label: 'Vehicle', icon: Car },
  { id: 2, label: 'Brand', icon: Building2 },
  { id: 3, label: 'Text', icon: Type },
  { id: 4, label: 'Generate', icon: Sparkles },
  { id: 5, label: 'Result', icon: ImageIcon },
]

export default function MockupGeneratorPage() {
  const supabase = createClient()
  const [step, setStep] = useState(1)

  // Step 1 — Template
  const [templates, setTemplates] = useState<VehicleTemplate[]>([])
  const [templatesLoading, setTLoading] = useState(true)
  const [templateSearch, setTSearch] = useState('')
  const [selectedTemplate, setTemplate] = useState<VehicleTemplate | null>(null)

  // Step 2 — Brand
  const [companyName, setCompanyName] = useState('')
  const [tagline, setTagline] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [styleChoice, setStyleChoice] = useState('')
  const [brandColors, setBrandColors] = useState(['#1a56f0', '#ffffff', '#f59e0b'])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [styleNotes, setStyleNotes] = useState('')
  const logoRef = useRef<HTMLInputElement>(null)

  // Step 3 — Text
  const [fontChoice, setFontChoice] = useState('Impact')

  // Step 4 — Generating
  const [mockupId, setMockupId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  // Step 5 — Result
  const [mockupStatus, setMockupStatus] = useState<MockupStatus | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveStep, setApproveStep] = useState(0)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [printUrl, setPrintUrl] = useState<string | null>(null)
  const [upscaledUrl, setUpscaledUrl] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function loadTemplates() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) return
      const { data } = await supabase
        .from('vehicle_templates')
        .select('id, make, model, year_start, year_end, sqft, thumbnail_url, status')
        .eq('org_id', profile.org_id)
        .eq('status', 'active')
        .order('make')
      setTemplates(data || [])
      setTLoading(false)
    }
    loadTemplates()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const filteredTemplates = templates.filter(t => {
    const q = templateSearch.toLowerCase()
    return !q || t.make.toLowerCase().includes(q) || t.model.toLowerCase().includes(q)
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)) }
  }

  async function getLogoUrl(): Promise<string | null> {
    if (!logoFile) return null
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

  function startPolling(id: string) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mockup/status/${id}`)
        if (!res.ok) return
        const data: MockupStatus = await res.json()
        setMockupStatus(data)

        // Map DB step → pipeline step display
        const dbStep = data.current_step || 0
        const displayStep = Math.max(0, Math.min(dbStep - 1, PIPELINE_STEPS.length - 1))
        setPipelineStep(displayStep)

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
      } catch { /* silent poll failure */ }
    }, 2000)
  }

  async function handleGenerate() {
    if (!selectedTemplate) return
    setGenerating(true)
    setGenError(null)
    setPipelineStep(0)
    setMockupStatus(null)

    try {
      const logoUrl = await getLogoUrl()

      const res = await fetch('/api/mockup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          company_name: companyName,
          tagline,
          phone,
          website,
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
      setMockupStatus({
        id: data.mockup_id,
        status: data.status,
        current_step: 4,
        step_name: 'Concept ready',
        flat_design_url: data.flat_design_url,
        final_mockup_url: data.concept_url,
        concept_url: data.concept_url,
        upscaled_url: null,
        print_url: null,
        error_step: null,
        error_message: null,
      })
      setPipelineStep(PIPELINE_STEPS.length - 1)
      setGenerating(false)
      setStep(5)
    } catch (err: any) {
      setGenError(err.message || 'Generation failed')
      setGenerating(false)
    }
  }

  // Start polling when generating is triggered (for live updates)
  useEffect(() => {
    if (generating && mockupId) {
      startPolling(mockupId)
    }
  }, [generating, mockupId])

  async function handleApprove() {
    if (!mockupId) return
    setApproving(true)
    setApproveError(null)
    setApproveStep(0)

    // Animate approve steps
    let step = 0
    const timer = setInterval(() => {
      step = Math.min(step + 1, APPROVE_STEPS.length - 2)
      setApproveStep(step)
    }, 8000)

    try {
      const res = await fetch('/api/mockup/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockup_id: mockupId }),
      })
      const data = await res.json()
      clearInterval(timer)

      if (!res.ok) {
        setApproveError(data.error || 'Approval failed')
        setApproving(false)
        return
      }

      setUpscaledUrl(data.upscaled_url)
      setPrintUrl(data.print_url)
      setApproveStep(APPROVE_STEPS.length - 1)
      setApproving(false)
    } catch (err: any) {
      clearInterval(timer)
      setApproveError(err.message || 'Approval failed')
      setApproving(false)
    }
  }

  function handleDownloadConcept() {
    const url = mockupStatus?.concept_url || mockupStatus?.final_mockup_url
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `wrap-concept-${selectedTemplate?.make}-${Date.now()}.png`
    a.click()
  }

  function handleDownloadPrint() {
    if (!printUrl) return
    const a = document.createElement('a')
    a.href = printUrl
    a.download = `wrap-print-ready-${Date.now()}.pdf`
    a.click()
  }

  function reset() {
    setStep(1)
    setTemplate(null)
    setMockupId(null)
    setMockupStatus(null)
    setPrintUrl(null)
    setUpscaledUrl(null)
    setGenError(null)
    setApproveError(null)
    setPipelineStep(0)
    setApproveStep(0)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text1)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  const conceptImageUrl = mockupStatus?.concept_url || mockupStatus?.final_mockup_url

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Wand2 size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
          }}>
            AI Mockup Generator
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Full AI pipeline: brand analysis → Ideogram artwork → text compositing → photorealism → print-ready PDF.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', borderRadius: 8,
                  background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                  cursor: done ? 'pointer' : 'default',
                }}
                onClick={() => { if (done && !generating && !approving) setStep(s.id) }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <Check size={12} style={{ color: '#fff' }} />
                    : <Icon size={12} style={{ color: active ? '#fff' : 'var(--text3)' }} />
                  }
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={12} style={{ color: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Vehicle Template ─────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Select Vehicle</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
            Choose the vehicle template that matches your client's vehicle.
          </p>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={templateSearch}
              onChange={e => setTSearch(e.target.value)}
              placeholder="Search make or model…"
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          {templatesLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <Car size={32} style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                {templates.length === 0 ? 'No templates uploaded yet' : 'No templates match'}
              </div>
              {templates.length === 0 && (
                <div style={{ fontSize: 12 }}>
                  Go to <a href="/admin/templates" style={{ color: 'var(--accent)' }}>Admin → Templates</a> to upload vehicle base images.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {filteredTemplates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setTemplate(t)}
                  style={{
                    border: selectedTemplate?.id === t.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    background: selectedTemplate?.id === t.id ? 'rgba(79,127,255,0.05)' : 'var(--surface2)',
                    position: 'relative', transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ height: 110, overflow: 'hidden', background: 'var(--bg)' }}>
                    {t.thumbnail_url
                      ? <img src={t.thumbnail_url} alt={`${t.make} ${t.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Car size={24} style={{ color: 'var(--text3)' }} /></div>
                    }
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{t.make} {t.model}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{t.year_start}–{t.year_end}{t.sqft ? ` · ${t.sqft} sqft` : ''}</div>
                  </div>
                  {selectedTemplate?.id === t.id && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} style={{ color: '#fff' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedTemplate}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 22px', borderRadius: 8,
                background: selectedTemplate ? 'var(--accent)' : 'var(--surface2)',
                color: selectedTemplate ? '#fff' : 'var(--text3)',
                fontSize: 13, fontWeight: 700, border: 'none',
                cursor: selectedTemplate ? 'pointer' : 'not-allowed',
              }}
            >
              Next: Brand Setup <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Brand ────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Brand Setup</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            Tell us about the brand — AI will create a custom design based on this.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>COMPANY NAME *</label>
              <input style={inputStyle} placeholder="e.g. Pacific Northwest Plumbing" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>TAGLINE</label>
              <input style={inputStyle} placeholder="e.g. Fast. Reliable. Local." value={tagline} onChange={e => setTagline(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>PHONE NUMBER</label>
              <input style={inputStyle} placeholder="e.g. (253) 555-0100" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>WEBSITE</label>
              <input style={inputStyle} placeholder="e.g. pnwplumbing.com" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>INDUSTRY</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={industry} onChange={e => setIndustry(e.target.value)}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>STYLE</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={styleChoice} onChange={e => setStyleChoice(e.target.value)}>
                <option value="">Select style…</option>
                {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>BRAND COLORS</label>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {brandColors.map((c, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <input
                      type="color" value={c}
                      onChange={e => { const n = [...brandColors]; n[i] = e.target.value; setBrandColors(n) }}
                      style={{ width: 44, height: 44, borderRadius: 8, border: '2px solid var(--border)', cursor: 'pointer', padding: 0, background: 'none' }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{c.toUpperCase()}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Primary · Secondary · Accent</div>
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>LOGO (OPTIONAL)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {logoPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={logoPreview} alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)' }} />
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null) }} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} style={{ color: '#fff' }} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => logoRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--surface2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text3)' }}>
                    <Upload size={16} />
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Upload</span>
                  </button>
                )}
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  Upload logo for AI brand analysis.<br />
                  PNG or SVG recommended. AI will extract colors and personality.
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>STYLE NOTES (OPTIONAL)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
                placeholder="e.g. Bold and aggressive, large logo on sides, flame graphics, dark background with neon accents..."
                value={styleNotes}
                onChange={e => setStyleNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Next: Text Options <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Text Options ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Text Options</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            Choose your font. Text will be composited onto the design using your brand colors.
          </p>

          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 10 }}>SELECT FONT</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {FONTS.map(f => (
              <div
                key={f.value}
                onClick={() => setFontChoice(f.value)}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  border: fontChoice === f.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: fontChoice === f.value ? 'rgba(79,127,255,0.06)' : 'var(--surface2)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {f.label}
                  {fontChoice === f.value && <Check size={10} style={{ color: 'var(--accent)', marginLeft: 6, display: 'inline' }} />}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 900, color: 'var(--text1)',
                  fontFamily: `${f.value}, Impact, Arial Black, sans-serif`,
                  lineHeight: 1, letterSpacing: '-0.01em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {companyName || f.preview}
                </div>
              </div>
            ))}
          </div>

          {/* Text preview */}
          <div style={{
            marginTop: 20, padding: 20, borderRadius: 10,
            background: 'linear-gradient(135deg, #1a56f0 0%, #0d0f14 100%)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Text Preview
            </div>
            <div style={{
              fontSize: 32, fontWeight: 900, color: brandColors[0] || '#fff',
              fontFamily: `${fontChoice}, Impact, Arial Black, sans-serif`,
              lineHeight: 1.1, textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
              marginBottom: 4,
            }}>
              {companyName || 'COMPANY NAME'}
            </div>
            {tagline && (
              <div style={{
                fontSize: 15, fontWeight: 400, color: brandColors[1] || '#ccc',
                fontFamily: `${fontChoice}, Impact, Arial Black, sans-serif`,
                marginBottom: 6,
              }}>
                {tagline}
              </div>
            )}
            <div style={{ fontSize: 13, color: brandColors[1] || '#aaa', fontFamily: 'sans-serif' }}>
              {[phone, website].filter(Boolean).join('  |  ')}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(4)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Next: Generate <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Generate ─────────────────────────────────────────────────── */}
      {step === 4 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Generate AI Mockup</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            AI will analyze your brand, create custom artwork, add your text, and apply photorealism.
          </p>

          {/* Summary */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>VEHICLE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{selectedTemplate?.make} {selectedTemplate?.model}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{selectedTemplate?.year_start}–{selectedTemplate?.year_end}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>COMPANY</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{companyName || '(not set)'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{industry || 'No industry'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>BRAND COLORS</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {brandColors.map((c, i) => <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>FONT</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: `${fontChoice}, Impact, sans-serif` }}>
                {fontChoice}
              </div>
            </div>
          </div>

          {/* Pipeline progress */}
          {generating && (
            <div style={{ marginBottom: 20 }}>
              {PIPELINE_STEPS.map((ps, i) => {
                const done = pipelineStep > i
                const active = pipelineStep === i
                return (
                  <div key={ps.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < PIPELINE_STEPS.length - 1 ? '1px solid var(--border)' : 'none', opacity: pipelineStep < i ? 0.35 : 1, transition: 'opacity 0.3s' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done
                        ? <Check size={13} style={{ color: 'var(--green)' }} />
                        : active
                          ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                          : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)' }}>
                      {ps.icon} {ps.label}
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
            <button onClick={() => setStep(3)} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: generating ? 0.4 : 1 }}>
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '11px 28px', borderRadius: 8,
                background: generating ? 'rgba(79,127,255,0.5)' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 14, fontWeight: 800, border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
                boxShadow: generating ? 'none' : '0 4px 20px rgba(79,127,255,0.4)',
                letterSpacing: '0.01em',
              }}
            >
              {generating
                ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                : <><Sparkles size={16} /> Generate AI Mockup</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Result ───────────────────────────────────────────────────── */}
      {step === 5 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* Result header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={15} style={{ color: 'var(--accent)' }} />
                Concept Ready
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {selectedTemplate?.make} {selectedTemplate?.model} · {companyName || 'Custom Wrap'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button onClick={() => { setStep(4); handleGenerate() }} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <RefreshCw size={11} /> Regenerate
              </button>
              <button onClick={() => setStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <Type size={11} /> Adjust Text
              </button>
              <button onClick={handleDownloadConcept} disabled={!conceptImageUrl} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.3)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Download size={11} /> Download Concept
              </button>
            </div>
          </div>

          {/* Mockup image */}
          <div style={{ padding: 20 }}>
            {conceptImageUrl ? (
              <div style={{ position: 'relative', cursor: zoomed ? 'zoom-out' : 'zoom-in' }} onClick={() => setZoomed(!zoomed)}>
                <img
                  src={conceptImageUrl}
                  alt="Vehicle wrap concept"
                  style={{
                    width: '100%', borderRadius: 10,
                    border: '1px solid var(--border)',
                    display: 'block',
                    maxHeight: zoomed ? 'none' : 480,
                    objectFit: zoomed ? 'contain' : 'cover',
                    transition: 'max-height 0.3s',
                  }}
                />
                <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {zoomed ? <ZoomOut size={10} /> : <ZoomIn size={10} />}
                  {zoomed ? 'Click to collapse' : 'Click to zoom'}
                </div>
              </div>
            ) : (
              <div style={{ height: 320, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text3)' }}>
                <ImageIcon size={36} />
                <div>No concept image available</div>
              </div>
            )}

            {/* Flat artwork preview */}
            {mockupStatus?.flat_design_url && mockupStatus.flat_design_url !== conceptImageUrl && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flat Artwork (No Text)</div>
                <img src={mockupStatus.flat_design_url} alt="Flat wrap design" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>

          {/* Approve section */}
          <div style={{ margin: '0 20px 20px', padding: 20, borderRadius: 10, background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)' }}>
            {!printUrl ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThumbsUp size={14} style={{ color: 'var(--green)' }} />
                  Approve & Create Print Files
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.5 }}>
                  Approve this concept to generate upscaled (4x) print-ready files. This triggers Real-ESRGAN upscaling and creates a print-ready PDF with 0.125" bleed at 300 DPI.
                </div>

                {/* Approve progress */}
                {approving && (
                  <div style={{ marginBottom: 16 }}>
                    {APPROVE_STEPS.map((as, i) => {
                      const done = approveStep > i
                      const active = approveStep === i
                      return (
                        <div key={as.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', opacity: approveStep < i ? 0.35 : 1 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {done ? <Check size={11} style={{ color: 'var(--green)' }} /> : active ? <Loader2 size={11} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>{i + 1}</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)' }}>
                            {as.icon} {as.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {approveError && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', fontSize: 12, color: 'var(--red)' }}>
                    {approveError}
                  </div>
                )}

                <button
                  onClick={handleApprove}
                  disabled={approving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 22px', borderRadius: 8,
                    background: approving ? 'rgba(34,192,122,0.3)' : 'var(--green)',
                    color: '#fff', fontSize: 13, fontWeight: 800, border: 'none',
                    cursor: approving ? 'not-allowed' : 'pointer',
                    boxShadow: approving ? 'none' : '0 4px 16px rgba(34,192,122,0.3)',
                  }}
                >
                  {approving ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><ThumbsUp size={14} /> Approve & Create Print Files</>}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} style={{ color: 'var(--green)' }} /> Print Files Ready!
                </div>

                {/* Print specs badge */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {['300 DPI', 'CMYK-ready', '0.125" bleed', 'PDF/X'].map(spec => (
                    <span key={spec} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(34,192,122,0.12)', border: '1px solid rgba(34,192,122,0.3)', color: 'var(--green)' }}>
                      {spec}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={handleDownloadPrint} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8, background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,192,122,0.3)' }}>
                    <Printer size={14} /> Download Print-Ready PDF
                  </button>
                  {upscaledUrl && (
                    <button onClick={() => { const a = document.createElement('a'); a.href = upscaledUrl; a.download = `wrap-upscaled-${Date.now()}.png`; a.click() }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Download size={12} /> Download Upscaled PNG
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={reset} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Start New Mockup
            </button>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              ID: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{mockupId?.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
