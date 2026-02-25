'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowRight, ArrowLeft, Upload, X, Check, Send, Loader2,
  Car, Truck, Ship, Store, Shirt, Palette, Package, Smartphone,
  FileText, Sparkles, Flame, Gem, Rainbow, Mountain, PenTool,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface IntakeData {
  contact_name: string
  contact_email: string
  contact_phone: string
  business_name: string
  website_url: string
  how_heard: string
  services_selected: string[]
  vehicle_data: {
    year?: string
    make?: string
    model?: string
    vehicle_type?: string
    length?: string
    boat_type?: string
    quantity?: string
    current_color?: string
    has_existing_wrap?: boolean
  }
  brand_data: {
    has_logo?: string
    colors?: string[]
    three_words?: string
    industry?: string
    target_audience?: string
    inspiration_link?: string
  }
  inspiration_images: string[]
  style_preference: string
}

const SERVICES = [
  { id: 'vehicle_wrap',       label: 'Vehicle Wrap',         desc: 'Cars, trucks, vans',                 icon: Car },
  { id: 'commercial_fleet',   label: 'Commercial Fleet',     desc: 'Box trucks, work vans, semis',       icon: Truck },
  { id: 'trailer_wrap',       label: 'Trailer Wrap',         desc: 'Enclosed, open, boat trailers',      icon: Truck },
  { id: 'marine_boat',        label: 'Marine / Boat',        desc: 'Full hull, deck, console',           icon: Ship },
  { id: 'storefront_signage', label: 'Storefront / Signage', desc: 'Window graphics, wall wraps, signs', icon: Store },
  { id: 'branded_apparel',    label: 'Branded Apparel',      desc: 'Shirts, hats, uniforms',             icon: Shirt },
  { id: 'logo_design',        label: 'Logo Design',          desc: 'New logo or refresh',                icon: PenTool },
  { id: 'brand_package',      label: 'Brand Package',        desc: 'Logo + colors + full identity',      icon: Package },
  { id: 'social_media_kit',   label: 'Social Media Kit',     desc: 'Templates, graphics, banners',       icon: Smartphone },
  { id: 'print_materials',    label: 'Print Materials',      desc: 'Business cards, flyers, brochures',  icon: FileText },
  { id: 'something_else',     label: 'Something Else',       desc: 'I have a unique project',            icon: Sparkles },
]

const STYLES = [
  { id: 'bold_aggressive',     label: 'Bold & Aggressive',     desc: 'High contrast, sharp lines',   icon: Flame,    gradient: 'linear-gradient(135deg, #ff4444, #ff8800)' },
  { id: 'clean_professional',  label: 'Clean & Professional',  desc: 'Minimal, corporate',           icon: Check,    gradient: 'linear-gradient(135deg, #4f7fff, #22d3ee)' },
  { id: 'creative_artistic',   label: 'Creative & Artistic',   desc: 'Illustrated, unique',          icon: Palette,  gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'luxury_premium',      label: 'Luxury & Premium',      desc: 'Elegant, refined',             icon: Gem,      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'colorful_fun',        label: 'Colorful & Fun',        desc: 'Vibrant, energetic',           icon: Rainbow,  gradient: 'linear-gradient(135deg, #22c07a, #22d3ee)' },
  { id: 'rugged_industrial',   label: 'Rugged & Industrial',   desc: 'Tough, textured',              icon: Mountain, gradient: 'linear-gradient(135deg, #6b7280, #374151)' },
]

const INDUSTRIES = [
  'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping',
  'Food & Beverage', 'Real Estate', 'Construction', 'Moving & Hauling',
  'Cleaning Services', 'Auto Detailing', 'Fitness & Wellness',
  'Pet Services', 'Photography', 'Events & Catering', 'Other',
]

const HOW_HEARD = [
  'Google Search', 'Social Media', 'Referral', 'Drove by shop',
  'Trade show / Event', 'Yelp', 'Word of mouth', 'Other',
]

