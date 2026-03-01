'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Upload, X, Plus, AlertTriangle } from 'lucide-react'

// ── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7

const SERVICES = [
  { id: 'vehicle_wrap',     icon: '🚗', label: 'Vehicle Wrap',        desc: 'Cars, trucks, vans, SUVs' },
  { id: 'commercial_fleet', icon: '🚛', label: 'Commercial Fleet',     desc: 'Box trucks, work vans, semis' },
  { id: 'trailer_wrap',     icon: '🚐', label: 'Trailer Wrap',         desc: 'Enclosed, open, boat trailers' },
  { id: 'marine_boat',      icon: '⛵', label: 'Marine / Boat',        desc: 'Full hull, deck, console' },
  { id: 'storefront',       icon: '🏪', label: 'Storefront / Signage', desc: 'Window graphics, wall wraps' },
  { id: 'logo_design',      icon: '🎨', label: 'Logo Design',          desc: 'New logo or refresh' },
  { id: 'brand_package',    icon: '📦', label: 'Brand Package',        desc: 'Logo + colors + full identity' },
  { id: 'social_media',     icon: '📱', label: 'Social Media Kit',     desc: 'Templates and graphics' },
]

const VEHICLE_SERVICES = ['vehicle_wrap', 'commercial_fleet', 'trailer_wrap', 'marine_boat']
const MARINE_SERVICES  = ['marine_boat']

const REFERRAL_SOURCES = ['Google', 'Instagram', 'Facebook', 'Referral', 'Vehicle Wrap Spotted', 'Fleet Manager', 'Other']
const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Landscaping', 'Food & Beverage', 'Real Estate', 'Medical', 'Retail', 'Transportation', 'Construction', 'Other']
const BOAT_TYPES = ['Pontoon', 'Bowrider', 'Cabin Cruiser', 'Other']

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface FormState {
  // Step 2
  name: string; businessName: string; email: string; phone: string
  website: string; referralSource: string
  // Step 3
  services: string[]
  // Step 4
  vehicleYear: string; vehicleMake: string; vehicleModel: string
  vehicleQuantity: string; vehicleColor: string
  vehiclePhotos: File[]; vehiclePhotoUrls: string[]
  hasExistingWrap: boolean
  boatType: string; boatLength: string
  // Step 5
  hasLogo: 'yes' | 'no' | 'in_progress' | null
  logoFile: File | null; logoPreview: string | null
  brandColors: string[]; brandWords: string; industry: string
  inspirationFiles: File[]; inspirationUrls: string[]; inspirationLink: string
  // Step 6
  aiConversation: ChatMessage[]; visionNotes: string
}

const initForm = (): FormState => ({
  name: '', businessName: '', email: '', phone: '', website: '', referralSource: '',
  services: [],
  vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleQuantity: '1',
  vehicleColor: '#ffffff', vehiclePhotos: [], vehiclePhotoUrls: [],
  hasExistingWrap: false, boatType: '', boatLength: '',
  hasLogo: null, logoFile: null, logoPreview: null,
  brandColors: ['#4f7fff'], brandWords: '', industry: '',
  inspirationFiles: [], inspirationUrls: [], inspirationLink: '',
  aiConversation: [], visionNotes: '',
})

// ── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100dvh', background: '#0d0f14', color: '#e8eaed',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    overflowX: 'hidden' as const,
  },
  progressBar: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 100,
    height: 3, background: 'rgba(255,255,255,0.06)',
  },
  stepLabel: {
    position: 'fixed' as const, top: 8, right: 16, zIndex: 101,
    fontSize: 12, color: '#5a6080', fontWeight: 500,
  },
  card: {
    width: '100%', maxWidth: 600, margin: '0 auto',
    padding: '0 20px 40px',
    display: 'flex', flexDirection: 'column' as const,
    minHeight: '100dvh', justifyContent: 'center',
    animation: 'fadeUp 0.35s ease forwards',
  },
  heading: {
    fontSize: 'clamp(28px, 7vw, 44px)', fontWeight: 800,
    lineHeight: 1.1, letterSpacing: '-0.03em',
    color: '#e8eaed', marginBottom: 12,
  },
  subtext: {
    fontSize: 17, color: '#9299b5', lineHeight: 1.65, marginBottom: 40,
  },
  label: { fontSize: 13, fontWeight: 600, color: '#9299b5', marginBottom: 6, display: 'block' as const },
  input: {
    width: '100%', background: '#13151c', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 10, padding: '13px 16px', fontSize: 15, color: '#e8eaed',
    outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%', background: '#13151c', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 10, padding: '13px 16px', fontSize: 15, color: '#e8eaed',
    outline: 'none', boxSizing: 'border-box' as const, appearance: 'none' as const,
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: '#4f7fff', color: '#fff', border: 'none', borderRadius: 12,
    padding: '15px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 0 40px rgba(79,127,255,0.4), 0 4px 20px rgba(79,127,255,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  secondaryBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '12px 20px', fontSize: 14, color: '#9299b5',
    cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
  },
  field: { marginBottom: 20 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(initForm)
  const [submitting, setSubmitting] = useState(false)
  const [intakeId, setIntakeId] = useState<string | null>(null)
  const [editFromReview, setEditFromReview] = useState(false)

  // AI chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiStreaming, setAiStreaming] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [briefComplete, setBriefComplete] = useState(false)
  const [aiStarted, setAiStarted] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasVehicle = form.services.some(s => VEHICLE_SERVICES.includes(s))
  const hasMarine  = form.services.some(s => MARINE_SERVICES.includes(s))

  const up = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }))

  // Progress bar
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  // Validation
  const step2Valid = form.name.trim() && form.email.trim() && form.phone.trim()
  const step3Valid = form.services.length > 0
  const step6CanContinue = briefComplete || (aiUnavailable && form.visionNotes.trim().length > 20)

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    let next = step + 1
    // Skip step 4 if no vehicle services selected
    if (next === 4 && !hasVehicle) next = 5
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    let prev = step - 1
    if (prev === 4 && !hasVehicle) prev = 3
    setStep(Math.max(1, prev))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const jumpTo = (s: number) => {
    setEditFromReview(true)
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const returnToReview = () => {
    setEditFromReview(false)
    setStep(7)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── AI Chat ────────────────────────────────────────────────────────────────

  const sendAiMessage = useCallback(async (userMsg: string, history: ChatMessage[]) => {
    setAiStreaming(true)

    const messages = userMsg
      ? [...history, { role: 'user' as const, content: userMsg }]
      : history

    if (userMsg) {
      setAiMessages(messages)
    }

    const formData = {
      name: form.name, businessName: form.businessName, email: form.email,
      services: form.services,
      vehicle: hasVehicle ? {
        year: form.vehicleYear, make: form.vehicleMake, model: form.vehicleModel,
        quantity: form.vehicleQuantity, color: form.vehicleColor,
        hasExistingWrap: form.hasExistingWrap,
        ...(hasMarine ? { boatType: form.boatType, length: form.boatLength } : {}),
      } : null,
      brand: {
        hasLogo: form.hasLogo, colors: form.brandColors, words: form.brandWords,
        industry: form.industry, inspirationLink: form.inspirationLink,
      },
    }

    try {
      const res = await fetch('/api/design-intakes/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, formData }),
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      const finalMessages: ChatMessage[] = userMsg
        ? [...history, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }]
        : [...history, { role: 'assistant', content: '' }]
      setAiMessages([...finalMessages])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantText += parsed.text
                setAiMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantText }
                  return updated
                })
              }
            } catch { /* ignore */ }
          }
        }
      }

      if (assistantText.includes('BRIEF_COMPLETE')) {
        setBriefComplete(true)
        // Store cleaned version in form
        up({ aiConversation: finalMessages.slice(0, -1).concat([{ role: 'assistant', content: assistantText }]) })
      }

      setAiUnavailable(false)
      if (retryTimerRef.current) clearInterval(retryTimerRef.current)
    } catch {
      setAiUnavailable(true)
      // Auto-retry every 30 seconds
      if (!retryTimerRef.current) {
        retryTimerRef.current = setInterval(async () => {
          try {
            const r = await fetch('/api/design-intakes/ai-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [], formData: {} }),
              signal: AbortSignal.timeout(5000),
            })
            if (r.ok) {
              setAiUnavailable(false)
              clearInterval(retryTimerRef.current!)
              retryTimerRef.current = null
            }
          } catch { /* still down */ }
        }, 30000)
      }
    } finally {
      setAiStreaming(false)
    }
  }, [form, hasVehicle, hasMarine])

  // Auto-start AI on step 6
  useEffect(() => {
    if (step === 6 && !aiStarted) {
      setAiStarted(true)
      sendAiMessage('', [])
    }
  }, [step, aiStarted, sendAiMessage])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  useEffect(() => {
    return () => { if (retryTimerRef.current) clearInterval(retryTimerRef.current) }
  }, [])

  const handleAiSend = () => {
    if (!aiInput.trim() || aiStreaming) return
    const msg = aiInput.trim()
    setAiInput('')
    sendAiMessage(msg, aiMessages)
  }

  // ── File Handlers ──────────────────────────────────────────────────────────

  const handleVehiclePhotos = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    const urls = arr.map(f => URL.createObjectURL(f))
    up({ vehiclePhotos: [...form.vehiclePhotos, ...arr], vehiclePhotoUrls: [...form.vehiclePhotoUrls, ...urls] })
  }

  const removeVehiclePhoto = (i: number) => {
    const photos = form.vehiclePhotos.filter((_, idx) => idx !== i)
    const urls   = form.vehiclePhotoUrls.filter((_, idx) => idx !== i)
    up({ vehiclePhotos: photos, vehiclePhotoUrls: urls })
  }

  const handleLogoFile = (files: FileList | null) => {
    if (!files?.length) return
    const f = files[0]
    up({ logoFile: f, logoPreview: URL.createObjectURL(f) })
  }

  const handleInspirationFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    const urls = arr.map(f => URL.createObjectURL(f))
    up({ inspirationFiles: [...form.inspirationFiles, ...arr], inspirationUrls: [...form.inspirationUrls, ...urls] })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        name: form.name, businessName: form.businessName,
        email: form.email, phone: form.phone,
        website: form.website, referralSource: form.referralSource,
        services: form.services,
        vehicleDetails: hasVehicle ? {
          year: form.vehicleYear, make: form.vehicleMake, model: form.vehicleModel,
          quantity: form.vehicleQuantity, color: form.vehicleColor,
          hasExistingWrap: form.hasExistingWrap,
          boatType: hasMarine ? form.boatType : undefined,
          boatLength: hasMarine ? form.boatLength : undefined,
          photoCount: form.vehiclePhotos.length,
        } : null,
        brandAssets: {
          hasLogo: form.hasLogo, colors: form.brandColors,
          brandWords: form.brandWords, industry: form.industry,
          inspirationLink: form.inspirationLink,
          inspirationCount: form.inspirationFiles.length,
        },
        aiConversation: aiMessages,
        visionNotes: form.visionNotes,
      }

      const res = await fetch('/api/design-intakes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')

      setIntakeId(data.id)
      router.push(`/portal/design?intake_id=${data.id}`)
    } catch (err) {
      console.error('Submit error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render Steps ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 onStart={() => setStep(2)} />
      case 2: return (
        <Step2 form={form} up={up} valid={!!step2Valid}
          onNext={editFromReview ? returnToReview : goNext}
          onBack={goBack} edit={editFromReview} />
      )
      case 3: return (
        <Step3 form={form} up={up} valid={step3Valid}
          onNext={editFromReview ? returnToReview : goNext}
          onBack={goBack} edit={editFromReview} />
      )
      case 4: return (
        <Step4 form={form} up={up} hasMarine={hasMarine}
          onNext={editFromReview ? returnToReview : goNext}
          onBack={goBack} edit={editFromReview}
          onVehiclePhotos={handleVehiclePhotos}
          onRemovePhoto={removeVehiclePhoto} />
      )
      case 5: return (
        <Step5 form={form} up={up}
          onNext={editFromReview ? returnToReview : goNext}
          onBack={goBack} edit={editFromReview}
          onLogoFile={handleLogoFile}
          onInspirationFiles={handleInspirationFiles} />
      )
      case 6: return (
        <Step6
          messages={aiMessages} input={aiInput} onInputChange={setAiInput}
          onSend={handleAiSend} streaming={aiStreaming}
          unavailable={aiUnavailable} canContinue={step6CanContinue}
          visionNotes={form.visionNotes}
          onVisionNotes={(v) => up({ visionNotes: v })}
          onNext={editFromReview ? returnToReview : goNext}
          onBack={goBack} chatBottomRef={chatBottomRef} />
      )
      case 7: return (
        <Step7 form={form} hasVehicle={hasVehicle} hasMarine={hasMarine}
          submitting={submitting} onSubmit={handleSubmit}
          onEdit={jumpTo} onBack={goBack} />
      )
      default: return null
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        * { box-sizing: border-box; }
        input, select, textarea { color: #e8eaed !important; }
        input::placeholder, textarea::placeholder { color: #5a6080 !important; }
        input:focus, select:focus, textarea:focus {
          border-color: #4f7fff !important; outline: none;
        }
      `}</style>

      <div style={s.page}>
        {step > 1 && (
          <>
            <div style={s.progressBar}>
              <div style={{
                height: '100%', background: '#4f7fff',
                width: `${progress}%`, transition: 'width 0.4s ease',
                boxShadow: '0 0 8px rgba(79,127,255,0.6)',
              }} />
            </div>
            <div style={s.stepLabel}>Step {step} of {TOTAL_STEPS}</div>
          </>
        )}

        <div style={{ width: '100%', flex: 1 }}>
          {renderStep()}
        </div>
      </div>
    </>
  )
}

// ── Step 1: Hero ──────────────────────────────────────────────────────────────

function Step1({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      textAlign: 'center', background: '#0d0f14', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,127,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, animation: 'fadeUp 0.5s ease forwards' }}>
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, letterSpacing: '0.25em',
            color: '#4f7fff', textTransform: 'uppercase', marginBottom: 8,
          }}>USA WRAP CO</div>
          <div style={{
            width: 48, height: 2, background: 'linear-gradient(90deg, #4f7fff, #8b5cf6)',
            margin: '0 auto', borderRadius: 2,
          }} />
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(36px, 10vw, 64px)', fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.04em', color: '#e8eaed', marginBottom: 24,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {"Let's Create"}<br />
          <span style={{
            background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Something Iconic.</span>
        </h1>

        <p style={{
          fontSize: 18, color: '#9299b5', lineHeight: 1.7, marginBottom: 56, maxWidth: 420, margin: '0 auto 56px',
        }}>
          Tell us about your brand and vision. Our design team will craft something that turns heads and drives business.
        </p>

        <button
          onClick={onStart}
          style={{
            ...s.primaryBtn, fontSize: 18, padding: '18px 36px', borderRadius: 14,
            boxShadow: '0 0 60px rgba(79,127,255,0.5), 0 8px 32px rgba(79,127,255,0.4)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.transform = 'translateY(-2px) scale(1.02)'
            el.style.boxShadow = '0 0 80px rgba(79,127,255,0.6), 0 12px 40px rgba(79,127,255,0.5)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.transform = ''
            el.style.boxShadow = '0 0 60px rgba(79,127,255,0.5), 0 8px 32px rgba(79,127,255,0.4)'
          }}
        >
          Get Started <ChevronRight size={20} />
        </button>

        <div style={{ marginTop: 32, fontSize: 13, color: '#5a6080' }}>
          Takes about 5 minutes &middot; No commitment required
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Contact Info ──────────────────────────────────────────────────────

function Step2({ form, up, valid, onNext, onBack, edit }: {
  form: FormState; up: (p: Partial<FormState>) => void
  valid: boolean; onNext: () => void; onBack: () => void; edit: boolean
}) {
  return (
    <div style={s.card}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#4f7fff', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        Step 1 of 6
      </div>
      <h2 style={s.heading}>First, tell us about yourself</h2>
      <p style={{ ...s.subtext, marginBottom: 32 }}>{"We'll use this to reach out about your project."}</p>

      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Full Name *</label>
          <input style={s.input} value={form.name} placeholder="Jane Smith"
            onChange={e => up({ name: e.target.value })} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Business Name</label>
          <input style={s.input} value={form.businessName} placeholder="Acme Co"
            onChange={e => up({ businessName: e.target.value })} />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Email *</label>
        <input style={s.input} type="email" value={form.email} placeholder="you@yourbusiness.com"
          onChange={e => up({ email: e.target.value })} />
      </div>

      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Phone *</label>
          <input style={s.input} type="tel" value={form.phone} placeholder="(253) 555-0100"
            onChange={e => up({ phone: e.target.value })} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Website (optional)</label>
          <input style={s.input} value={form.website} placeholder="yourbusiness.com"
            onChange={e => up({ website: e.target.value })} />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>How did you hear about us?</label>
        <select style={s.select} value={form.referralSource}
          onChange={e => up({ referralSource: e.target.value })}>
          <option value="">Select one...</option>
          {REFERRAL_SOURCES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <NavButtons valid={valid} onNext={onNext} onBack={onBack} step={2} isEdit={edit}
        nextLabel={edit ? 'Save & Return to Review' : undefined} />
    </div>
  )
}

// ── Step 3: Services ──────────────────────────────────────────────────────────

function Step3({ form, up, valid, onNext, onBack, edit }: {
  form: FormState; up: (p: Partial<FormState>) => void
  valid: boolean; onNext: () => void; onBack: () => void; edit: boolean
}) {
  const toggle = (id: string) => {
    const next = form.services.includes(id)
      ? form.services.filter(s => s !== id)
      : [...form.services, id]
    up({ services: next })
  }

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#4f7fff', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        Step 2 of 6
      </div>
      <h2 style={s.heading}>What would you like designed?</h2>
      <p style={{ ...s.subtext, marginBottom: 32 }}>Select all that apply.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {SERVICES.map(svc => {
          const selected = form.services.includes(svc.id)
          return (
            <button
              key={svc.id}
              onClick={() => toggle(svc.id)}
              style={{
                background: selected ? 'rgba(79,127,255,0.12)' : '#13151c',
                border: selected ? '2px solid #4f7fff' : '2px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '18px 16px', cursor: 'pointer',
                textAlign: 'left' as const, position: 'relative' as const,
                transition: 'all 0.2s',
              }}
            >
              {selected && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#4f7fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} color="#fff" />
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 8 }}>{svc.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>{svc.label}</div>
              <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.4 }}>{svc.desc}</div>
            </button>
          )
        })}
      </div>

      {!valid && (
        <div style={{ fontSize: 13, color: '#f25a5a', marginBottom: 16 }}>
          Please select at least one service to continue.
        </div>
      )}

      <NavButtons valid={valid} onNext={onNext} onBack={onBack} step={3} isEdit={edit}
        nextLabel={edit ? 'Save & Return to Review' : undefined} />
    </div>
  )
}

// ── Step 4: Vehicle Details ───────────────────────────────────────────────────

function Step4({ form, up, hasMarine, onNext, onBack, edit, onVehiclePhotos, onRemovePhoto }: {
  form: FormState; up: (p: Partial<FormState>) => void; hasMarine: boolean
  onNext: () => void; onBack: () => void; edit: boolean
  onVehiclePhotos: (f: FileList | null) => void
  onRemovePhoto: (i: number) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#4f7fff', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        Step 3 of 6
      </div>
      <h2 style={s.heading}>Tell us about the vehicle(s)</h2>
      <p style={{ ...s.subtext, marginBottom: 32 }}>Give us the details so we can design to fit perfectly.</p>

      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Year</label>
          <input style={s.input} type="number" value={form.vehicleYear} placeholder="2023"
            onChange={e => up({ vehicleYear: e.target.value })} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Quantity</label>
          <input style={s.input} type="number" min="1" value={form.vehicleQuantity}
            onChange={e => up({ vehicleQuantity: e.target.value })} />
        </div>
      </div>

      <div style={s.row}>
        <div style={s.field}>
          <label style={s.label}>Make</label>
          <input style={s.input} value={form.vehicleMake} placeholder="Ford"
            onChange={e => up({ vehicleMake: e.target.value })} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Model</label>
          <input style={s.input} value={form.vehicleModel} placeholder="Transit 250"
            onChange={e => up({ vehicleModel: e.target.value })} />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Current Vehicle Color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="color" value={form.vehicleColor}
            onChange={e => up({ vehicleColor: e.target.value })}
            style={{ width: 48, height: 48, borderRadius: 8, border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'none' }} />
          <div style={{ fontSize: 14, color: '#9299b5' }}>
            {form.vehicleColor.toUpperCase()}
          </div>
        </div>
      </div>

      {hasMarine && (
        <>
          <div style={s.field}>
            <label style={s.label}>Boat Type</label>
            <select style={s.select} value={form.boatType}
              onChange={e => up({ boatType: e.target.value })}>
              <option value="">Select type...</option>
              {BOAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Length (feet)</label>
            <input style={s.input} type="number" value={form.boatLength} placeholder="24"
              onChange={e => up({ boatLength: e.target.value })} />
          </div>
        </>
      )}

      <div style={s.field}>
        <label style={s.label}>Is there existing wrap to remove?</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Yes', 'No'].map(opt => (
            <button key={opt}
              onClick={() => up({ hasExistingWrap: opt === 'Yes' })}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: (form.hasExistingWrap ? 'Yes' : 'No') === opt ? '#4f7fff' : '#1a1d27',
                color: '#e8eaed', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >{opt}</button>
          ))}
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>Vehicle Photos (optional)</label>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); onVehiclePhotos(e.dataTransfer.files) }}
          onClick={() => document.getElementById('veh-photos')?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#4f7fff' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '24px', textAlign: 'center' as const,
            cursor: 'pointer', transition: 'border-color 0.2s',
            background: dragOver ? 'rgba(79,127,255,0.05)' : 'transparent',
          }}
        >
          <Upload size={24} color="#9299b5" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 14, color: '#9299b5' }}>Drop photos here or click to browse</div>
          <div style={{ fontSize: 12, color: '#5a6080', marginTop: 4 }}>JPG, PNG, HEIC accepted</div>
        </div>
        <input id="veh-photos" type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => onVehiclePhotos(e.target.files)} />

        {form.vehiclePhotoUrls.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 12 }}>
            {form.vehiclePhotoUrls.map((url, i) => (
              <div key={i} style={{ position: 'relative' as const }}>
                <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover' as const, borderRadius: 8 }} />
                <button onClick={() => onRemovePhoto(i)} style={{
                  position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                  background: '#f25a5a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={12} color="#fff" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <NavButtons valid={true} onNext={onNext} onBack={onBack} step={4} isEdit={edit}
        nextLabel={edit ? 'Save & Return to Review' : undefined} />
    </div>
  )
}

// ── Step 5: Brand Assets ──────────────────────────────────────────────────────

function Step5({ form, up, onNext, onBack, edit, onLogoFile, onInspirationFiles }: {
  form: FormState; up: (p: Partial<FormState>) => void
  onNext: () => void; onBack: () => void; edit: boolean
  onLogoFile: (f: FileList | null) => void
  onInspirationFiles: (f: FileList | null) => void
}) {
  const [inspiDrag, setInspiDrag] = useState(false)

  const addColor = () => {
    if (form.brandColors.length >= 4) return
    up({ brandColors: [...form.brandColors, '#22c07a'] })
  }

  const updateColor = (i: number, val: string) => {
    const colors = [...form.brandColors]
    colors[i] = val
    up({ brandColors: colors })
  }

  const removeColor = (i: number) => {
    up({ brandColors: form.brandColors.filter((_, idx) => idx !== i) })
  }

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#4f7fff', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        Step 4 of 6
      </div>
      <h2 style={s.heading}>Tell us about your brand</h2>
      <p style={{ ...s.subtext, marginBottom: 32 }}>{"The more context you share, the better we'll nail the look."}</p>

      {/* Logo status */}
      <div style={s.field}>
        <label style={s.label}>Do you have a logo?</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['yes', 'no', 'in_progress'] as const).map(opt => (
            <button key={opt}
              onClick={() => up({ hasLogo: opt })}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 10,
                border: form.hasLogo === opt ? '2px solid #4f7fff' : '2px solid rgba(255,255,255,0.08)',
                background: form.hasLogo === opt ? 'rgba(79,127,255,0.12)' : '#13151c',
                color: form.hasLogo === opt ? '#e8eaed' : '#9299b5',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'In Progress'}
            </button>
          ))}
        </div>
      </div>

      {form.hasLogo === 'yes' && (
        <div style={s.field}>
          <label style={s.label}>Upload your logo</label>
          <div onClick={() => document.getElementById('logo-upload')?.click()}
            style={{
              border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12,
              padding: '20px', textAlign: 'center' as const, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}
          >
            {form.logoPreview ? (
              <img src={form.logoPreview} alt="logo" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' as const }} />
            ) : (
              <>
                <Upload size={20} color="#9299b5" />
                <div>
                  <div style={{ fontSize: 14, color: '#9299b5' }}>Click to upload</div>
                  <div style={{ fontSize: 12, color: '#5a6080' }}>PNG, AI, EPS, PDF, SVG</div>
                </div>
              </>
            )}
          </div>
          <input id="logo-upload" type="file" accept=".png,.ai,.eps,.pdf,.svg,image/*" style={{ display: 'none' }}
            onChange={e => onLogoFile(e.target.files)} />
        </div>
      )}

      {/* Brand colors */}
      <div style={s.field}>
        <label style={s.label}>Brand Colors</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          {form.brandColors.map((color, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' as const }}>
                <input type="color" value={color} onChange={e => updateColor(i, e.target.value)}
                  style={{ width: 44, height: 44, borderRadius: 8, border: '2px solid rgba(255,255,255,0.12)', cursor: 'pointer' }} />
                {i > 0 && (
                  <button onClick={() => removeColor(i)} style={{
                    position: 'absolute', top: -8, right: -8, width: 18, height: 18,
                    borderRadius: '50%', background: '#f25a5a', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={10} color="#fff" />
                  </button>
                )}
              </div>
              <span style={{ fontSize: 12, color: '#5a6080', fontFamily: 'monospace' }}>{color.toUpperCase()}</span>
            </div>
          ))}
          {form.brandColors.length < 4 && (
            <button onClick={addColor} style={{
              width: 44, height: 44, borderRadius: 8, border: '2px dashed rgba(255,255,255,0.2)',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={18} color="#9299b5" />
            </button>
          )}
        </div>
      </div>

      {/* Brand words */}
      <div style={s.field}>
        <label style={s.label}>Describe your brand in 3 words</label>
        <input style={s.input} value={form.brandWords}
          placeholder="Bold. Modern. Trustworthy."
          onChange={e => up({ brandWords: e.target.value })} />
      </div>

      {/* Industry */}
      <div style={s.field}>
        <label style={s.label}>Industry</label>
        <select style={s.select} value={form.industry}
          onChange={e => up({ industry: e.target.value })}>
          <option value="">Select industry...</option>
          {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
      </div>

      {/* Inspiration upload */}
      <div style={s.field}>
        <label style={s.label}>Inspiration Images (optional)</label>
        <div
          onDragOver={e => { e.preventDefault(); setInspiDrag(true) }}
          onDragLeave={() => setInspiDrag(false)}
          onDrop={e => { e.preventDefault(); setInspiDrag(false); onInspirationFiles(e.dataTransfer.files) }}
          onClick={() => document.getElementById('inspi-upload')?.click()}
          style={{
            border: `2px dashed ${inspiDrag ? '#4f7fff' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, padding: '20px', textAlign: 'center' as const,
            cursor: 'pointer', transition: 'border-color 0.2s',
          }}
        >
          <Upload size={20} color="#9299b5" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 14, color: '#9299b5' }}>Drop inspiration images or click to browse</div>
        </div>
        <input id="inspi-upload" type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => onInspirationFiles(e.target.files)} />
        {form.inspirationUrls.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 10 }}>
            {form.inspirationUrls.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover' as const, borderRadius: 8 }} />
            ))}
          </div>
        )}
      </div>

      {/* Inspiration link */}
      <div style={s.field}>
        <label style={s.label}>Link to Pinterest board or website (optional)</label>
        <input style={s.input} value={form.inspirationLink}
          placeholder="pinterest.com/yourboard"
          onChange={e => up({ inspirationLink: e.target.value })} />
      </div>

      <NavButtons valid={true} onNext={onNext} onBack={onBack} step={5} isEdit={edit}
        nextLabel={edit ? 'Save & Return to Review' : undefined} />
    </div>
  )
}

