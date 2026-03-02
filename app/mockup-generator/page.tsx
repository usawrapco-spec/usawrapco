'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wand2, Car, Building2, Palette, ChevronRight, ChevronLeft,
  Download, RefreshCw, Save, Check, Loader2, Upload, X,
  Sparkles, ImageIcon, Search,
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

const INDUSTRIES = [
  'Food & Beverage', 'Construction', 'Landscaping', 'Plumbing', 'HVAC',
  'Electrical', 'Cleaning', 'Delivery', 'Real Estate', 'Healthcare',
  'Technology', 'Retail', 'Auto Services', 'Security', 'Other',
]

const STEPS = [
  { id: 1, label: 'Vehicle',  icon: Car },
  { id: 2, label: 'Brand',    icon: Building2 },
  { id: 3, label: 'Generate', icon: Sparkles },
  { id: 4, label: 'Result',   icon: ImageIcon },
]

const PROGRESS_STEPS = [
  { key: 'brand',   label: 'Analyzing brand…' },
  { key: 'design',  label: 'Designing wrap graphic…' },
  { key: 'compose', label: 'Compositing to vehicle…' },
  { key: 'done',    label: 'Finalizing…' },
]

export default function MockupGeneratorPage() {
  const supabase = createClient()

  // Step
  const [step, setStep] = useState(1)

  // Step 1 — Template
  const [templates, setTemplates]       = useState<VehicleTemplate[]>([])
  const [templatesLoading, setTLoading] = useState(true)
  const [templateSearch, setTSearch]    = useState('')
  const [selectedTemplate, setTemplate] = useState<VehicleTemplate | null>(null)

  // Step 2 — Brand
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry]       = useState('')
  const [brandColors, setBrandColors] = useState(['#1a56f0', '#ffffff', '#f59e0b'])
  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [styleNotes, setStyleNotes]   = useState('')
  const logoRef = useRef<HTMLInputElement>(null)

  // Step 3 — Generating
  const [generating,    setGenerating]    = useState(false)
  const [progressStep,  setProgressStep]  = useState(0)
  const [progressTimer, setProgressTimer] = useState<ReturnType<typeof setInterval> | null>(null)

  // Step 4 — Result
  const [mockupUrl,  setMockupUrl]  = useState<string | null>(null)
  const [mockupId,   setMockupId]   = useState<string | null>(null)
  const [flatUrl,    setFlatUrl]    = useState<string | null>(null)
  const [genError,   setGenError]   = useState<string | null>(null)
  const [savedToJob, setSavedToJob] = useState(false)

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
  }, [])

  const filteredTemplates = templates.filter(t => {
    const q = templateSearch.toLowerCase()
    return !q || t.make.toLowerCase().includes(q) || t.model.toLowerCase().includes(q)
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setLogoFile(f)
      setLogoPreview(URL.createObjectURL(f))
    }
  }

  // Upload logo to temp storage and get URL, or use data URL
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
        contentType: logoFile.type,
        upsert: true,
      })
      if (error) return null
      const { data } = supabase.storage.from('project-files').getPublicUrl(path)
      return data.publicUrl
    } catch {
      return null
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate) return
    setGenerating(true)
    setGenError(null)
    setProgressStep(0)

    // Advance progress steps on a timer
    let ps = 0
    const timer = setInterval(() => {
      ps = Math.min(ps + 1, PROGRESS_STEPS.length - 1)
      setProgressStep(ps)
    }, 6000)
    setProgressTimer(timer)

    try {
      const logoUrl = await getLogoUrl()

      const res = await fetch('/api/mockup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id:  selectedTemplate.id,
          brand_colors: brandColors,
          logo_url:     logoUrl,
          company_name: companyName,
          industry,
          style_notes:  styleNotes,
        }),
      })
      const data = await res.json()
      clearInterval(timer)
      setProgressTimer(null)

      if (!res.ok) {
        setGenError(data.error || 'Generation failed')
        setGenerating(false)
        return
      }
      setMockupUrl(data.mockup_url)
      setMockupId(data.mockup_id)
      setFlatUrl(data.flat_design_url)
      setProgressStep(PROGRESS_STEPS.length)
      setGenerating(false)
      setStep(4)
    } catch (err: any) {
      clearInterval(timer)
      setProgressTimer(null)
      setGenError(err.message || 'Generation failed')
      setGenerating(false)
    }
  }

  function handleRegenerate() {
    setMockupUrl(null)
    setMockupId(null)
    setFlatUrl(null)
    setSavedToJob(false)
    setGenError(null)
    setStep(3)
    handleGenerate()
  }

  function handleDownload() {
    if (!mockupUrl) return
    const a = document.createElement('a')
    a.href = mockupUrl
    a.download = `mockup-${selectedTemplate?.make}-${selectedTemplate?.model}-${Date.now()}.png`
    a.click()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text1)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Wand2 size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
          }}>
            AI Mockup Generator
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Generate professional vehicle wrap mockups using AI in under a minute.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8,
                background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
                border: active ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                cursor: done ? 'pointer' : 'default',
              }}
                onClick={() => { if (done && !generating) setStep(s.id) }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {done
                    ? <Check size={13} style={{ color: '#fff' }} />
                    : <Icon size={13} style={{ color: active ? '#fff' : 'var(--text3)' }} />
                  }
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} style={{ color: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Template ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Select Vehicle Template</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            Choose the vehicle type that matches your client's vehicle.
          </p>

          {/* Search */}
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
                {templates.length === 0 ? 'No templates uploaded yet' : 'No templates match your search'}
              </div>
              {templates.length === 0 && (
                <div style={{ fontSize: 12 }}>
                  Go to <a href="/admin/templates" style={{ color: 'var(--accent)' }}>Admin → Templates</a> to upload vehicle base images.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filteredTemplates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setTemplate(t)}
                  style={{
                    border: selectedTemplate?.id === t.id
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: selectedTemplate?.id === t.id ? 'rgba(79,127,255,0.05)' : 'var(--surface2)',
                    transition: 'border-color 0.15s',
                    position: 'relative',
                  }}
                >
                  <div style={{ height: 120, overflow: 'hidden', background: 'var(--bg)' }}>
                    {t.thumbnail_url
                      ? <img src={t.thumbnail_url} alt={`${t.make} ${t.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Car size={28} style={{ color: 'var(--text3)' }} /></div>
                    }
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{t.make} {t.model}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.year_start}–{t.year_end}{t.sqft ? ` · ${t.sqft} sqft` : ''}</div>
                  </div>
                  {selectedTemplate?.id === t.id && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={11} style={{ color: '#fff' }} />
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
              Next: Brand Setup
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Brand ───────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Brand Setup</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
            Tell us about the brand so AI can create the perfect design.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Company Name */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>COMPANY NAME</label>
              <input
                style={inputStyle}
                placeholder="e.g. Pacific Northwest Plumbing"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>

            {/* Industry */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>INDUSTRY</label>
              <select
                style={{ ...inputStyle, appearance: 'none' }}
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Brand Colors */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>BRAND COLORS</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {brandColors.map((c, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <input
                      type="color"
                      value={c}
                      onChange={e => {
                        const next = [...brandColors]
                        next[i] = e.target.value
                        setBrandColors(next)
                      }}
                      style={{
                        width: 44, height: 44, borderRadius: 8,
                        border: '2px solid var(--border)',
                        cursor: 'pointer', padding: 0, background: 'none',
                      }}
                    />
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {c.toUpperCase()}
                    </span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
                  Primary · Secondary · Accent
                </div>
              </div>
            </div>

            {/* Logo upload */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>LOGO (OPTIONAL)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {logoPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={logoPreview} alt="Logo" style={{
                      width: 80, height: 80, objectFit: 'contain',
                      borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--surface2)',
                    }} />
                    <button
                      onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'var(--red)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={10} style={{ color: '#fff' }} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => logoRef.current?.click()}
                    style={{
                      width: 80, height: 80, borderRadius: 8,
                      border: '2px dashed var(--border)',
                      background: 'var(--surface2)',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 4, color: 'var(--text3)',
                    }}
                  >
                    <Upload size={18} />
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Upload</span>
                  </button>
                )}
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                  Upload your logo for AI to analyze brand identity.<br />
                  PNG or SVG recommended.
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </div>

            {/* Style notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>STYLE NOTES (OPTIONAL)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
                placeholder="e.g. Bold and masculine, blue and silver color scheme, large logo on sides, flame graphics..."
                value={styleNotes}
                onChange={e => setStyleNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 8,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 22px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff',
                fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              }}
            >
              Next: Generate
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Generate ────────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Generate Mockup</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
            AI will analyze your brand, create a custom wrap design, and composite it onto the vehicle.
          </p>

          {/* Summary */}
          <div style={{
            background: 'var(--surface2)', borderRadius: 10,
            padding: 16, marginBottom: 24,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>VEHICLE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                {selectedTemplate?.make} {selectedTemplate?.model}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {selectedTemplate?.year_start}–{selectedTemplate?.year_end}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>COMPANY</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                {companyName || 'Not specified'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{industry || 'No industry'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>BRAND COLORS</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {brandColors.map((c, i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
            {logoPreview && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>LOGO</div>
                <img src={logoPreview} alt="Logo" style={{ height: 32, objectFit: 'contain' }} />
              </div>
            )}
          </div>

          {/* Progress */}
          {generating && (
            <div style={{ marginBottom: 24 }}>
              {PROGRESS_STEPS.map((ps, i) => {
                const done = progressStep > i
                const active = progressStep === i
                return (
                  <div key={ps.key} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < PROGRESS_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
                    opacity: progressStep < i ? 0.35 : 1,
                    transition: 'opacity 0.3s',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: done ? 'rgba(34,192,122,0.15)' : active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done
                        ? <Check size={13} style={{ color: 'var(--green)' }} />
                        : active
                          ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                          : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)',
                    }}>
                      {ps.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {genError && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
              fontSize: 13, color: 'var(--red)',
            }}>
              {genError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(2)}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 8,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: generating ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 8,
                background: 'linear-gradient(135deg, var(--accent), #6d28d9)',
                color: '#fff', fontSize: 13, fontWeight: 700, border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(79,127,255,0.3)',
              }}
            >
              {generating
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : <><Sparkles size={15} /> Generate Mockup</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* Result header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                Mockup Complete
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {selectedTemplate?.make} {selectedTemplate?.model} · {companyName || 'Custom Wrap'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRegenerate}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} />
                Regenerate
              </button>
              <button
                onClick={handleDownload}
                disabled={!mockupUrl}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  background: 'var(--green)', color: '#fff',
                  fontSize: 12, fontWeight: 700, border: 'none',
                  cursor: mockupUrl ? 'pointer' : 'not-allowed',
                  opacity: mockupUrl ? 1 : 0.5,
                }}
              >
                <Download size={13} />
                Download
              </button>
              <button
                onClick={() => { setSavedToJob(true) }}
                disabled={savedToJob}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  background: savedToJob ? 'rgba(34,192,122,0.15)' : 'var(--accent)',
                  color: savedToJob ? 'var(--green)' : '#fff',
                  border: savedToJob ? '1px solid rgba(34,192,122,0.3)' : 'none',
                  fontSize: 12, fontWeight: 700, cursor: savedToJob ? 'default' : 'pointer',
                }}
              >
                {savedToJob ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save to Job</>}
              </button>
            </div>
          </div>

          {/* Mockup image */}
          <div style={{ padding: 20 }}>
            {mockupUrl ? (
              <img
                src={mockupUrl}
                alt="Vehicle wrap mockup"
                style={{
                  width: '100%', borderRadius: 10,
                  border: '1px solid var(--border)',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{
                height: 360, borderRadius: 10, background: 'var(--surface2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, color: 'var(--text3)',
              }}>
                <ImageIcon size={40} />
                <div style={{ fontSize: 14 }}>No mockup image available</div>
                {flatUrl && (
                  <div style={{ fontSize: 12 }}>
                    <a href={flatUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                      View flat design instead
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Flat design preview */}
            {flatUrl && flatUrl !== mockupUrl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Flat Wrap Design
                </div>
                <img
                  src={flatUrl}
                  alt="Flat wrap design"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
            )}
          </div>

          {/* Actions footer */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button
              onClick={() => { setStep(1); setTemplate(null); setMockupUrl(null); setFlatUrl(null); setMockupId(null); setSavedToJob(false) }}
              style={{
                fontSize: 12, color: 'var(--accent)', background: 'none',
                border: 'none', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Start New Mockup
            </button>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Mockup ID: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{mockupId?.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