// ── Main Component ──────────────────────────────────────────────────────────
export default function DesignIntakeClient({ token }: { token: string }) {
  const [screen, setScreen] = useState(0)
  const [animDir, setAnimDir] = useState<'next' | 'prev'>('next')
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const [data, setData] = useState<IntakeData>({
    contact_name: '', contact_email: '', contact_phone: '',
    business_name: '', website_url: '', how_heard: '',
    services_selected: [],
    vehicle_data: {},
    brand_data: { colors: [] },
    inspiration_images: [],
    style_preference: '',
  })

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load existing session
  useEffect(() => {
    fetch(`/api/design-intake/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
    // Just verify the token is valid by trying a save with no fields
    setLoading(false)
  }, [token])

  const autoSave = useCallback((fields: Partial<IntakeData>) => {
    fetch('/api/design-intake/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...fields }),
    }).catch(() => {})
  }, [token])

  // Screens: 0=Welcome, 1=Contact, 2=Services, 3=Vehicle(conditional), 4=Brand, 5=Chat, 6=Style, 7=Complete
  const goNext = () => {
    setAnimDir('next')
    const vehicleServices = ['vehicle_wrap', 'commercial_fleet', 'trailer_wrap', 'marine_boat']
    const hasVehicle = data.services_selected.some(s => vehicleServices.includes(s))
    if (screen === 2 && !hasVehicle) {
      setScreen(4) // skip vehicle screen
    } else {
      setScreen(s => s + 1)
    }
  }

  const goBack = () => {
    setAnimDir('prev')
    const vehicleServices = ['vehicle_wrap', 'commercial_fleet', 'trailer_wrap', 'marine_boat']
    const hasVehicle = data.services_selected.some(s => vehicleServices.includes(s))
    if (screen === 4 && !hasVehicle) {
      setScreen(2) // skip back over vehicle
    } else {
      setScreen(s => s - 1)
    }
  }

  const update = (key: keyof IntakeData, value: unknown) => {
    setData(d => ({ ...d, [key]: value }))
  }

  // Send chat message
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')

    const userMsg: ChatMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setChatMessages(prev => [...prev, userMsg])
    setChatLoading(true)

    try {
      const res = await fetch('/api/design-intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          message: msg,
          chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const d = await res.json()
      const aiMsg: ChatMsg = { role: 'assistant', content: d.reply || d.error || 'Something went wrong.', timestamp: new Date().toISOString() }
      setChatMessages(prev => [...prev, aiMsg])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.', timestamp: new Date().toISOString() }])
    }
    setChatLoading(false)
  }

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  // AI greeting on entering chat screen
  useEffect(() => {
    if (screen === 5 && chatMessages.length === 0) {
      const name = data.contact_name?.split(' ')[0] || 'there'
      const services = data.services_selected.map(s =>
        SERVICES.find(sv => sv.id === s)?.label
      ).filter(Boolean).join(', ') || 'your project'

      setChatLoading(true)
      fetch('/api/design-intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          message: `Hi! I just submitted my design intake form. My name is ${data.contact_name}, my business is ${data.business_name || 'not specified'}. I'm interested in: ${services}. Please introduce yourself and ask me your first question.`,
          chatHistory: [],
        }),
      })
        .then(r => r.json())
        .then(d => {
          setChatMessages([{
            role: 'assistant',
            content: d.reply || `Hi ${name}! I'm your design concierge. Tell me more about what you're envisioning!`,
            timestamp: new Date().toISOString(),
          }])
        })
        .catch(() => {
          setChatMessages([{
            role: 'assistant',
            content: `Hi ${name}! I'm your USA Wrap Co design concierge. I've reviewed what you've shared about your ${services} project and I have some ideas. Let me ask you a few quick questions to make sure we nail this. What's the ONE thing you want people to feel when they see this design?`,
            timestamp: new Date().toISOString(),
          }])
        })
        .finally(() => setChatLoading(false))
    }
  }, [screen])

  // Complete submission
  const completeIntake = async () => {
    autoSave({ style_preference: data.style_preference })
    try {
      const res = await fetch('/api/design-intake/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (d.project_id) setProjectId(d.project_id)
    } catch {}
    goNext()
  }

  if (loading) {
    return (
      <div style={styles.fullScreen}>
        <Loader2 size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={styles.fullScreen}>
      {/* Progress bar */}
      {screen > 0 && screen < 7 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: 'rgba(79,127,255,0.1)', zIndex: 50,
        }}>
          <div style={{
            height: '100%', background: 'var(--accent)',
            width: `${(screen / 7) * 100}%`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      )}

      {/* Back button */}
      {screen > 0 && screen < 7 && (
        <button onClick={goBack} style={styles.backBtn}>
          <ArrowLeft size={18} />
        </button>
      )}

      <div style={{
        ...styles.screenContainer,
        animation: `${animDir === 'next' ? 'slideInRight' : 'slideInLeft'} 0.4s ease`,
      }} key={screen}>
        {screen === 0 && <WelcomeScreen onNext={goNext} />}
        {screen === 1 && <ContactScreen data={data} update={update} onNext={() => { autoSave({ contact_name: data.contact_name, contact_email: data.contact_email, contact_phone: data.contact_phone, business_name: data.business_name, website_url: data.website_url, how_heard: data.how_heard }); goNext() }} />}
        {screen === 2 && <ServicesScreen data={data} update={update} onNext={() => { autoSave({ services_selected: data.services_selected }); goNext() }} />}
        {screen === 3 && <VehicleScreen data={data} update={update} onNext={() => { autoSave({ vehicle_data: data.vehicle_data }); goNext() }} />}
        {screen === 4 && <BrandScreen data={data} update={update} onNext={() => { autoSave({ brand_data: data.brand_data }); goNext() }} />}
        {screen === 5 && <ChatScreen messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={sendChat} loading={chatLoading} chatEndRef={chatEndRef} onNext={goNext} />}
        {screen === 6 && <StyleScreen data={data} update={update} onComplete={completeIntake} />}
        {screen === 7 && <CompletionScreen data={data} projectId={projectId} />}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}

// ── Screen 0: Welcome ──────────────────────────────────────────────────────
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 32, textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20, marginBottom: 40,
        background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeUp 0.6s ease',
      }}>
        <Palette size={40} style={{ color: '#fff' }} />
      </div>
      <h1 style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 'clamp(36px, 6vw, 64px)',
        fontWeight: 900,
        color: 'var(--text1)',
        lineHeight: 1.1,
        marginBottom: 20,
        animation: 'fadeUp 0.6s ease 0.1s both',
      }}>
        Let&apos;s Create Something Iconic.
      </h1>
      <p style={{
        fontSize: 'clamp(16px, 2.5vw, 20px)',
        color: 'var(--text2)',
        maxWidth: 560,
        lineHeight: 1.6,
        marginBottom: 48,
        animation: 'fadeUp 0.6s ease 0.2s both',
      }}>
        Tell us about your brand and vision. Our design team will craft something that turns heads and drives business.
      </p>
      <button onClick={onNext} style={{
        ...styles.primaryBtn,
        fontSize: 18, padding: '16px 48px',
        animation: 'fadeUp 0.6s ease 0.3s both',
      }}>
        Get Started <ArrowRight size={20} style={{ marginLeft: 8 }} />
      </button>
    </div>
  )
}