// ── Step 6: AI Concierge ──────────────────────────────────────────────────────

function Step6({
  messages, input, onInputChange, onSend, streaming,
  unavailable, canContinue, visionNotes, onVisionNotes,
  onNext, onBack, chatBottomRef,
}: {
  messages: ChatMessage[]; input: string
  onInputChange: (v: string) => void; onSend: () => void
  streaming: boolean; unavailable: boolean; canContinue: boolean
  visionNotes: string; onVisionNotes: (v: string) => void
  onNext: () => void; onBack: () => void
  chatBottomRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div style={{ ...s.card, paddingBottom: 0 }}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#4f7fff', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        Step 5 of 6
      </div>
      <h2 style={{ ...s.heading, fontSize: 'clamp(24px, 6vw, 36px)', marginBottom: 8 }}>
        Now let&apos;s get creative together
      </h2>
      <p style={{ fontSize: 15, color: '#9299b5', lineHeight: 1.6, marginBottom: 24 }}>
        Our AI design concierge will ask a few quick questions to make sure we nail your vision.
      </p>

      {/* Unavailability banner */}
      {unavailable && (
        <div style={{
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>
              AI Concierge is temporarily unavailable
            </div>
            <div style={{ fontSize: 13, color: '#9299b5' }}>
              Describe your vision below and we&apos;ll follow up with any questions.
            </div>
          </div>
        </div>
      )}

      {/* Chat window */}
      <div style={{
        flex: 1, background: '#13151c', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)',
        padding: '16px', marginBottom: 16, overflowY: 'auto' as const,
        minHeight: 280, maxHeight: 340, display: 'flex', flexDirection: 'column' as const, gap: 12,
      }}>
        {messages.length === 0 && !streaming && !unavailable && (
          <div style={{ textAlign: 'center' as const, color: '#5a6080', fontSize: 14, margin: 'auto' }}>
            Connecting to AI concierge...
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f7fff,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' as const,
              }}>AI</div>
            )}
            <div style={{
              maxWidth: '78%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#4f7fff' : '#1a1d27',
              fontSize: 14, color: '#e8eaed', lineHeight: 1.6,
              whiteSpace: 'pre-wrap' as const,
            }}>
              {msg.content.replace('BRIEF_COMPLETE', '').trim()}
            </div>
          </div>
        ))}

        {streaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f7fff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>AI</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 150, 300].map(d => (
                <div key={d} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#9299b5',
                  animation: 'pulse 1.2s ease-in-out infinite',
                  animationDelay: `${d}ms`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Text fallback or chat input */}
      {unavailable ? (
        <div style={s.field}>
          <label style={s.label}>Describe your vision</label>
          <textarea
            value={visionNotes}
            onChange={e => onVisionNotes(e.target.value)}
            placeholder="Tell us about the look and feel you're going for, any colors or styles you love, your deadline, and anything else that matters..."
            rows={5}
            style={{
              ...s.input, resize: 'vertical' as const, fontFamily: 'inherit',
              lineHeight: 1.6,
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <input
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Type your answer..."
            disabled={streaming}
            style={{
              ...s.input, flex: 1,
              opacity: streaming ? 0.6 : 1,
            }}
          />
          <button onClick={onSend} disabled={!input.trim() || streaming}
            style={{
              ...s.primaryBtn, padding: '13px 18px', borderRadius: 10,
              opacity: (!input.trim() || streaming) ? 0.5 : 1,
              cursor: (!input.trim() || streaming) ? 'not-allowed' : 'pointer',
              boxShadow: 'none',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 40, marginTop: 8 }}>
        <button onClick={onBack} style={s.secondaryBtn}>Back</button>
        {canContinue && (
          <button onClick={onNext} style={s.primaryBtn}>
            Continue <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Step 7: Review & Submit ───────────────────────────────────────────────────

function Step7({ form, hasVehicle, hasMarine, submitting, onSubmit, onEdit, onBack }: {
  form: FormState; hasVehicle: boolean; hasMarine: boolean
  submitting: boolean; onSubmit: () => void
  onEdit: (step: number) => void; onBack: () => void
}) {
  const serviceLabels = form.services.map(id =>
    SERVICES.find(s => s.id === id)?.label ?? id
  )

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#4f7fff', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
        Final Step
      </div>
      <h2 style={s.heading}>{"Here's your project brief"}</h2>
      <p style={{ ...s.subtext, marginBottom: 32 }}>Everything look good? Edit any section before submitting.</p>

      {/* Contact */}
      <SummarySection title="Contact Info" onEdit={() => onEdit(2)}>
        <SummaryRow label="Name" value={form.name} />
        {form.businessName && <SummaryRow label="Business" value={form.businessName} />}
        <SummaryRow label="Email" value={form.email} />
        <SummaryRow label="Phone" value={form.phone} />
        {form.website && <SummaryRow label="Website" value={form.website} />}
        {form.referralSource && <SummaryRow label="Referral" value={form.referralSource} />}
      </SummarySection>

      {/* Services */}
      <SummarySection title="Services" onEdit={() => onEdit(3)}>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 4 }}>
          {serviceLabels.map(l => (
            <span key={l} style={{
              background: 'rgba(79,127,255,0.15)', color: '#4f7fff', borderRadius: 20,
              padding: '4px 12px', fontSize: 13, fontWeight: 500,
            }}>{l}</span>
          ))}
        </div>
      </SummarySection>

      {/* Vehicle */}
      {hasVehicle && (
        <SummarySection title="Vehicle Details" onEdit={() => onEdit(4)}>
          {(form.vehicleYear || form.vehicleMake || form.vehicleModel) && (
            <SummaryRow label="Vehicle" value={`${form.vehicleYear} ${form.vehicleMake} ${form.vehicleModel}`.trim()} />
          )}
          <SummaryRow label="Quantity" value={form.vehicleQuantity} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ fontSize: 13, color: '#9299b5', width: 100, flexShrink: 0 }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: form.vehicleColor, border: '1px solid rgba(255,255,255,0.15)' }} />
              <span style={{ fontSize: 14, color: '#e8eaed', fontFamily: 'monospace' }}>{form.vehicleColor.toUpperCase()}</span>
            </div>
          </div>
          <SummaryRow label="Existing Wrap" value={form.hasExistingWrap ? 'Yes, needs removal' : 'No'} />
          {form.vehiclePhotos.length > 0 && <SummaryRow label="Photos" value={`${form.vehiclePhotos.length} uploaded`} />}
          {hasMarine && form.boatType && <SummaryRow label="Boat Type" value={form.boatType} />}
          {hasMarine && form.boatLength && <SummaryRow label="Length" value={`${form.boatLength} ft`} />}
        </SummarySection>
      )}

      {/* Brand */}
      <SummarySection title="Brand Assets" onEdit={() => onEdit(5)}>
        <SummaryRow label="Has Logo" value={form.hasLogo === 'yes' ? 'Yes' : form.hasLogo === 'no' ? 'No' : 'In Progress'} />
        {form.brandWords && <SummaryRow label="Brand Words" value={form.brandWords} />}
        {form.industry && <SummaryRow label="Industry" value={form.industry} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ fontSize: 13, color: '#9299b5', width: 100, flexShrink: 0 }}>Colors</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {form.brandColors.map((c, i) => (
              <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        {form.inspirationLink && <SummaryRow label="Inspo Link" value={form.inspirationLink} />}
        {form.inspirationFiles.length > 0 && <SummaryRow label="Inspo Images" value={`${form.inspirationFiles.length} uploaded`} />}
      </SummarySection>

      {/* Vision */}
      {(form.aiConversation.length > 0 || form.visionNotes) && (
        <SummarySection title="Vision Notes" onEdit={() => onEdit(6)}>
          <div style={{ fontSize: 13, color: '#9299b5' }}>
            {form.aiConversation.length > 0
              ? `${form.aiConversation.length} messages with AI concierge`
              : form.visionNotes.slice(0, 80) + (form.visionNotes.length > 80 ? '...' : '')}
          </div>
        </SummarySection>
      )}

      <div style={{ marginTop: 32 }}>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            ...s.primaryBtn, width: '100%', justifyContent: 'center',
            fontSize: 17, padding: '18px 24px', borderRadius: 14,
            boxShadow: submitting ? 'none' : '0 0 60px rgba(79,127,255,0.4), 0 8px 24px rgba(79,127,255,0.3)',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Submitting...' : 'Submit & Continue to Design →'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button onClick={onBack} style={s.secondaryBtn}>Back</button>
        </div>
      </div>
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function NavButtons({ valid, onNext, onBack, step, isEdit, nextLabel }: {
  valid: boolean; onNext: () => void; onBack: () => void; step: number
  isEdit?: boolean; nextLabel?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
      {step > 1 ? (
        <button onClick={onBack} style={s.secondaryBtn}>Back</button>
      ) : <div />}
      <button
        onClick={onNext}
        disabled={!valid}
        style={{
          ...s.primaryBtn,
          opacity: valid ? 1 : 0.4,
          cursor: valid ? 'pointer' : 'not-allowed',
          boxShadow: valid ? '0 0 40px rgba(79,127,255,0.35), 0 4px 20px rgba(79,127,255,0.25)' : 'none',
        }}
      >
        {nextLabel ?? 'Continue'} <ChevronRight size={16} />
      </button>
    </div>
  )
}

function SummarySection({ title, onEdit, children }: {
  title: string; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#13151c', borderRadius: 14, padding: '20px',
      marginBottom: 16, border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#9299b5', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          {title}
        </div>
        <button onClick={onEdit} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#9299b5',
          cursor: 'pointer',
        }}>Edit</button>
      </div>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, color: '#9299b5', width: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#e8eaed', textAlign: 'right' as const, flex: 1, marginLeft: 8, wordBreak: 'break-word' as const }}>{value}</span>
    </div>
  )
}
