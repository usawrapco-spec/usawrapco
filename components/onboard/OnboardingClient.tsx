'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Upload,
  CheckCircle2,
  Car,
  Paintbrush,
  Palette,
  PenTool,
  User,
  Megaphone,
  CreditCard,
  PartyPopper,
  X,
  Plus,
  Sparkles,
  Shield,
  Clock,
  Image as ImageIcon,
  FileText,
  Truck,
  Layers,
  Star,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface OnboardingClientProps {
  token: string
}

type ServiceType = 'full_wrap' | 'partial_wrap' | 'color_change' | 'ppf' | 'decking' | 'other'

interface FormData {
  // Vehicle
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vehicleColor: string
  vehiclePhotos: UploadedFile[]
  // Services
  services: ServiceType[]
  // Brand
  logoFiles: UploadedFile[]
  brandColor1: string
  brandColor2: string
  brandColor3: string
  referenceImages: UploadedFile[]
  styleNotes: string
  // Design prefs
  mustHaves: string
  dontWants: string
  inspirationNotes: string
  // Contact
  contactName: string
  contactEmail: string
  contactPhone: string
  contactCompany: string
  fleetSize: string
  // Referral
  referralSource: string
  referredBy: string
}

interface UploadedFile {
  url: string
  name: string
  uploadedAt: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STEP_COUNT = 9
const STEP_LABELS = [
  'Welcome',
  'Vehicle',
  'Services',
  'Brand',
  'Design',
  'Contact',
  'Referral',
  'Deposit',
  'Done',
]

const SERVICE_OPTIONS: { key: ServiceType; label: string; desc: string; icon: typeof Car }[] = [
  { key: 'full_wrap', label: 'Full Wrap', desc: 'Complete vehicle coverage with custom graphics', icon: Truck },
  { key: 'partial_wrap', label: 'Partial Wrap', desc: 'Targeted coverage on select panels', icon: Layers },
  { key: 'color_change', label: 'Color Change', desc: 'Solid color film over entire vehicle', icon: Palette },
  { key: 'ppf', label: 'Paint Protection Film', desc: 'Invisible shield to protect your paint', icon: Shield },
  { key: 'decking', label: 'Decking / Lettering', desc: 'Cut vinyl lettering and decals', icon: FileText },
  { key: 'other', label: 'Other / Custom', desc: 'Something else? Tell us about it', icon: Star },
]

const REFERRAL_OPTIONS = [
  'Google Search',
  'Instagram',
  'Facebook',
  'TikTok',
  'Referral',
  'Walk-In',
  'Repeat Customer',
  'Other',
]

const POPULAR_MAKES = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti',
  'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda',
  'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram',
  'Rivian', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
]

