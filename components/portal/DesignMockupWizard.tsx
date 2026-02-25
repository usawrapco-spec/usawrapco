'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, ArrowLeft, Globe, Upload, Palette,
  Car, Truck, Bus, Sparkles, Lock, Check,
  CreditCard, Loader2, ImageIcon, Zap, PenTool, FileCheck,
  RefreshCw, Star, Shield, Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ── Constants ──────────────────────────────────────────────────────────────── */

const INDUSTRIES = [
  'Contractor / Construction', 'Food & Beverage', 'Medical / Health',
  'Retail / E-Commerce', 'Real Estate', 'Landscaping / Lawn Care',
  'Plumbing / HVAC', 'Electrical', 'Cleaning / Janitorial',
  'Auto / Mechanical', 'Technology', 'Fitness / Sports',
  'Non-Profit', 'Government', 'Other',
]

const VEHICLE_TYPES = [
  { id: 'car', label: 'Car / Sedan', icon: Car },
  { id: 'truck', label: 'Pickup Truck', icon: Truck },
  { id: 'van', label: 'Cargo Van', icon: Truck },
  { id: 'sprinter', label: 'Sprinter Van', icon: Bus },
  { id: 'box_truck', label: 'Box Truck', icon: Truck },
  { id: 'trailer', label: 'Trailer', icon: Truck },
]

const WRAP_STYLES = [
  { id: 'full', label: 'Full Wrap', desc: 'Complete vehicle coverage' },
  { id: 'partial', label: 'Partial Wrap', desc: 'Strategic coverage areas' },
  { id: 'color_change', label: 'Color Change', desc: 'Full color transformation' },
  { id: 'lettering', label: 'Lettering Only', desc: 'Text and logo decals' },
]

const STYLE_CARDS = [
  { id: 'modern_clean', label: 'Modern & Clean', desc: 'Minimalist design with plenty of whitespace, clean lines, and a refined look', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'bold_aggressive', label: 'Bold & Aggressive', desc: 'High contrast, angular shapes, racing-inspired with strong visual impact', gradient: 'linear-gradient(135deg, #f5515f 0%, #a1051d 100%)' },
  { id: 'luxury_premium', label: 'Luxury & Premium', desc: 'Elegant, refined design with metallic accents and premium materials feel', gradient: 'linear-gradient(135deg, #c6a961 0%, #8b6914 100%)' },
  { id: 'fun_playful', label: 'Fun & Playful', desc: 'Vibrant colors, dynamic shapes, energetic and approachable', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'corporate_professional', label: 'Corporate & Professional', desc: 'Business-focused, trustworthy, clean branding with authority', gradient: 'linear-gradient(135deg, #4f7fff 0%, #1a3a8f 100%)' },
]

const PRICE_RANGES: Record<string, Record<string, string>> = {
  car:       { full: '$2,500 - $3,500', partial: '$1,200 - $2,000', color_change: '$2,800 - $4,500', lettering: '$500 - $1,200' },
  truck:     { full: '$3,000 - $4,500', partial: '$1,500 - $2,500', color_change: '$3,500 - $5,000', lettering: '$600 - $1,500' },
  van:       { full: '$3,500 - $5,000', partial: '$1,800 - $3,000', color_change: '$4,000 - $6,000', lettering: '$700 - $1,500' },
  sprinter:  { full: '$4,000 - $6,000', partial: '$2,000 - $3,500', color_change: '$4,500 - $7,000', lettering: '$800 - $1,800' },
  box_truck: { full: '$5,000 - $8,000', partial: '$2,500 - $4,000', color_change: '$5,500 - $9,000', lettering: '$1,000 - $2,500' },
  trailer:   { full: '$3,500 - $6,000', partial: '$2,000 - $3,500', color_change: '$4,000 - $7,000', lettering: '$800 - $2,000' },
}