// ── Screen 1: Contact Info ──────────────────────────────────────────────────
function ContactScreen({ data, update, onNext }: { data: IntakeData; update: (k: keyof IntakeData, v: unknown) => void; onNext: () => void }) {
  const valid = data.contact_name.trim() && data.contact_email.trim()
  return (
    <div style={styles.formScreen}>
      <h2 style={styles.screenTitle}>First, tell us about yourself</h2>
      <div style={styles.formGrid}>
        <Input label="Full Name *" value={data.contact_name} onChange={v => update('contact_name', v)} placeholder="John Smith" />
        <Input label="Business Name" value={data.business_name} onChange={v => update('business_name', v)} placeholder="Acme Plumbing" />
        <Input label="Email *" value={data.contact_email} onChange={v => update('contact_email', v)} placeholder="john@acmeplumbing.com" type="email" />
        <Input label="Phone" value={data.contact_phone} onChange={v => update('contact_phone', v)} placeholder="(555) 123-4567" type="tel" />
        <Input label="Website" value={data.website_url} onChange={v => update('website_url', v)} placeholder="https://acmeplumbing.com" fullWidth />
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={styles.label}>How did you hear about us?</label>
          <select
            value={data.how_heard}
            onChange={e => update('how_heard', e.target.value)}
            style={styles.select}
          >
            <option value="">Select...</option>
            {HOW_HEARD.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>
      <button onClick={onNext} disabled={!valid} style={{ ...styles.primaryBtn, opacity: valid ? 1 : 0.4, marginTop: 32 }}>
        Continue <ArrowRight size={18} style={{ marginLeft: 8 }} />
      </button>
    </div>
  )
}

// ── Screen 2+3: Services (shown as one logical screen with a continue button below) ──
function ServicesScreen({ data, update, onNext }: { data: IntakeData; update: (k: keyof IntakeData, v: unknown) => void; onNext: () => void }) {
  const toggle = (id: string) => {
    const curr = data.services_selected
    if (curr.includes(id)) {
      update('services_selected', curr.filter(s => s !== id))
    } else {
      update('services_selected', [...curr, id])
    }
  }

  return (
    <div style={styles.formScreen}>
      <h2 style={styles.screenTitle}>What would you like designed?</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 15 }}>Select all that apply</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        maxWidth: 800,
        width: '100%',
      }}>
        {SERVICES.map(svc => {
          const Icon = svc.icon
          const selected = data.services_selected.includes(svc.id)
          return (
            <button
              key={svc.id}
              onClick={() => toggle(svc.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 10, padding: '20px 16px', borderRadius: 14,
                border: selected ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.06)',
                background: selected ? 'rgba(79,127,255,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                position: 'relative',
              }}
            >
              {selected && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={13} style={{ color: '#fff' }} />
                </div>
              )}
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: selected ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Icon size={24} style={{ color: selected ? 'var(--accent)' : 'var(--text3)' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selected ? 'var(--text1)' : 'var(--text2)' }}>{svc.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{svc.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
      <button onClick={onNext} disabled={data.services_selected.length === 0} style={{
        ...styles.primaryBtn, marginTop: 32,
        opacity: data.services_selected.length === 0 ? 0.4 : 1,
      }}>
        Continue <ArrowRight size={18} style={{ marginLeft: 8 }} />
      </button>
    </div>
  )
}

// ── Screen 4: Vehicle Details ───────────────────────────────────────────────
function VehicleScreen({ data, update, onNext }: { data: IntakeData; update: (k: keyof IntakeData, v: unknown) => void; onNext: () => void }) {
  const vd = data.vehicle_data
  const setVD = (k: string, v: unknown) => update('vehicle_data', { ...vd, [k]: v })

  const hasCarTruck = data.services_selected.some(s => ['vehicle_wrap', 'commercial_fleet'].includes(s))
  const hasTrailer = data.services_selected.includes('trailer_wrap')
  const hasMarine = data.services_selected.includes('marine_boat')

  return (
    <div style={styles.formScreen}>
      <h2 style={styles.screenTitle}>Tell us about the vehicle(s)</h2>
      <div style={styles.formGrid}>
        {hasCarTruck && (
          <>
            <Input label="Year" value={vd.year || ''} onChange={v => setVD('year', v)} placeholder="2024" />
            <Input label="Make" value={vd.make || ''} onChange={v => setVD('make', v)} placeholder="Ford" />
            <Input label="Model" value={vd.model || ''} onChange={v => setVD('model', v)} placeholder="Transit" />
          </>
        )}
        {(hasTrailer || data.services_selected.includes('commercial_fleet')) && (
          <>
            <Input label="Vehicle Type" value={vd.vehicle_type || ''} onChange={v => setVD('vehicle_type', v)} placeholder="Box truck, cargo van, etc." />
            <Input label="Length (ft)" value={vd.length || ''} onChange={v => setVD('length', v)} placeholder="26" />
          </>
        )}
        {hasMarine && (
          <>
            <Input label="Boat Type" value={vd.boat_type || ''} onChange={v => setVD('boat_type', v)} placeholder="Center console, pontoon, etc." />
            <Input label="Length (ft)" value={vd.length || ''} onChange={v => setVD('length', v)} placeholder="24" />
          </>
        )}
        <Input label="Quantity of vehicles" value={vd.quantity || ''} onChange={v => setVD('quantity', v)} placeholder="1" />
        <Input label="Current Color" value={vd.current_color || ''} onChange={v => setVD('current_color', v)} placeholder="White" />
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={styles.label}>Is there existing wrap to remove?</label>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                onClick={() => setVD('has_existing_wrap', opt === 'Yes')}
                style={{
                  padding: '10px 32px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: vd.has_existing_wrap === (opt === 'Yes') ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.06)',
                  background: vd.has_existing_wrap === (opt === 'Yes') ? 'rgba(79,127,255,0.08)' : 'transparent',
                  color: 'var(--text1)', cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={onNext} style={{ ...styles.primaryBtn, marginTop: 32 }}>
        Continue <ArrowRight size={18} style={{ marginLeft: 8 }} />
      </button>
    </div>
  )
}

// ── Screen 5: Brand ─────────────────────────────────────────────────────────
function BrandScreen({ data, update, onNext }: { data: IntakeData; update: (k: keyof IntakeData, v: unknown) => void; onNext: () => void }) {
  const bd = data.brand_data
  const setBD = (k: string, v: unknown) => update('brand_data', { ...bd, [k]: v })
  const [colorInput, setColorInput] = useState('#4f7fff')

  const addColor = () => {
    const colors = bd.colors || []
    if (colors.length < 8 && !colors.includes(colorInput)) {
      setBD('colors', [...colors, colorInput])
    }
  }

  const removeColor = (c: string) => {
    setBD('colors', (bd.colors || []).filter(x => x !== c))
  }

  return (
    <div style={styles.formScreen}>
      <h2 style={styles.screenTitle}>Tell us about your brand</h2>
      <div style={styles.formGrid}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={styles.label}>Do you have a logo?</label>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {['Yes', 'No', 'In Progress'].map(opt => (
              <button
                key={opt}
                onClick={() => setBD('has_logo', opt)}
                style={{
                  padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: bd.has_logo === opt ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.06)',
                  background: bd.has_logo === opt ? 'rgba(79,127,255,0.08)' : 'transparent',
                  color: 'var(--text1)', cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={styles.label}>Primary Brand Colors</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {(bd.colors || []).map(c => (
              <button
                key={c}
                onClick={() => removeColor(c)}
                style={{
                  width: 36, height: 36, borderRadius: 10, background: c,
                  border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                  position: 'relative',
                }}
                title={`Remove ${c}`}
              >
                <X size={14} style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', borderRadius: '50%', padding: 1, color: '#fff' }} />
              </button>
            ))}
            <input
              type="color"
              value={colorInput}
              onChange={e => setColorInput(e.target.value)}
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'none' }}
            />
            <button onClick={addColor} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--surface2)', color: 'var(--text2)', border: 'none', cursor: 'pointer',
            }}>
              Add Color
            </button>
          </div>
        </div>

        <Input label="Describe your brand in 3 words" value={bd.three_words || ''} onChange={v => setBD('three_words', v)} placeholder="Bold, professional, trusted" fullWidth />

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={styles.label}>Industry / Niche</label>
          <select value={bd.industry || ''} onChange={e => setBD('industry', e.target.value)} style={styles.select}>
            <option value="">Select...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <Input label="Target Audience" value={bd.target_audience || ''} onChange={v => setBD('target_audience', v)} placeholder="Homeowners, business owners, etc." fullWidth />
        <Input label="Inspiration Link (Pinterest, website, etc.)" value={bd.inspiration_link || ''} onChange={v => setBD('inspiration_link', v)} placeholder="https://pinterest.com/board/..." fullWidth />
      </div>
      <button onClick={onNext} style={{ ...styles.primaryBtn, marginTop: 32 }}>
        Continue <ArrowRight size={18} style={{ marginLeft: 8 }} />
      </button>
    </div>
  )
}

// ── Screen 6: AI Chat ───────────────────────────────────────────────────────
function ChatScreen({ messages, input, setInput, onSend, loading, chatEndRef, onNext }: {
  messages: ChatMsg[]; input: string; setInput: (v: string) => void; onSend: () => void; loading: boolean; chatEndRef: React.RefObject<HTMLDivElement>; onNext: () => void
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 680,
      width: '100%', margin: '0 auto', padding: '80px 20px 20px',
    }}>
      <h2 style={{ ...styles.screenTitle, fontSize: 24, marginBottom: 8, textAlign: 'left' }}>
        Now let&apos;s get creative together
      </h2>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>
        Our AI design concierge will ask a few questions to understand your vision
      </p>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        paddingBottom: 16, marginBottom: 16,
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeUp 0.3s ease',
            }}
          >
            <div style={{
              maxWidth: '80%', padding: '12px 16px', borderRadius: 16,
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
              color: msg.role === 'user' ? '#fff' : 'var(--text1)',
              fontSize: 14, lineHeight: 1.6,
              borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 20px', borderRadius: 16, borderBottomLeftRadius: 4,
              background: 'var(--surface2)', display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text3)', animation: 'pulse 1.4s infinite' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text3)', animation: 'pulse 1.4s infinite 0.2s' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text3)', animation: 'pulse 1.4s infinite 0.4s' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-end',
        padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder="Type your response..."
          rows={1}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 14,
            background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--text1)', fontSize: 14, resize: 'none', outline: 'none',
            fontFamily: 'inherit',
            minHeight: 44, maxHeight: 120,
          }}
        />
        <button onClick={onSend} disabled={!input.trim() || loading} style={{
          width: 44, height: 44, borderRadius: 12,
          background: input.trim() ? 'var(--accent)' : 'var(--surface2)',
          border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s',
        }}>
          <Send size={18} style={{ color: input.trim() ? '#fff' : 'var(--text3)' }} />
        </button>
      </div>

      {/* Skip / Continue */}
      {messages.length >= 4 && (
        <button onClick={onNext} style={{
          ...styles.primaryBtn, marginTop: 12, alignSelf: 'center',
        }}>
          Continue to Style Selection <ArrowRight size={16} style={{ marginLeft: 6 }} />
        </button>
      )}
    </div>
  )
}