// ─── Styles ────────────────────────────────────────────────────────────────────
const colors = {
  bg: '#0d0f14',
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: colors.surface2,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: '14px 16px',
  fontSize: 15,
  color: colors.text1,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: colors.text3,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '16px 32px',
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
  border: 'none',
  background: colors.accent,
  color: '#fff',
  fontFamily: "'Barlow Condensed', sans-serif",
  letterSpacing: '0.02em',
  transition: 'all 0.15s',
  minHeight: 52,
}

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  color: colors.text2,
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function OnboardingClient({ token }: OnboardingClientProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'next' | 'back'>('next')
  const [animating, setAnimating] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const [form, setForm] = useState<FormData>({
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehiclePhotos: [],
    services: [],
    logoFiles: [],
    brandColor1: '#003DA5',
    brandColor2: '#FFFFFF',
    brandColor3: '#000000',
    referenceImages: [],
    styleNotes: '',
    mustHaves: '',
    dontWants: '',
    inspirationNotes: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactCompany: '',
    fleetSize: '',
    referralSource: '',
    referredBy: '',
  })

  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)

  const ff = useCallback((key: keyof FormData, val: unknown) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }, [])

  // ─── File Upload ───────────────────────────────────────────────────────────
  const uploadFile = async (file: File, category: string): Promise<UploadedFile | null> => {
    const ext = file.name.split('.').pop() || 'bin'
    const path = `onboard/${token}/${category}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('job-images').upload(path, file)
    if (error || !data) return null
    const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(data.path)
    return { url: publicUrl, name: file.name, uploadedAt: new Date().toISOString() }
  }

  const handleVehiclePhotos = async (files: FileList) => {
    setUploading('vehicle')
    const uploaded: UploadedFile[] = [...form.vehiclePhotos]
    for (const file of Array.from(files)) {
      const result = await uploadFile(file, 'vehicle')
      if (result) uploaded.push(result)
    }
    ff('vehiclePhotos', uploaded)
    setUploading(null)
  }

  const handleLogoUpload = async (files: FileList) => {
    setUploading('logo')
    const uploaded: UploadedFile[] = [...form.logoFiles]
    for (const file of Array.from(files)) {
      const result = await uploadFile(file, 'logo')
      if (result) uploaded.push(result)
    }
    ff('logoFiles', uploaded)
    setUploading(null)
  }

  const handleRefImages = async (files: FileList) => {
    setUploading('reference')
    const uploaded: UploadedFile[] = [...form.referenceImages]
    for (const file of Array.from(files)) {
      const result = await uploadFile(file, 'reference')
      if (result) uploaded.push(result)
    }
    ff('referenceImages', uploaded)
    setUploading(null)
  }

  const removeFile = (key: 'vehiclePhotos' | 'logoFiles' | 'referenceImages', index: number) => {
    const arr = [...form[key]]
    arr.splice(index, 1)
    ff(key, arr)
  }

  // ─── Service Toggle ────────────────────────────────────────────────────────
  const toggleService = (svc: ServiceType) => {
    const current = form.services
    if (current.includes(svc)) {
      ff('services', current.filter(s => s !== svc))
    } else {
      ff('services', [...current, svc])
    }
  }

  // ─── Step Validation ───────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true // Welcome
      case 1: return !!(form.vehicleYear && form.vehicleMake && form.vehicleModel)
      case 2: return form.services.length > 0
      case 3: return true // Brand assets optional
      case 4: return true // Design prefs optional
      case 5: return !!(form.contactName && form.contactEmail && form.contactPhone)
      case 6: return !!form.referralSource
      case 7: return true // Deposit
      case 8: return true // Thank you
      default: return true
    }
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  const goTo = (nextStep: number, dir: 'next' | 'back') => {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 250)
  }

  const next = () => {
    if (step < STEP_COUNT - 1 && canProceed()) goTo(step + 1, 'next')
  }

  const back = () => {
    if (step > 0) goTo(step - 1, 'back')
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  const submitOnboarding = async () => {
    setSubmitting(true)
    try {
      await supabase.from('customer_intake_tokens').update({
        customer_name: form.contactName,
        customer_email: form.contactEmail,
        customer_phone: form.contactPhone,
        brand_colors: [form.brandColor1, form.brandColor2, form.brandColor3].filter(Boolean).join(', '),
        design_brief: form.mustHaves,
        text_content: form.styleNotes,
        references_notes: form.inspirationNotes,
        vehicle_photos: form.vehiclePhotos,
        logo_files: form.logoFiles,
        completed: true,
        completed_at: new Date().toISOString(),
        form_data: {
          vehicleYear: form.vehicleYear,
          vehicleMake: form.vehicleMake,
          vehicleModel: form.vehicleModel,
          vehicleColor: form.vehicleColor,
          services: form.services,
          referenceImages: form.referenceImages,
          dontWants: form.dontWants,
          contactCompany: form.contactCompany,
          fleetSize: form.fleetSize,
          referralSource: form.referralSource,
          referredBy: form.referredBy,
        },
      }).eq('token', token)
    } catch (err) {
      console.error('Onboarding submit error:', err)
    }
    setSubmitting(false)
    goTo(8, 'next')
  }

  // ─── Payment ───────────────────────────────────────────────────────────────
  const handlePayDeposit = async () => {
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeToken: token,
          email: form.contactEmail,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Payment error:', err)
    }
    setPaymentLoading(false)
  }

  // ─── Render Helpers ────────────────────────────────────────────────────────
  const renderThumbnails = (
    files: UploadedFile[],
    key: 'vehiclePhotos' | 'logoFiles' | 'referenceImages'
  ) => {
    if (files.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {files.map((f, i) => (
          <div key={i} style={{
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: 10,
            overflow: 'hidden',
            border: `1px solid ${colors.border}`,
          }}>
            <img
              src={f.url}
              alt={f.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              onClick={() => removeFile(key, i)}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    )
  }

  const DropZone = ({
    label,
    onFiles,
    isUploading,
    accept,
    inputRef,
  }: {
    label: string
    onFiles: (files: FileList) => void
    isUploading: boolean
    accept: string
    inputRef: React.RefObject<HTMLInputElement>
  }) => {
    const [dragOver, setDragOver] = useState(false)
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? colors.accent : colors.border}`,
          borderRadius: 14,
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? `${colors.accent}08` : colors.surface,
          transition: 'all 0.2s',
        }}
      >
        {isUploading ? (
          <div style={{ color: colors.accent, fontSize: 14, fontWeight: 700 }}>Uploading...</div>
        ) : (
          <>
            <Upload size={28} style={{ color: colors.text3, margin: '0 auto 10px' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: colors.text3 }}>Drag & drop or tap to browse</div>
            {/* Mobile camera button */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: colors.accent,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
              }}>
                <Camera size={14} /> Take Photo
              </span>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          capture="environment"
          hidden
          onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files) }}
        />
      </div>
    )
  }

  // ─── Step Content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    const slideStyle: React.CSSProperties = {
      opacity: animating ? 0 : 1,
      transform: animating
        ? `translateX(${direction === 'next' ? '40px' : '-40px'})`
        : 'translateX(0)',
      transition: 'all 0.25s ease',
    }

    switch (step) {
      // ─── STEP 0: Welcome ────────────────────────────────────────────────
      case 0:
        return (
          <div style={{ ...slideStyle, textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              fontSize: 42,
              fontWeight: 900,
              color: colors.text1,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}>
              USA WRAP CO
            </div>
            <div style={{
              fontSize: 14,
              color: colors.text2,
              marginBottom: 40,
              lineHeight: 1.6,
              maxWidth: 380,
              margin: '0 auto 40px',
            }}>
              Welcome! We just need a few details to get your project started.
              This takes about 5 minutes.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 340, margin: '0 auto 40px' }}>
              {[
                { icon: Car, text: 'Tell us about your vehicle' },
                { icon: Paintbrush, text: 'Share your brand & design ideas' },
                { icon: Shield, text: 'Secure your spot with a deposit' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${colors.accent}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <item.icon size={20} style={{ color: colors.accent }} />
                  </div>
                  <span style={{ fontSize: 14, color: colors.text2, fontWeight: 600 }}>{item.text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={next}
              style={{
                ...btnPrimary,
                padding: '18px 48px',
                fontSize: 17,
                background: colors.accent,
              }}
            >
              Let&apos;s Get Started <ArrowRight size={18} />
            </button>
          </div>
        )

      // ─── STEP 1: Vehicle Info ───────────────────────────────────────────
      case 1:
        return (
          <div style={slideStyle}>
            <StepHeader icon={Car} title="Vehicle Information" subtitle="Tell us about the vehicle being wrapped" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Year *</label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="2024"
                  value={form.vehicleYear}
                  onChange={e => ff('vehicleYear', e.target.value)}
                  min="1990"
                  max="2030"
                />
              </div>
              <div>
                <label style={labelStyle}>Make *</label>
                <select
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  value={form.vehicleMake}
                  onChange={e => ff('vehicleMake', e.target.value)}
                >
                  <option value="">Select make</option>
                  {POPULAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Model *</label>
                <input
                  style={inputStyle}
                  placeholder="Model S"
                  value={form.vehicleModel}
                  onChange={e => ff('vehicleModel', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <input
                  style={inputStyle}
                  placeholder="Pearl White"
                  value={form.vehicleColor}
                  onChange={e => ff('vehicleColor', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <label style={labelStyle}>Vehicle Photos</label>
              <DropZone
                label="Upload vehicle photos"
                onFiles={handleVehiclePhotos}
                isUploading={uploading === 'vehicle'}
                accept="image/*"
                inputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              />
              {renderThumbnails(form.vehiclePhotos, 'vehiclePhotos')}
            </div>
          </div>
        )

      // ─── STEP 2: Service Selection ─────────────────────────────────────
      case 2:
        return (
          <div style={slideStyle}>
            <StepHeader icon={Sparkles} title="What are you looking for?" subtitle="Select all services that apply" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {SERVICE_OPTIONS.map(svc => {
                const selected = form.services.includes(svc.key)
                return (
                  <button
                    key={svc.key}
                    onClick={() => toggleService(svc.key)}
                    style={{
                      background: selected ? `${colors.accent}15` : colors.surface,
                      border: `2px solid ${selected ? colors.accent : colors.border}`,
                      borderRadius: 14,
                      padding: '20px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      outline: 'none',
                    }}
                  >
                    <svc.icon
                      size={28}
                      style={{
                        color: selected ? colors.accent : colors.text3,
                        margin: '0 auto 10px',
                        display: 'block',
                      }}
                    />
                    <div style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: selected ? colors.accent : colors.text1,
                      marginBottom: 4,
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}>
                      {svc.label}
                    </div>
                    <div style={{ fontSize: 11, color: colors.text3, lineHeight: 1.4 }}>{svc.desc}</div>
                    {selected && (
                      <div style={{ marginTop: 8 }}>
                        <CheckCircle2 size={18} style={{ color: colors.green }} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )

      // ─── STEP 3: Brand Assets ──────────────────────────────────────────
      case 3:
        return (
          <div style={slideStyle}>
            <StepHeader icon={Palette} title="Brand Assets" subtitle="Share your logos, colors, and reference materials" />
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Logo Files</label>
              <DropZone
                label="Upload logos (AI, EPS, PDF, PNG, SVG)"
                onFiles={handleLogoUpload}
                isUploading={uploading === 'logo'}
                accept="image/*,.ai,.eps,.pdf,.svg"
                inputRef={logoInputRef as React.RefObject<HTMLInputElement>}
              />
              {renderThumbnails(form.logoFiles, 'logoFiles')}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Brand Colors</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(['brandColor1', 'brandColor2', 'brandColor3'] as const).map((key, i) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={form[key]}
                      onChange={e => ff(key, e.target.value)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        border: `2px solid ${colors.border}`,
                        cursor: 'pointer',
                        background: 'transparent',
                        padding: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: colors.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                      {form[key]}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (form.brandColor3) {
                      // All 3 filled already
                    }
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    border: `2px dashed ${colors.border}`,
                    background: 'transparent',
                    color: colors.text3,
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Reference Images</label>
              <DropZone
                label="Upload reference or inspiration images"
                onFiles={handleRefImages}
                isUploading={uploading === 'reference'}
                accept="image/*"
                inputRef={refInputRef as React.RefObject<HTMLInputElement>}
              />
              {renderThumbnails(form.referenceImages, 'referenceImages')}
            </div>
            <div>
              <label style={labelStyle}>Style Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="Any notes about your brand style, feel, or direction..."
                value={form.styleNotes}
                onChange={e => ff('styleNotes', e.target.value)}
              />
            </div>
          </div>
        )

      // ─── STEP 4: Design Preferences ────────────────────────────────────
      case 4:
        return (
          <div style={slideStyle}>
            <StepHeader icon={PenTool} title="Design Preferences" subtitle="Help our designers nail your vision" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Must-Haves</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  placeholder="Things that MUST be on the wrap (e.g. phone number on both sides, logo on tailgate, website on hood)..."
                  value={form.mustHaves}
                  onChange={e => ff('mustHaves', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Don&apos;t Wants</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  placeholder="Things you DO NOT want (e.g. no neon colors, no cartoons, no QR codes)..."
                  value={form.dontWants}
                  onChange={e => ff('dontWants', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Inspiration / Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                  placeholder="Links to wraps you like, Instagram accounts, competitor examples..."
                  value={form.inspirationNotes}
                  onChange={e => ff('inspirationNotes', e.target.value)}
                />
              </div>
              <div style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                padding: 20,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', marginBottom: 10 }}>
                  Inspiration Gallery
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{
                      aspectRatio: '1',
                      background: colors.surface2,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ImageIcon size={20} style={{ color: colors.text3 }} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: colors.text3, marginTop: 8, textAlign: 'center' }}>
                  Gallery coming soon -- share links above for now
                </div>
              </div>
            </div>
          </div>
        )

      // ─── STEP 5: Contact Info ───────────────────────────────────────────
      case 5:
        return (
          <div style={slideStyle}>
            <StepHeader icon={User} title="Contact Information" subtitle="How can we reach you?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  style={inputStyle}
                  placeholder="John Smith"
                  value={form.contactName}
                  onChange={e => ff('contactName', e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="john@company.com"
                    value={form.contactEmail}
                    onChange={e => ff('contactEmail', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <input
                    style={inputStyle}
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={form.contactPhone}
                    onChange={e => ff('contactPhone', e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Company <span style={{ color: colors.text3, fontWeight: 400 }}>(optional)</span></label>
                  <input
                    style={inputStyle}
                    placeholder="Acme Inc."
                    value={form.contactCompany}
                    onChange={e => ff('contactCompany', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Fleet Size <span style={{ color: colors.text3, fontWeight: 400 }}>(optional)</span></label>
                  <select
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    value={form.fleetSize}
                    onChange={e => ff('fleetSize', e.target.value)}
                  >
                    <option value="">N/A</option>
                    <option value="1">Just 1 vehicle</option>
                    <option value="2-5">2-5 vehicles</option>
                    <option value="6-10">6-10 vehicles</option>
                    <option value="11-25">11-25 vehicles</option>
                    <option value="25+">25+ vehicles</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      // ─── STEP 6: Referral ──────────────────────────────────────────────
      case 6:
        return (
          <div style={slideStyle}>
            <StepHeader icon={Megaphone} title="How did you find us?" subtitle="This helps us serve you better" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {REFERRAL_OPTIONS.map(opt => {
                const selected = form.referralSource === opt
                return (
                  <button
                    key={opt}
                    onClick={() => ff('referralSource', opt)}
                    style={{
                      padding: '16px 14px',
                      background: selected ? `${colors.accent}15` : colors.surface,
                      border: `2px solid ${selected ? colors.accent : colors.border}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 700,
                      color: selected ? colors.accent : colors.text1,
                      transition: 'all 0.15s',
                      outline: 'none',
                      fontFamily: "'Barlow Condensed', sans-serif",
                    }}
                  >
                    {opt}
                    {selected && <CheckCircle2 size={14} style={{ marginLeft: 6, display: 'inline', verticalAlign: 'middle' }} />}
                  </button>
                )
              })}
            </div>
            {form.referralSource === 'Referral' && (
              <div style={{ marginTop: 20 }}>
                <label style={labelStyle}>Who referred you?</label>
                <input
                  style={inputStyle}
                  placeholder="Name of the person or business"
                  value={form.referredBy}
                  onChange={e => ff('referredBy', e.target.value)}
                />
              </div>
            )}
          </div>
        )

      // ─── STEP 7: Deposit ───────────────────────────────────────────────
      case 7:
        return (
          <div style={slideStyle}>
            <StepHeader icon={CreditCard} title="Design Deposit" subtitle="Secure your project spot" />
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 28,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 48,
                fontWeight: 900,
                color: colors.text1,
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 4,
              }}>
                $250
              </div>
              <div style={{ fontSize: 14, color: colors.text2, marginBottom: 24 }}>
                One-time design deposit
              </div>
              <div style={{
                background: colors.surface2,
                borderRadius: 12,
                padding: 16,
                textAlign: 'left',
                marginBottom: 24,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', marginBottom: 12 }}>
                  What you get
                </div>
                {[
                  'Dedicated designer assigned to your project',
                  'Custom wrap design mockup on your vehicle',
                  'Up to 2 rounds of revisions included',
                  'High-res proof files for your approval',
                  'Deposit applied toward your final invoice',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <CheckCircle2 size={16} style={{ color: colors.green, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: colors.text2 }}>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handlePayDeposit}
                disabled={paymentLoading}
                style={{
                  ...btnPrimary,
                  width: '100%',
                  background: colors.green,
                  color: '#0d1a10',
                  fontSize: 16,
                  padding: '18px 32px',
                  opacity: paymentLoading ? 0.6 : 1,
                }}
              >
                {paymentLoading ? 'Redirecting to payment...' : 'Pay $250 Now'}
              </button>
              <button
                onClick={() => submitOnboarding()}
                disabled={submitting}
                style={{
                  ...btnSecondary,
                  width: '100%',
                  marginTop: 12,
                  fontSize: 13,
                  padding: '14px 20px',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Skip for now -- submit without deposit'}
              </button>
              <div style={{ fontSize: 11, color: colors.text3, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Shield size={12} /> Secure payment via Stripe
              </div>
            </div>
          </div>
        )

      // ─── STEP 8: Thank You ─────────────────────────────────────────────
      case 8:
        return (
          <div style={{ ...slideStyle, textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: `${colors.green}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <PartyPopper size={36} style={{ color: colors.green }} />
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 900,
              color: colors.text1,
              fontFamily: "'Barlow Condensed', sans-serif",
              marginBottom: 8,
            }}>
              You&apos;re All Set!
            </div>
            <div style={{ fontSize: 15, color: colors.text2, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 28px' }}>
              Thank you for choosing USA WRAP CO. Our team will review your
              information and contact you within 24 hours.
            </div>
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 20,
              maxWidth: 380,
              margin: '0 auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Clock size={18} style={{ color: colors.amber }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text1 }}>What happens next?</span>
              </div>
              {[
                'We review your submission',
                'A sales rep will reach out to discuss details',
                'Your designer starts creating mockups',
                'You approve the design and we start wrapping!',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, paddingLeft: 4 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: colors.surface2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 800,
                    color: colors.text3,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: colors.text2, paddingTop: 2 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ─── Main Layout ───────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text1,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '20px 16px 100px',
      }}>
        {/* ─── Progress Bar ──────────────────────────────────────────────── */}
        {step > 0 && step < 8 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: colors.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Step {step} of {STEP_COUNT - 2}
              </span>
              <span style={{ fontSize: 11, color: colors.text3 }}>
                {STEP_LABELS[step]}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 4,
              background: colors.surface2,
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(step / (STEP_COUNT - 2)) * 100}%`,
                height: '100%',
                background: colors.accent,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* ─── Step Content ──────────────────────────────────────────────── */}
        {renderStep()}

        {/* ─── Navigation Buttons ────────────────────────────────────────── */}
        {step > 0 && step < 7 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 32,
            gap: 12,
          }}>
            <button onClick={back} style={{ ...btnSecondary, flex: 1 }}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={next}
              disabled={!canProceed()}
              style={{
                ...btnPrimary,
                flex: 1,
                opacity: canProceed() ? 1 : 0.4,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Back button for deposit step */}
        {step === 7 && (
          <div style={{ marginTop: 20 }}>
            <button onClick={back} style={{ ...btnSecondary, width: '100%' }}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared Sub-Components ───────────────────────────────────────────────────
function StepHeader({ icon: Icon, title, subtitle }: { icon: typeof Car; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#4f7fff15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: '#4f7fff' }} />
        </div>
        <div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#e8eaed',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '-0.01em',
          }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: '#9299b5' }}>{subtitle}</div>
        </div>
      </div>
    </div>
  )
}
