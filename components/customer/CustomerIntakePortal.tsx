'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, Camera, Paperclip, Search, AlertCircle, Globe, Check, X, Plus, type LucideIcon } from 'lucide-react'
import VinLookupField from '@/components/shared/VinLookupField'
import type { VehicleDecodeResult } from '@/components/shared/VinLookupField'

interface CustomerIntakePortalProps {
  token: string
}

const VEHICLE_SIDES: { key: string; label: string; Icon: LucideIcon; desc: string }[] = [
  { key: 'front', label: 'Front',          Icon: Car,       desc: 'Straight on from the front — include bumper, hood, grille' },
  { key: 'rear',  label: 'Rear',           Icon: RotateCcw, desc: 'Straight on from the back — include bumper, tailgate/hatch' },
  { key: 'left',  label: 'Driver Side',    Icon: ArrowLeft, desc: 'Full left side — stand back far enough to get the whole vehicle' },
  { key: 'right', label: 'Passenger Side', Icon: ArrowRight,desc: 'Full right side — same distance as driver side' },
  { key: 'top',   label: 'Roof (if needed)',Icon: ArrowUp,  desc: 'Optional — only if roof wrap is included in scope' },
]

const WRAP_AREAS = [
  { key: 'full_wrap', label: 'Full Wrap' },
  { key: 'hood', label: 'Hood' },
  { key: 'roof', label: 'Roof' },
  { key: 'trunk', label: 'Trunk / Tailgate' },
  { key: 'doors', label: 'Doors' },
  { key: 'fenders', label: 'Fenders' },
  { key: 'bumpers', label: 'Bumpers' },
  { key: 'rockers', label: 'Rocker Panels' },
  { key: 'mirrors', label: 'Mirrors' },
  { key: 'spoiler', label: 'Spoiler' },
  { key: 'pillars', label: 'Pillars' },
  { key: 'partial_other', label: 'Other / Custom' },
]

const VEHICLE_CONDITIONS = [
  { value: 'excellent', label: 'Excellent — No visible scratches, dents, or paint issues' },
  { value: 'good', label: 'Good — Minor scratches or small dings, paint in good shape' },
  { value: 'fair', label: 'Fair — Some scratches, small dents, or light paint wear' },
  { value: 'poor', label: 'Poor — Significant damage, rust, peeling paint, or dents' },
]