const LOADING_MESSAGES = [
  'Analyzing your brand identity...',
  'Selecting the perfect color palette...',
  'Mapping the vehicle template...',
  'Positioning your logo and graphics...',
  'Applying wrap textures and finishes...',
  'Rendering photorealistic lighting...',
  'Adding finishing touches...',
  'Almost ready...',
]

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface FormData {
  businessName: string
  industry: string
  websiteUrl: string
  logoUrl: string
  logoFile: File | null
  brandColors: string[]
  vehicleType: string
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  wrapStyle: string
  stylePreference: string
  primaryMessage: {
    businessName: string
    phone: string
    website: string
    tagline: string
  }
  email: string
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text1)',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Barlow Condensed, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    color: 'var(--text1)',
  },
  main: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '40px 20px 80px',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: 'Barlow Condensed, sans-serif',
    color: 'var(--text1)',
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    color: 'var(--text3)',
    marginBottom: 32,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text1)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text1)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 20,
  },
  btn: {
    padding: '14px 28px',
    borderRadius: 10,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex' as const,
    alignItems: 'center',
    gap: 8,
  },
  btnOutline: {
    padding: '14px 28px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text2)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex' as const,
    alignItems: 'center',
    gap: 8,
  },
  fieldGroup: {
    marginBottom: 20,
  },
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function DesignMockupWizard() {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    businessName: '',
    industry: '',
    websiteUrl: '',
    logoUrl: '',
    logoFile: null,
    brandColors: ['#4f7fff'],
    vehicleType: 'van',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    wrapStyle: 'full',
    stylePreference: 'modern_clean',
    primaryMessage: { businessName: '', phone: '', website: '', tagline: '' },
    email: '',
  })

  // Generation state
  const [mockupId, setMockupId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [progress, setProgress] = useState(0)
  const [mockupUrls, setMockupUrls] = useState<string[]>([])
  const progressRef = useRef(0)
  const [error, setError] = useState('')

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'loading'>('pending')
  const [checkingPayment, setCheckingPayment] = useState(false)

  // Scraping state
  const [scraping, setScraping] = useState(false)
  const [websiteData, setWebsiteData] = useState<any>(null)

  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Check URL params for returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returnedMockupId = params.get('mockupId')
    const payment = params.get('payment')

    if (returnedMockupId && payment === 'success') {
      setMockupId(returnedMockupId)
      setPaymentStatus('paid')
      setStep(5)
      loadMockup(returnedMockupId)
    } else if (returnedMockupId) {
      setMockupId(returnedMockupId)
      loadMockup(returnedMockupId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMockup = async (id: string) => {
    const { data } = await supabase
      .from('design_mockups')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      if (data.mockup_urls?.length) setMockupUrls(data.mockup_urls)
      if (data.payment_status === 'paid') {
        setPaymentStatus('paid')
        setStep(5)
      } else if (data.mockup_urls?.length) {
        setStep(4) // paywall
      }
      setForm(prev => ({
        ...prev,
        businessName: data.business_name || prev.businessName,
        vehicleType: data.vehicle_type || prev.vehicleType,
        wrapStyle: data.wrap_style || prev.wrapStyle,
        stylePreference: data.style_preference || prev.stylePreference,
        brandColors: data.brand_colors || prev.brandColors,
      }))
    }
  }

  // Animated loading messages
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [generating])

  // Animated progress bar
  useEffect(() => {
    if (!generating) { progressRef.current = 0; return }
    setProgress(0)
    progressRef.current = 0
    const interval = setInterval(() => {
      if (progressRef.current >= 92) return
      const next = progressRef.current + Math.random() * 3
      progressRef.current = next
      setProgress(next)
    }, 500)
    return () => clearInterval(interval)
  }, [generating])

  const update = (key: keyof FormData, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const updateMessage = (key: string, val: string) => {
    setForm(prev => ({
      ...prev,
      primaryMessage: { ...prev.primaryMessage, [key]: val },
    }))
  }

  /* ── Website Scraping ──────────────────────────────────────────────────────── */

  const scrapeWebsite = async () => {
    if (!form.websiteUrl) return
    setScraping(true)
    try {
      const res = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.websiteUrl }),
      })
      const json = await res.json()
      if (json.data) {
        const d = json.data
        setWebsiteData(d)
        if (d.companyName && !form.businessName) update('businessName', d.companyName)
        if (d.colors?.length) {
          const hexes = d.colors.map((c: any) => typeof c === 'string' ? c : c.hex).filter(Boolean).slice(0, 4)
          if (hexes.length) update('brandColors', hexes)
        }
        if (d.logoUrl && !form.logoUrl) update('logoUrl', d.logoUrl)
        if (d.phone) updateMessage('phone', d.phone)
        if (d.tagline) updateMessage('tagline', d.tagline)
      }
    } catch { /* silent */ }
    setScraping(false)
  }

  /* ── Logo Upload ───────────────────────────────────────────────────────────── */

  const handleLogoUpload = async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `design-mockups/logos/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
        update('logoUrl', publicUrl)
      }
    } catch { /* silent */ }
    setUploading(false)
  }

  /* ── Generation Flow ───────────────────────────────────────────────────────── */

  const startGeneration = async () => {
    setGenerating(true)
    setError('')
    setStep(3.5) // loading screen

    try {
      // 1. Create mockup record
      const { data: mockup, error: insertErr } = await supabase
        .from('design_mockups')
        .insert({
          business_name: form.businessName,
          industry: form.industry,
          website_url: form.websiteUrl,
          logo_url: form.logoUrl,
          brand_colors: form.brandColors,
          vehicle_type: form.vehicleType,
          vehicle_year: form.vehicleYear,
          vehicle_make: form.vehicleMake,
          vehicle_model: form.vehicleModel,
          wrap_style: form.wrapStyle,
          style_preference: form.stylePreference,
          primary_message: form.primaryMessage,
          email: form.email,
        })
        .select('id')
        .single()

      if (insertErr || !mockup) throw new Error('Failed to save design request')
      setMockupId(mockup.id)

      // 2. Generate AI prompts via Claude
      const promptRes = await fetch('/api/design-mockup/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          websiteData,
        }),
      })
      const promptData = await promptRes.json()
      if (!promptData.prompts) throw new Error(promptData.error || 'Failed to generate prompts')

      // 3. Launch 3 Replicate generations
      const genRes = await fetch('/api/design-mockup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptData.prompts,
          mockupId: mockup.id,
        }),
      })
      const genData = await genRes.json()
      if (genData.error) throw new Error(genData.error)

      const ids = genData.predictions.map((p: any) => p.id).filter(Boolean)

      // 4. Poll for results
      pollForResults(ids, mockup.id, 0)
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.')
      setGenerating(false)
      setStep(3)
    }
  }

  const pollForResults = async (ids: string[], mId: string, count: number) => {
    if (count > 40) {
      setError('Generation timed out. Please try again.')
      setGenerating(false)
      setStep(3)
      return
    }

    try {
      const res = await fetch(`/api/design-mockup/generate?ids=${ids.join(',')}&mockupId=${mId}`)
      const data = await res.json()

      if (data.allDone) {
        const urls = data.results
          .filter((r: any) => r.imageUrl)
          .map((r: any) => r.imageUrl)

        if (urls.length === 0) {
          setError('All generations failed. Please try again.')
          setGenerating(false)
          setStep(3)
          return
        }

        setMockupUrls(urls)
        setProgress(100)
        setGenerating(false)
        setTimeout(() => setStep(4), 800)
      } else {
        const completed = data.results.filter((r: any) => r.status === 'succeeded' || r.status === 'failed').length
        const pct = Math.min(90, 30 + (completed / ids.length) * 60)
        if (pct > progressRef.current) {
          progressRef.current = pct
          setProgress(pct)
        }
        setTimeout(() => pollForResults(ids, mId, count + 1), 2000)
      }
    } catch {
      setTimeout(() => pollForResults(ids, mId, count + 1), 2000)
    }
  }

  /* ── Stripe Checkout ───────────────────────────────────────────────────────── */

  const handleCheckout = async () => {
    if (!mockupId) return
    setCheckingPayment(true)
    try {
      const res = await fetch('/api/design-mockup/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockupId, email: form.email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Checkout failed')
      }
    } catch {
      setError('Failed to start checkout')
    }
    setCheckingPayment(false)
  }

  /* ── Progress Dots ─────────────────────────────────────────────────────────── */

  const ProgressDots = ({ current }: { current: number }) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
      {[1, 2, 3].map(s => (
        <div
          key={s}
          style={{
            width: s === current ? 32 : 10,
            height: 10,
            borderRadius: 5,
            background: s <= current ? 'var(--accent)' : 'var(--surface2)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )

  /* ── Step 1: Business Info ─────────────────────────────────────────────────── */

  const renderStep1 = () => (
    <div>
      <ProgressDots current={1} />
      <h1 style={S.stepTitle}>Tell us about your business</h1>
      <p style={S.stepSub}>We will use this to create a custom wrap design tailored to your brand.</p>

      <div style={S.fieldGroup}>
        <label style={S.label}>Business Name *</label>
        <input
          value={form.businessName}
          onChange={e => update('businessName', e.target.value)}
          placeholder="e.g. Smith Plumbing Co."
          style={S.input}
        />
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Industry</label>
        <select
          value={form.industry}
          onChange={e => update('industry', e.target.value)}
          style={S.select}
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Website URL (optional - we will auto-extract your brand)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={form.websiteUrl}
            onChange={e => update('websiteUrl', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scrapeWebsite()}
            placeholder="https://your-website.com"
            style={{ ...S.input, flex: 1 }}
          />
          <button
            onClick={scrapeWebsite}
            disabled={!form.websiteUrl || scraping}
            style={{
              ...S.btn,
              padding: '12px 16px',
              background: form.websiteUrl && !scraping ? 'var(--accent)' : 'var(--surface2)',
              color: form.websiteUrl && !scraping ? '#fff' : 'var(--text3)',
              cursor: form.websiteUrl && !scraping ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            <Globe size={14} />
            {scraping ? 'Scanning...' : 'Scan'}
          </button>
        </div>
        {websiteData && (
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)',
            fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Check size={12} /> Brand data extracted from {form.websiteUrl}
          </div>
        )}
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Logo (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleLogoUpload(file)
          }}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {form.logoUrl ? (
            <div style={{
              width: 60, height: 60, borderRadius: 10, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '1px solid var(--border)',
            }}>
              <img
                src={form.logoUrl}
                alt="Logo"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          ) : null}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              ...S.btnOutline,
              padding: '10px 16px',
              fontSize: 13,
            }}
          >
            <Upload size={14} />
            {uploading ? 'Uploading...' : form.logoUrl ? 'Change Logo' : 'Upload Logo'}
          </button>
        </div>
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Brand Colors (up to 4)</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {form.brandColors.map((c, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <input
                type="color"
                value={c}
                onChange={e => {
                  const updated = [...form.brandColors]
                  updated[i] = e.target.value
                  update('brandColors', updated)
                }}
                style={{
                  width: 44, height: 44, border: 'none', borderRadius: 10,
                  cursor: 'pointer', padding: 0, background: 'none',
                }}
              />
              {form.brandColors.length > 1 && (
                <button
                  onClick={() => update('brandColors', form.brandColors.filter((_: string, j: number) => j !== i))}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--red)', color: '#fff', border: 'none',
                    fontSize: 10, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                  }}
                >
                  x
                </button>
              )}
            </div>
          ))}
          {form.brandColors.length < 4 && (
            <button
              onClick={() => update('brandColors', [...form.brandColors, '#22c07a'])}
              style={{
                width: 44, height: 44, borderRadius: 10,
                border: '2px dashed var(--border)', background: 'transparent',
                color: 'var(--text3)', cursor: 'pointer', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Email (to receive your designs)</label>
        <input
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          placeholder="you@company.com"
          style={S.input}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button
          onClick={() => setStep(2)}
          disabled={!form.businessName}
          style={{
            ...S.btn,
            opacity: form.businessName ? 1 : 0.5,
            cursor: form.businessName ? 'pointer' : 'default',
          }}
        >
          Next: Vehicle Info <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )

  /* ── Step 2: Vehicle Info ──────────────────────────────────────────────────── */

  const renderStep2 = () => (
    <div>
      <ProgressDots current={2} />
      <h1 style={S.stepTitle}>What are we wrapping?</h1>
      <p style={S.stepSub}>Select your vehicle type and tell us what you are working with.</p>

      <div style={S.fieldGroup}>
        <label style={S.label}>Vehicle Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {VEHICLE_TYPES.map(v => {
            const Icon = v.icon
            const selected = form.vehicleType === v.id
            return (
              <button
                key={v.id}
                onClick={() => update('vehicleType', v.id)}
                style={{
                  padding: '16px 10px',
                  borderRadius: 12,
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={24} style={{ color: selected ? 'var(--accent)' : 'var(--text3)' }} />
                <span style={{
                  fontSize: 12, fontWeight: 700, textAlign: 'center',
                  color: selected ? 'var(--accent)' : 'var(--text2)',
                }}>
                  {v.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={S.label}>Year</label>
          <input
            value={form.vehicleYear}
            onChange={e => update('vehicleYear', e.target.value)}
            placeholder="2024"
            style={S.input}
          />
        </div>
        <div>
          <label style={S.label}>Make</label>
          <input
            value={form.vehicleMake}
            onChange={e => update('vehicleMake', e.target.value)}
            placeholder="Ford"
            style={S.input}
          />
        </div>
        <div>
          <label style={S.label}>Model</label>
          <input
            value={form.vehicleModel}
            onChange={e => update('vehicleModel', e.target.value)}
            placeholder="Transit"
            style={S.input}
          />
        </div>
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Wrap Coverage</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {WRAP_STYLES.map(w => {
            const selected = form.wrapStyle === w.id
            return (
              <button
                key={w.id}
                onClick={() => update('wrapStyle', w.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: selected ? 'var(--accent)' : 'var(--text1)',
                  marginBottom: 2,
                }}>
                  {w.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{w.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <button onClick={() => setStep(1)} style={S.btnOutline}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => setStep(3)} style={S.btn}>
          Next: Style <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )

  /* ── Step 3: Style Preference ──────────────────────────────────────────────── */

  const renderStep3 = () => (
    <div>
      <ProgressDots current={3} />
      <h1 style={S.stepTitle}>Your vibe</h1>
      <p style={S.stepSub}>Pick a design direction and tell us what to feature on the wrap.</p>

      <div style={S.fieldGroup}>
        <label style={S.label}>Design Style</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STYLE_CARDS.map(s => {
            const selected = form.stylePreference === s.id
            return (
              <button
                key={s.id}
                onClick={() => update('stylePreference', s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'rgba(79,127,255,0.06)' : 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: s.gradient,
                }} />
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: selected ? 'var(--accent)' : 'var(--text1)',
                    marginBottom: 2,
                  }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{s.desc}</div>
                </div>
                {selected && <Check size={18} style={{ color: 'var(--accent)', marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <label style={{ ...S.label, marginBottom: 14 }}>
          What should appear on the wrap?
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ ...S.label, fontSize: 10 }}>Business Name</label>
            <input
              value={form.primaryMessage.businessName || form.businessName}
              onChange={e => updateMessage('businessName', e.target.value)}
              placeholder={form.businessName || 'Your Company'}
              style={S.input}
            />
          </div>
          <div>
            <label style={{ ...S.label, fontSize: 10 }}>Phone Number</label>
            <input
              value={form.primaryMessage.phone}
              onChange={e => updateMessage('phone', e.target.value)}
              placeholder="(555) 123-4567"
              style={S.input}
            />
          </div>
          <div>
            <label style={{ ...S.label, fontSize: 10 }}>Website</label>
            <input
              value={form.primaryMessage.website}
              onChange={e => updateMessage('website', e.target.value)}
              placeholder="www.yoursite.com"
              style={S.input}
            />
          </div>
          <div>
            <label style={{ ...S.label, fontSize: 10 }}>Tagline</label>
            <input
              value={form.primaryMessage.tagline}
              onChange={e => updateMessage('tagline', e.target.value)}
              placeholder="Your trusted partner"
              style={S.input}
            />
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 14px', marginBottom: 16, borderRadius: 10,
          background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)',
          fontSize: 13, color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <button onClick={() => setStep(2)} style={S.btnOutline}>
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={startGeneration}
          style={{
            ...S.btn,
            background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
            padding: '14px 32px',
            fontSize: 16,
          }}
        >
          <Sparkles size={18} /> Generate My Wrap Designs
        </button>
      </div>
    </div>
  )

  /* ── Step 3.5: Loading Screen ──────────────────────────────────────────────── */

  const renderLoading = () => (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
        background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <Sparkles size={36} style={{ color: '#fff' }} />
      </div>

      <h1 style={{ ...S.stepTitle, fontSize: 24, marginBottom: 8 }}>
        Our AI is designing your wrap...
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 32, minHeight: 20 }}>
        {LOADING_MESSAGES[loadingMsg]}
      </p>

      <div style={{
        width: '100%', maxWidth: 400, margin: '0 auto 16px',
        height: 6, borderRadius: 3, background: 'var(--surface2)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: 'linear-gradient(90deg, var(--accent), #7c3aed)',
          width: `${progress}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
        {Math.round(progress)}%
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 40 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            aspectRatio: '4/3', borderRadius: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '60%', height: '60%', borderRadius: 8,
              background: 'linear-gradient(135deg, var(--surface2) 0%, var(--surface) 50%, var(--surface2) 100%)',
              backgroundSize: '200% 200%',
              animation: `shimmer 1.5s ease-in-out infinite ${i * 0.3}s`,
            }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )

  /* ── Step 4: Paywall ───────────────────────────────────────────────────────── */

  const renderPaywall = () => {
    const priceRange = PRICE_RANGES[form.vehicleType]?.[form.wrapStyle] || '$2,500 - $5,000'

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mockupUrls.length === 1 ? '1fr' : mockupUrls.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}>
          {mockupUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
              <img
                src={url}
                alt={`Design variation ${i + 1}`}
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                  filter: 'blur(12px) brightness(0.7)',
                  transform: 'scale(1.1)',
                }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.6) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={32} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 8, left: 0, right: 0,
                textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                Variation {i + 1}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...S.card, maxWidth: 500, margin: '0 auto' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Eye size={28} style={{ color: '#fff' }} />
          </div>

          <h2 style={{ ...S.stepTitle, fontSize: 22, marginBottom: 8 }}>
            Your wrap designs are ready
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
            {mockupUrls.length} AI-generated concept{mockupUrls.length > 1 ? 's' : ''} for your {form.businessName || 'business'}
          </p>

          <div style={{
            padding: '10px 16px', borderRadius: 8, marginBottom: 20,
            background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)',
            fontSize: 13, color: 'var(--text2)',
          }}>
            Estimated wrap price: <strong style={{ color: 'var(--accent)' }}>{priceRange}</strong>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkingPayment}
            style={{
              ...S.btn,
              width: '100%',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #22c07a 0%, #16a34a 100%)',
              padding: '16px 28px',
              fontSize: 16,
              marginBottom: 20,
            }}
          >
            {checkingPayment ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
            ) : (
              <><CreditCard size={18} /> Unlock Full Designs — $150 Design Deposit</>
            )}
          </button>

          <div style={{ textAlign: 'left' }}>
            {[
              { icon: ImageIcon, text: 'Full resolution mockups (no blur, no watermark)' },
              { icon: PenTool, text: 'Editable design canvas' },
              { icon: Star, text: 'Professional designer refinement' },
              { icon: RefreshCw, text: '2 revision rounds included' },
              { icon: FileCheck, text: 'Print-ready files for production' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: 'rgba(34,192,122,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <item.icon size={14} style={{ color: 'var(--green)' }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            background: 'var(--surface2)', fontSize: 11, color: 'var(--text3)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Shield size={14} style={{ flexShrink: 0 }} />
            <span>$150 deposit is applied toward your wrap project. Secure checkout via Stripe.</span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', marginTop: 16, borderRadius: 10,
            background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.3)',
            fontSize: 13, color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  /* ── Step 5: Post Payment ──────────────────────────────────────────────────── */

  const renderUnlocked = () => (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
          background: 'rgba(34,192,122,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={28} style={{ color: 'var(--green)' }} />
        </div>
        <h1 style={{ ...S.stepTitle, fontSize: 24, color: 'var(--green)' }}>Designs Unlocked</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Your full-resolution wrap mockups are ready. A designer will follow up within 24 hours.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mockupUrls.map((url, i) => (
          <div key={i} style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <img
              src={url}
              alt={`Wrap design ${i + 1}`}
              style={{ width: '100%', display: 'block' }}
            />
            <div style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                Concept {i + 1}
              </span>
              <a
                href={url}
                download={`wrap-design-${i + 1}.jpg`}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12,
                  fontWeight: 700, background: 'var(--accent)', color: '#fff',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        ...S.card, marginTop: 24, textAlign: 'center',
        background: 'rgba(79,127,255,0.06)', borderColor: 'rgba(79,127,255,0.2)',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
          What happens next?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
          Our design team has been notified and will reach out within 24 hours to discuss
          your concepts, gather any additional details, and begin the refinement process.
          You will receive 2 rounds of revisions before final print-ready files.
        </p>
      </div>
    </div>
  )

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.logo}>USA WRAP CO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            AI Design Studio
          </span>
        </div>
      </header>

      <main style={S.main}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 3.5 && renderLoading()}
        {step === 4 && renderPaywall()}
        {step === 5 && renderUnlocked()}
      </main>
    </div>
  )
}