// ── Screen 7: Style ─────────────────────────────────────────────────────────
function StyleScreen({ data, update, onComplete }: { data: IntakeData; update: (k: keyof IntakeData, v: unknown) => void; onComplete: () => void }) {
  return (
    <div style={styles.formScreen}>
      <h2 style={styles.screenTitle}>What&apos;s your vibe?</h2>
      <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 15 }}>Pick the design style that resonates most</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16, maxWidth: 700, width: '100%',
      }}>
        {STYLES.map(s => {
          const Icon = s.icon
          const selected = data.style_preference === s.id
          return (
            <button
              key={s.id}
              onClick={() => update('style_preference', s.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 12, padding: 24, borderRadius: 16, cursor: 'pointer',
                border: selected ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                transition: 'all 0.25s', textAlign: 'center',
                transform: selected ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: s.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: selected ? `0 8px 24px rgba(79,127,255,0.3)` : 'none',
              }}>
                <Icon size={28} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: selected ? 'var(--text1)' : 'var(--text2)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{s.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
      <button
        onClick={onComplete}
        disabled={!data.style_preference}
        style={{ ...styles.primaryBtn, marginTop: 40, opacity: data.style_preference ? 1 : 0.4 }}
      >
        Complete Intake <ArrowRight size={18} style={{ marginLeft: 8 }} />
      </button>
    </div>
  )
}

// ── Screen 8: Completion ────────────────────────────────────────────────────
function CompletionScreen({ data, projectId }: { data: IntakeData; projectId: string | null }) {
  const steps = [
    { done: true, label: 'Brief received', desc: 'Our team reviews your intake (today)' },
    { done: false, label: 'Design begins', desc: 'First concepts in 2-3 business days' },
    { done: false, label: 'Review together', desc: 'Walk through designs in our studio' },
    { done: false, label: 'Revisions', desc: 'Up to 3 rounds included' },
    { done: false, label: 'Final files', desc: 'Print-ready files delivered' },
  ]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #22c07a, #22d3ee)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32, animation: 'fadeUp 0.5s ease',
      }}>
        <Check size={40} style={{ color: '#fff' }} />
      </div>

      <h1 style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 'clamp(32px, 5vw, 48px)',
        fontWeight: 900, color: 'var(--text1)',
        marginBottom: 12, animation: 'fadeUp 0.5s ease 0.1s both',
      }}>
        Welcome to the Design Studio
      </h1>
      <p style={{
        fontSize: 17, color: 'var(--text2)', marginBottom: 48, maxWidth: 480,
        animation: 'fadeUp 0.5s ease 0.15s both',
      }}>
        Your project has been created. Here&apos;s what happens next:
      </p>

      {/* Timeline */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        maxWidth: 420, width: '100%', marginBottom: 48,
        animation: 'fadeUp 0.5s ease 0.2s both',
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: step.done ? 'var(--green)' : 'var(--surface2)',
                border: step.done ? 'none' : '2px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {step.done ? <Check size={16} style={{ color: '#fff' }} /> : (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)' }}>{i + 1}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, height: 32, background: 'rgba(255,255,255,0.06)' }} />
              )}
            </div>
            <div style={{ paddingTop: 4, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{step.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div style={{
        background: 'var(--surface2)', borderRadius: 16, padding: 24,
        maxWidth: 480, width: '100%', textAlign: 'left',
        marginBottom: 32, animation: 'fadeUp 0.5s ease 0.3s both',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Submission Summary
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.contact_name && <SummaryRow label="Name" value={data.contact_name} />}
          {data.business_name && <SummaryRow label="Business" value={data.business_name} />}
          {data.contact_email && <SummaryRow label="Email" value={data.contact_email} />}
          {data.services_selected.length > 0 && (
            <SummaryRow label="Services" value={data.services_selected.map(s => SERVICES.find(sv => sv.id === s)?.label).filter(Boolean).join(', ')} />
          )}
          {data.style_preference && (
            <SummaryRow label="Style" value={STYLES.find(s => s.id === data.style_preference)?.label || data.style_preference} />
          )}
        </div>
      </div>

      <p style={{
        fontSize: 15, color: 'var(--text2)', marginBottom: 32,
        animation: 'fadeUp 0.5s ease 0.35s both',
      }}>
        We&apos;ll be in touch at <strong style={{ color: 'var(--accent)' }}>{data.contact_email}</strong> within 24 hours
      </p>
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, type = 'text', fullWidth }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; fullWidth?: boolean
}) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text3)', minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  fullScreen: {
    minHeight: '100vh',
    background: 'var(--bg, #0d0f14)',
    color: 'var(--text1, #e8eaed)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  screenContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  formScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 24px 48px',
    width: '100%',
    maxWidth: 640,
  },
  screenTitle: {
    fontFamily: 'Barlow Condensed, sans-serif',
    fontSize: 32,
    fontWeight: 900,
    color: 'var(--text1)',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    width: '100%',
    marginTop: 24,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text3)',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text1)',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text1)',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 36px',
    borderRadius: 14,
    background: 'var(--accent, #4f7fff)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  backBtn: {
    position: 'fixed' as const,
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
}