export default function CustomerIntakePortal({ token }: CustomerIntakePortalProps) {
  const [intake, setIntake] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [vinDecoding, setVinDecoding] = useState(false)
  const [vinResult, setVinResult] = useState<string>('')

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    // Vehicle info
    vehicle_vin: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_trim: '',
    vehicle_color: '',
    vehicle_condition: '',
    vehicle_condition_notes: '',
    // Wrap areas
    wrap_areas: [] as string[],
    wrap_type: '' as string,
    // Brand & design
    brand_colors: '',
    brand_fonts: '',
    design_brief: '',
    text_content: '',
    references_notes: '',
    // Removal
    removal_required: false,
    removal_description: '',
    // Existing wrap
    has_existing_wrap: false,
    existing_wrap_description: '',
  })
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([])
  const [logoFiles, setLogoFiles] = useState<any[]>([])
  const [damagePhotos, setDamagePhotos] = useState<any[]>([])

  // ── Branding state ─────────────────────────────────────────────────
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapedData, setScrapedData] = useState<any>(null)
  const [scrapedColors, setScrapedColors] = useState<string[]>([])
  const [useScrapedColors, setUseScrapedColors] = useState<boolean | null>(null)
  const [businessPhotos, setBusinessPhotos] = useState<any[]>([])
  const [inspirationPhotos, setInspirationPhotos] = useState<any[]>([])
  const [noGoPhotos, setNoGoPhotos] = useState<any[]>([])
  const [uploadingBrand, setUploadingBrand] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('customer_intake')
        .select('*')
        .eq('token', token)
        .single()

      if (data) {
        setIntake(data)
        setForm({
          customer_name: data.customer_name || '',
          customer_email: data.customer_email || '',
          customer_phone: data.customer_phone || '',
          vehicle_vin: data.vehicle_vin || '',
          vehicle_year: data.vehicle_year || '',
          vehicle_make: data.vehicle_make || '',
          vehicle_model: data.vehicle_model || '',
          vehicle_trim: data.vehicle_trim || '',
          vehicle_color: data.vehicle_color || '',
          vehicle_condition: data.vehicle_condition || '',
          vehicle_condition_notes: data.vehicle_condition_notes || '',
          wrap_areas: data.wrap_areas || [],
          wrap_type: data.wrap_type || '',
          brand_colors: data.brand_colors || '',
          brand_fonts: data.brand_fonts || '',
          design_brief: data.design_brief || '',
          text_content: data.text_content || '',
          references_notes: data.references_notes || '',
          removal_required: data.removal_required || false,
          removal_description: data.removal_description || '',
          has_existing_wrap: data.has_existing_wrap || false,
          existing_wrap_description: data.existing_wrap_description || '',
        })
        setVehiclePhotos(data.vehicle_photos || [])
        setLogoFiles(data.logo_files || [])
        setDamagePhotos(data.damage_photos || [])
        if (data.completed) setSubmitted(true)
      }
      setLoading(false)
    }
    load()
  }, [token])

  const ff = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }))

  // ── VIN Decode callback ─────────────────────────────────────────────
  function handleVehicleDecoded(data: VehicleDecodeResult) {
    setForm(prev => ({
      ...prev,
      vehicle_year: data.year || prev.vehicle_year,
      vehicle_make: data.make || prev.vehicle_make,
      vehicle_model: data.model || prev.vehicle_model,
      vehicle_trim: data.trim || prev.vehicle_trim,
    }))
    setVinResult(`Found: ${[data.year, data.make, data.model, data.trim].filter(Boolean).join(' ')}`)
  }

  // ── Scrape website ──────────────────────────────────────────────────
  async function scrapeWebsite() {
    if (!websiteUrl) return
    setScraping(true)
    try {
      const res = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      })
      const json = await res.json()
      if (json.data || json.brand) {
        const data = json.data || json.brand
        setScrapedData(data)
        // Auto-fill form fields
        if (data.companyName || data.name) ff('customer_name', data.companyName || data.name || form.customer_name)
        if (data.phone) ff('customer_phone', data.phone || form.customer_phone)
        if (data.email) ff('customer_email', data.email || form.customer_email)
        // Extract colors
        const hexColors = (data.colors || []).map((c: any) => typeof c === 'string' ? c : c.hex).filter(Boolean)
        if (hexColors.length) setScrapedColors(hexColors)
      }
    } catch { /* silently fail */ }
    setScraping(false)
  }

  // ── Upload branding media ────────────────────────────────────────────
  async function uploadBrandPhoto(type: 'business' | 'inspiration' | 'nogo', file: File) {
    if (!intake) return
    setUploadingBrand(type)
    const path = `intake/${intake.project_id}/brand_${type}_${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
      const entry = { url: publicUrl, file_name: file.name, uploaded_at: new Date().toISOString() }
      if (type === 'business') setBusinessPhotos(prev => [...prev, entry])
      else if (type === 'inspiration') setInspirationPhotos(prev => [...prev, entry])
      else setNoGoPhotos(prev => [...prev, entry])
    }
    setUploadingBrand(null)
  }

  // ── Wrap area toggles ─────────────────────────────────────────────
  function toggleWrapArea(key: string) {
    setForm(prev => {
      const areas = prev.wrap_areas.includes(key)
        ? prev.wrap_areas.filter(a => a !== key)
        : key === 'full_wrap'
          ? ['full_wrap']
          : [...prev.wrap_areas.filter(a => a !== 'full_wrap'), key]
      return { ...prev, wrap_areas: areas }
    })
  }

  const uploadPhoto = async (side: string, file: File) => {
    if (!intake) return
    setUploading(side)
    const path = `intake/${intake.project_id}/${side}_${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
      const newPhotos = [...vehiclePhotos.filter(p => p.side !== side), { url: publicUrl, side, uploaded_at: new Date().toISOString() }]
      setVehiclePhotos(newPhotos)

      await supabase.from('customer_intake').update({
        vehicle_photos: newPhotos,
        updated_at: new Date().toISOString(),
      }).eq('token', token)
    }
    setUploading(null)
  }

  const uploadDamagePhoto = async (file: File) => {
    if (!intake) return
    setUploading('damage')
    const path = `intake/${intake.project_id}/damage_${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
      const newDamage = [...damagePhotos, { url: publicUrl, file_name: file.name, uploaded_at: new Date().toISOString() }]
      setDamagePhotos(newDamage)

      await supabase.from('customer_intake').update({
        damage_photos: newDamage,
        updated_at: new Date().toISOString(),
      }).eq('token', token)
    }
    setUploading(null)
  }

  const uploadLogo = async (file: File) => {
    if (!intake) return
    setUploading('logo')
    const path = `intake/${intake.project_id}/logo_${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
      const newLogos = [...logoFiles, { url: publicUrl, file_name: file.name, uploaded_at: new Date().toISOString() }]
      setLogoFiles(newLogos)

      await supabase.from('customer_intake').update({
        logo_files: newLogos,
        updated_at: new Date().toISOString(),
      }).eq('token', token)
    }
    setUploading(null)
  }

  const submit = async () => {
    setSaving(true)

    // Include branding data in intake update
    const brandingMeta = {
      website_url: websiteUrl || null,
      scraped_data: scrapedData || null,
      business_photos: businessPhotos,
      inspiration_photos: inspirationPhotos,
      nogo_photos: noGoPhotos,
      brand_colors_confirmed: useScrapedColors ? scrapedColors : null,
    }

    await supabase.from('customer_intake').update({
      ...form,
      vehicle_photos: vehiclePhotos,
      logo_files: logoFiles,
      damage_photos: damagePhotos,
      design_brief: [form.design_brief, websiteUrl ? `Website: ${websiteUrl}` : ''].filter(Boolean).join('\n'),
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      branding_meta: brandingMeta,
    }).eq('token', token)

    // Award intake_submitted XP to the creating agent via server route
    fetch('/api/xp/intake-submitted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})

    // Auto-generate brand portfolio in background
    fetch('/api/brand-portfolio/generate-from-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})

    setSaving(false)
    setSubmitted(true)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8892a8' }}>Loading...</div>
  if (!intake) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Invalid or expired link.</div>

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 40, textAlign: 'center', background: '#111827', borderRadius: 16, border: '1px solid #1e2d4a' }}>
        <CheckCircle2 size={48} style={{ margin: '0 auto 16px', color: '#22c55e' }} />
        <div style={{ fontSize: 22, fontWeight: 900, color: '#e8ecf4', marginBottom: 8 }}>Thank You!</div>
        <div style={{ fontSize: 14, color: '#8892a8' }}>Your information has been submitted. Our team will review and get started on your project.</div>
      </div>
    )
  }

  const photosComplete = VEHICLE_SIDES.slice(0, 4).every(s => vehiclePhotos.find(p => p.side === s.key))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#e8ecf4', letterSpacing: '-.02em' }}>USA WRAP CO</div>
        <div style={{ fontSize: 14, color: '#8892a8', marginTop: 4 }}>Vehicle Wrap Intake Form</div>
      </div>

      {/* ── SCREEN 0: BUSINESS BRANDING ── */}
      <Section label="Tell Us About Your Brand">
        {/* Website Scrape */}
        <div style={{ marginBottom: 16 }}>
          <Field label="Business Website (optional — we'll auto-fill your info)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inp, flex: 1 }}
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                type="url"
              />
              <button
                onClick={scrapeWebsite}
                disabled={!websiteUrl || scraping}
                style={{
                  padding: '0 16px', borderRadius: 8, border: '1px solid #1e2d4a',
                  background: websiteUrl ? '#4f7fff' : '#0c1222',
                  color: websiteUrl ? '#fff' : '#5a6478',
                  fontSize: 12, fontWeight: 700, cursor: websiteUrl ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                }}>
                <Globe size={13} />
                {scraping ? 'Analyzing...' : 'Analyze Website'}
              </button>
            </div>
          </Field>
          {scrapedData && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {scrapedData.logoUrl && <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} />Logo found</span>}
              {scrapedColors.length > 0 && <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} />{scrapedColors.length} brand colors</span>}
              {(scrapedData.phone || scrapedData.companyName) && <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} />Contact info</span>}
              {scrapedData.services?.length > 0 && <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} />{scrapedData.services.length} services</span>}
            </div>
          )}
        </div>

        {/* Color swatches from scrape */}
        {scrapedColors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Field label="Brand Colors Found on Your Website">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                {scrapedColors.map(hex => (
                  <div key={hex} style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: hex, border: '2px solid rgba(255,255,255,0.1)' }} />
                    <div style={{ fontSize: 9, color: '#5a6478', marginTop: 2, fontFamily: 'monospace' }}>{hex}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 6 }}>Are these your brand colors?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { val: true, label: 'Yes, these are my colors' },
                  { val: false, label: 'No, I\'ll add my own' },
                ].map(({ val, label }) => (
                  <button key={String(val)} onClick={() => setUseScrapedColors(val)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${useScrapedColors === val ? '#4f7fff' : '#1e2d4a'}`,
                      background: useScrapedColors === val ? 'rgba(79,127,255,0.12)' : '#0c1222',
                      color: useScrapedColors === val ? '#4f7fff' : '#8892a8',
                    }}>{label}</button>
                ))}
                <button onClick={() => setUseScrapedColors(null)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #1e2d4a', background: '#0c1222', color: '#8892a8' }}>
                  I don't have brand colors yet
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* Logo upload */}
        <div style={{ marginBottom: 16 }}>
          <Field label="Your Logo">
            {scrapedData?.logoUrl && (
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={scrapedData.logoUrl} alt="Logo from website" style={{ height: 40, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: '4px 8px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontSize: 11, color: '#8892a8' }}>Found on your website</span>
              </div>
            )}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer',
              border: '1px dashed #1e2d4a', borderRadius: 8, fontSize: 13, color: '#8892a8',
              background: '#0c1222',
            }}>
              <Paperclip size={14} />
              {logoFiles.length > 0 ? `${logoFiles.length} logo file(s) uploaded` : 'Upload your logo (PNG, SVG, PDF, AI, EPS, JPG)'}
              <input type="file" accept="image/*,.pdf,.ai,.svg,.eps" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
            {logoFiles.map((f, i) => (
              <div key={i} style={{ marginTop: 6, fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={11} />{f.file_name}
              </div>
            ))}
          </Field>
        </div>

        {/* Business photos */}
        <div style={{ marginBottom: 16 }}>
          <Field label="Photos of Your Business / Fleet / Work (helps us design the perfect wrap)">
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer',
              border: '1px dashed #1e2d4a', borderRadius: 8, fontSize: 13, color: '#8892a8', background: '#0c1222',
            }}>
              <Camera size={14} />
              {uploadingBrand === 'business' ? 'Uploading...' : businessPhotos.length > 0 ? `${businessPhotos.length} photo(s)` : 'Upload up to 10 photos'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files) Array.from(e.target.files).slice(0, 10).forEach(f => uploadBrandPhoto('business', f)) }} />
            </label>
          </Field>
        </div>

        {/* Inspiration photos */}
        <Grid cols={2}>
          <Field label="Wraps You Love (inspiration)">
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer',
              border: '1px dashed rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 12, color: '#8892a8', background: '#0c1222',
            }}>
              <Plus size={13} style={{ color: '#22c55e' }} />
              {inspirationPhotos.length > 0 ? `${inspirationPhotos.length} added` : 'Add up to 5 images'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files) Array.from(e.target.files).slice(0, 5).forEach(f => uploadBrandPhoto('inspiration', f)) }} />
            </label>
          </Field>
          <Field label="Wraps You Hate (what NOT to do)">
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer',
              border: '1px dashed rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#8892a8', background: '#0c1222',
            }}>
              <X size={13} style={{ color: '#ef4444' }} />
              {noGoPhotos.length > 0 ? `${noGoPhotos.length} added` : 'Add up to 3 images'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files) Array.from(e.target.files).slice(0, 3).forEach(f => uploadBrandPhoto('nogo', f)) }} />
            </label>
          </Field>
        </Grid>
      </Section>

      {/* Contact Info */}
      <Section label="Your Contact Info">
        <Grid cols={2}>
          <Field label="Your Name *">
            <input style={inp} value={form.customer_name} onChange={e => ff('customer_name', e.target.value)} placeholder="John Smith" />
          </Field>
          <Field label="Email *">
            <input style={inp} type="email" value={form.customer_email} onChange={e => ff('customer_email', e.target.value)} placeholder="john@company.com" />
          </Field>
          <Field label="Phone">
            <input style={inp} value={form.customer_phone} onChange={e => ff('customer_phone', e.target.value)} placeholder="(555) 000-0000" />
          </Field>
        </Grid>
      </Section>

      {/* Vehicle Information */}
      <Section label="Vehicle Information">
        <VinLookupField
          value={form.vehicle_vin}
          onChange={(vin) => ff('vehicle_vin', vin)}
          onVehicleDecoded={handleVehicleDecoded}
          showCamera
          showManualFallback
          portalMode
        />

        {/* Show decoded / manually entered Y/M/M as editable fields */}
        {(form.vehicle_year || form.vehicle_make || form.vehicle_model) && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
            <Grid cols={3}>
              <Field label="Year">
                <input style={inp} value={form.vehicle_year} onChange={e => ff('vehicle_year', e.target.value)} placeholder="2024" />
              </Field>
              <Field label="Make">
                <input style={inp} value={form.vehicle_make} onChange={e => ff('vehicle_make', e.target.value)} placeholder="Ford" />
              </Field>
              <Field label="Model">
                <input style={inp} value={form.vehicle_model} onChange={e => ff('vehicle_model', e.target.value)} placeholder="F-150" />
              </Field>
            </Grid>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Grid cols={2}>
            <Field label="Trim (optional)">
              <input style={inp} value={form.vehicle_trim} onChange={e => ff('vehicle_trim', e.target.value)} placeholder="TRD Pro" />
            </Field>
            <Field label="Current Color">
              <input style={inp} value={form.vehicle_color} onChange={e => ff('vehicle_color', e.target.value)} placeholder="White" />
            </Field>
          </Grid>
        </div>
      </Section>

      {/* Vehicle Condition */}
      <Section label="Vehicle Condition">
        <Field label="Overall Condition *">
          <select
            style={{ ...inp, cursor: 'pointer' }}
            value={form.vehicle_condition}
            onChange={e => ff('vehicle_condition', e.target.value)}
          >
            <option value="">Select condition...</option>
            {VEHICLE_CONDITIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <div style={{ marginTop: 12 }}>
          <Field label="Condition Notes (dents, scratches, rust, paint issues)">
            <textarea
              style={{ ...inp, minHeight: 60 }}
              value={form.vehicle_condition_notes}
              onChange={e => ff('vehicle_condition_notes', e.target.value)}
              placeholder="Describe any existing damage, scratches, dents, rust spots, or paint issues..."
            />
          </Field>
        </div>

        {/* Existing wrap */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 }}>
          <input type="checkbox" id="existing_wrap" checked={form.has_existing_wrap}
            onChange={e => ff('has_existing_wrap', e.target.checked)}
            style={{ width: 18, height: 18 }} />
          <label htmlFor="existing_wrap" style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf4', cursor: 'pointer' }}>
            Vehicle currently has a wrap, decals, or graphics
          </label>
        </div>
        {form.has_existing_wrap && (
          <Field label="Describe existing wrap / graphics">
            <textarea style={{ ...inp, minHeight: 60 }} value={form.existing_wrap_description}
              onChange={e => ff('existing_wrap_description', e.target.value)}
              placeholder="Full color change wrap, door logos, partial lettering on sides..." />
          </Field>
        )}

        {/* Damage photos */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 8 }}>
            Upload photos of any damage, scratches, dents, or problem areas (optional but helpful):
          </div>
          <label style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: 8,
            background: '#f59e0b', color: '#0d1a10', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            {uploading === 'damage' ? 'Uploading...' : <><AlertCircle size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Upload Damage Photos</>}
            <input type="file" accept="image/*" capture="environment" multiple hidden
              onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(f => uploadDamagePhoto(f)) }} />
          </label>
          {damagePhotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginTop: 12 }}>
              {damagePhotos.map((p, i) => (
                <img key={i} src={p.url} alt="Damage" style={{ width: '100%', borderRadius: 8, border: '1px solid #f59e0b40' }} />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* What Do You Want Wrapped */}
      <Section label="What Do You Want Wrapped?">
        <div style={{ marginBottom: 16 }}>
          <Field label="Wrap Type">
            <Grid cols={3}>
              {['Color Change', 'Commercial / Branding', 'Custom Design', 'PPF / Clear Bra'].map(t => (
                <button key={t} onClick={() => ff('wrap_type', t)} style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: form.wrap_type === t ? 'rgba(79,127,255,0.15)' : '#0c1222',
                  border: `2px solid ${form.wrap_type === t ? '#4f7fff' : '#1e2d4a'}`,
                  color: form.wrap_type === t ? '#4f7fff' : '#8892a8',
                  textAlign: 'center',
                }}>
                  {t}
                </button>
              ))}
            </Grid>
          </Field>
        </div>

        <Field label="Select Areas to Wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 6 }}>
            {WRAP_AREAS.map(area => {
              const selected = form.wrap_areas.includes(area.key)
              return (
                <button key={area.key} onClick={() => toggleWrapArea(area.key)} style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: selected ? 'rgba(34,197,94,0.1)' : '#0c1222',
                  border: `2px solid ${selected ? '#22c55e' : '#1e2d4a'}`,
                  color: selected ? '#22c55e' : '#8892a8',
                  textAlign: 'center',
                }}>
                  {area.label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* Vehicle Photos */}
      <Section label="Vehicle Photos — All Sides">
        <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 16 }}>
          Please upload clear photos of your vehicle from each angle. Stand back far enough to capture the entire side.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {VEHICLE_SIDES.map(side => {
            const photo = vehiclePhotos.find(p => p.side === side.key)
            return (
              <div key={side.key} style={{
                border: `2px dashed ${photo ? '#22c55e40' : '#1e2d4a'}`,
                borderRadius: 12, padding: 16, textAlign: 'center',
                background: photo ? 'rgba(34,197,94,0.03)' : '#0c1222',
                position: 'relative',
              }}>
                {photo ? (
                  <>
                    <img src={photo.url} alt={side.label} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>Uploaded: {side.label}</div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 8, display:'flex', justifyContent:'center' }}><side.Icon size={32} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8ecf4', marginBottom: 4 }}>{side.label}</div>
                    <div style={{ fontSize: 11, color: '#5a6478', marginBottom: 12 }}>{side.desc}</div>
                    <label style={{
                      display: 'inline-block', padding: '8px 16px', borderRadius: 8,
                      background: '#4f7fff', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      {uploading === side.key ? 'Uploading...' : <><Camera size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Upload Photo</>}
                      <input type="file" accept="image/*" capture="environment" hidden
                        onChange={e => e.target.files?.[0] && uploadPhoto(side.key, e.target.files[0])} />
                    </label>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Logo & Brand */}
      <Section label="Logo & Brand Materials">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 12 }}>
            Upload your logo files (AI, EPS, PDF, PNG, SVG preferred). Multiple files welcome.
          </div>
          <label style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 8,
            background: '#8b5cf6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {uploading === 'logo' ? 'Uploading...' : <><Paperclip size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} /> Upload Logo / Files</>}
            <input type="file" accept="image/*,.ai,.eps,.pdf,.svg" multiple hidden
              onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(f => uploadLogo(f)) }} />
          </label>
          {logoFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {logoFiles.map((f, i) => (
                <div key={i} style={{ padding: '6px 12px', background: '#1a2540', borderRadius: 6, fontSize: 11, color: '#8892a8' }}>
                  <Paperclip size={10} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} /> {f.file_name}
                </div>
              ))}
            </div>
          )}
        </div>
        <Grid cols={2}>
          <Field label="Brand Colors">
            <input style={inp} value={form.brand_colors} onChange={e => ff('brand_colors', e.target.value)} placeholder="Blue (#003DA5), White, Black" />
          </Field>
          <Field label="Fonts (if known)">
            <input style={inp} value={form.brand_fonts} onChange={e => ff('brand_fonts', e.target.value)} placeholder="Montserrat Bold, Helvetica" />
          </Field>
        </Grid>
      </Section>

      {/* Design Brief */}
      <Section label="Design Information">
        <Grid cols={1}>
          <Field label="What do you want on your wrap? *">
            <textarea style={{ ...inp, minHeight: 100 }} value={form.design_brief} onChange={e => ff('design_brief', e.target.value)}
              placeholder="Describe what you're looking for — full wrap with company branding, partial wrap with logo and phone number, color change, etc." />
          </Field>
          <Field label="Text / Copy for the Wrap">
            <textarea style={{ ...inp, minHeight: 80 }} value={form.text_content} onChange={e => ff('text_content', e.target.value)}
              placeholder="Phone number, website, slogan, license #, social media handles..." />
          </Field>
          <Field label="Reference Images or Inspiration">
            <textarea style={{ ...inp, minHeight: 60 }} value={form.references_notes} onChange={e => ff('references_notes', e.target.value)}
              placeholder="Links to wraps you like, competitor examples, style preferences..." />
          </Field>
        </Grid>
      </Section>

      {/* Removal */}
      <Section label="Existing Wrap / Removal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <input type="checkbox" id="removal" checked={form.removal_required}
            onChange={e => ff('removal_required', e.target.checked)}
            style={{ width: 18, height: 18 }} />
          <label htmlFor="removal" style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf4', cursor: 'pointer' }}>
            Vehicle has existing wrap, decals, or graphics that need removal
          </label>
        </div>
        {form.removal_required && (
          <Field label="Describe what needs to be removed">
            <textarea style={{ ...inp, minHeight: 60 }} value={form.removal_description}
              onChange={e => ff('removal_description', e.target.value)}
              placeholder="Full wrap removal, partial decals on doors, old lettering on tailgate..." />
          </Field>
        )}
      </Section>

      {/* Submit */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button onClick={submit} disabled={saving || !form.customer_name || !form.customer_email}
          style={{
            padding: '16px 48px', borderRadius: 12, fontWeight: 900, fontSize: 16,
            cursor: 'pointer', border: 'none',
            background: '#22c55e', color: '#0d1a10',
            opacity: saving || !form.customer_name ? 0.5 : 1,
          }}>
          {saving ? 'Submitting...' : 'Submit Information'}
        </button>
      </div>

      {!photosComplete && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#f59e0b' }}>
          Tip: Upload all 4 vehicle photos for the fastest turnaround
        </div>
      )}
    </div>
  )
}

// Helpers
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6478', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8, marginBottom: 14, borderBottom: '1px solid #1e2d4a' }}>{label}</div>
      {children}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#5a6478', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>{children}</div>
}
const inp: React.CSSProperties = {
  width: '100%', background: '#0c1222', border: '1px solid #1e2d4a',
  borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e8ecf4', outline: 'none',
}
