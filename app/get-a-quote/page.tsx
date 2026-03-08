'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Car, Truck, Bus, Package, Anchor, ArrowRight,
  CheckCircle, Upload, X, Phone, Mail, User, Building2,
  MessageSquare, Sparkles, Zap, ChevronRight,
} from 'lucide-react'

// ── Vehicle types for the form ────────────────────────────────────────────────
const VEHICLE_OPTIONS = [
  { id: 'car',       label: 'Car / Sedan',       Icon: Car    },
  { id: 'suv',       label: 'SUV / Crossover',   Icon: Car    },
  { id: 'pickup',    label: 'Pickup / Truck',     Icon: Truck  },
  { id: 'van',       label: 'Cargo Van',          Icon: Bus    },
  { id: 'sprinter',  label: 'Sprinter',           Icon: Bus    },
  { id: 'box_truck', label: 'Box Truck',          Icon: Package },
  { id: 'trailer',   label: 'Trailer',            Icon: Truck  },
  { id: 'boat',      label: 'Boat / Marine',      Icon: Anchor },
]

// ── Wrap coverage options ─────────────────────────────────────────────────────
const COVERAGE_OPTIONS = [
  { id: 'full',    label: 'Full Wrap',     desc: '100% coverage' },
  { id: 'half',    label: 'Half Wrap',     desc: 'Doors + lower body' },
  { id: 'quarter', label: 'Quarter Wrap',  desc: 'Key branding areas' },
  { id: 'spot',    label: 'Spot Graphics', desc: 'Logo + decals only' },
]

// ── Why us points ─────────────────────────────────────────────────────────────
const WHY_US = [
  { title: 'AI-Powered Design', desc: 'Get instant concept mockups using your brand colors and logo in minutes.' },
  { title: 'In-House Production', desc: 'We design, print, and install — no middlemen, no surprises.' },
  { title: 'Fleet Specialists', desc: 'From 1 vehicle to 100+, we handle fleet wraps with precision.' },
  { title: 'Lifetime Support', desc: 'Warranty-backed installs and free touch-up consultations.' },
]

type Mode = 'landing' | 'form' | 'submitted'

export default function GetAQuotePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>('landing')
  const [submitting, setSubmitting] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name:         '',
    email:        '',
    phone:        '',
    company:      '',
    vehicle_type: '',
    coverage:     '',
    fleet_size:   '',
    message:      '',
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
    } else {
      setFilePreview(null)
    }
  }

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.name.trim())  e.name  = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name:         form.name,
        email:        form.email,
        phone:        form.phone,
        company:      form.company,
        message: [
          form.vehicle_type ? `Vehicle type: ${form.vehicle_type}` : '',
          form.coverage     ? `Coverage: ${form.coverage}` : '',
          form.fleet_size   ? `Fleet size: ${form.fleet_size}` : '',
          form.message      ? `Notes: ${form.message}` : '',
        ].filter(Boolean).join('\n'),
        source: 'website_form',
      }
      const res = await fetch('/api/leads/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Submit failed')
      setMode('submitted')
    } catch {
      alert('Something went wrong. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submitted state ───────────────────────────────────────────────────────
  if (mode === 'submitted') {
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(135deg, #0d0f14 0%, #13151c 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
      }}>
        <div style={{
          background: '#13151c', border: '1px solid #1a1d27', borderRadius: 16,
          padding: '3rem', maxWidth: 500, width: '100%', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(34,192,122,0.15)', border: '2px solid #22c07a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          }}>
            <CheckCircle size={36} color="#22c07a" />
          </div>
          <h2 style={{ color: '#e8eaed', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            We got your request!
          </h2>
          <p style={{ color: '#9299b5', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Our team will reach out within 1 business day to discuss your project and provide a custom quote.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/mockup-generator')}
              style={{
                background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '0.75rem 1.5rem', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              <Sparkles size={16} />
              Try the Design Studio
            </button>
            <button
              onClick={() => { setMode('landing'); setForm({ name:'', email:'', phone:'', company:'', vehicle_type:'', coverage:'', fleet_size:'', message:'' }) }}
              style={{
                background: 'transparent', color: '#9299b5',
                border: '1px solid #2a2d3e', borderRadius: 8,
                padding: '0.75rem 1.5rem', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.95rem',
              }}
            >
              Submit another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quote form ────────────────────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(135deg, #0d0f14 0%, #13151c 100%)',
        padding: '2rem 1rem',
      }}>
        {/* Header */}
        <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: '2rem' }}>
          <button
            onClick={() => setMode('landing')}
            style={{
              background: 'none', border: 'none', color: '#9299b5',
              cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}
          >
            ← Back
          </button>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.3)',
              borderRadius: 24, padding: '0.35rem 1rem', marginBottom: '1rem',
            }}>
              <Zap size={14} color="#4f7fff" />
              <span style={{ color: '#4f7fff', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                FREE QUOTE — NO OBLIGATION
              </span>
            </div>
            <h1 style={{
              color: '#e8eaed', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800, margin: '0 0 0.5rem',
            }}>
              Get Your Custom Quote
            </h1>
            <p style={{ color: '#9299b5', fontSize: '1rem' }}>
              Tell us about your project and we&apos;ll get back to you within 1 business day.
            </p>
          </div>

          {/* Form card */}
          <form onSubmit={handleSubmit} style={{
            background: '#13151c', border: '1px solid #1a1d27',
            borderRadius: 16, padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          }}>
            {/* Contact info */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#e8eaed', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Contact Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Field
                  label="Full Name *" icon={<User size={16} />}
                  value={form.name} onChange={v => set('name', v)}
                  placeholder="Jane Smith" error={errors.name}
                />
                <Field
                  label="Email *" icon={<Mail size={16} />} type="email"
                  value={form.email} onChange={v => set('email', v)}
                  placeholder="jane@company.com" error={errors.email}
                />
                <Field
                  label="Phone *" icon={<Phone size={16} />} type="tel"
                  value={form.phone} onChange={v => set('phone', v)}
                  placeholder="(555) 000-0000" error={errors.phone}
                />
                <Field
                  label="Company" icon={<Building2 size={16} />}
                  value={form.company} onChange={v => set('company', v)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Vehicle type */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#e8eaed', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Vehicle Type
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem' }}>
                {VEHICLE_OPTIONS.map(v => {
                  const active = form.vehicle_type === v.id
                  return (
                    <button
                      key={v.id} type="button"
                      onClick={() => set('vehicle_type', v.id)}
                      style={{
                        background: active ? 'rgba(79,127,255,0.15)' : '#1a1d27',
                        border: `1px solid ${active ? '#4f7fff' : '#2a2d3e'}`,
                        borderRadius: 8, padding: '0.75rem 0.5rem', cursor: 'pointer',
                        color: active ? '#4f7fff' : '#9299b5',
                        fontSize: '0.8rem', fontWeight: 600, textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      <v.Icon size={18} />
                      {v.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Coverage */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#e8eaed', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                Wrap Coverage
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
                {COVERAGE_OPTIONS.map(c => {
                  const active = form.coverage === c.id
                  return (
                    <button
                      key={c.id} type="button"
                      onClick={() => set('coverage', c.id)}
                      style={{
                        background: active ? 'rgba(79,127,255,0.15)' : '#1a1d27',
                        border: `1px solid ${active ? '#4f7fff' : '#2a2d3e'}`,
                        borderRadius: 8, padding: '0.75rem 1rem', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ color: active ? '#4f7fff' : '#e8eaed', fontSize: '0.85rem', fontWeight: 600 }}>
                        {c.label}
                      </div>
                      <div style={{ color: '#5a6080', fontSize: '0.75rem', marginTop: 2 }}>{c.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fleet size + message */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <Field
                label="Number of Vehicles" icon={<Car size={16} />}
                value={form.fleet_size} onChange={v => set('fleet_size', v)}
                placeholder="e.g. 1, 5, 20"
              />
              <div>
                <label style={{ display: 'block', color: '#9299b5', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Additional Notes
                </label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#5a6080' }} />
                  <textarea
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Tell us about your design vision, timeline, budget..."
                    rows={3}
                    style={{
                      width: '100%', background: '#1a1d27', border: '1px solid #2a2d3e',
                      borderRadius: 8, color: '#e8eaed', fontSize: '0.9rem',
                      padding: '0.6rem 0.75rem 0.6rem 2.25rem', resize: 'vertical',
                      outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* File upload */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', color: '#9299b5', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Upload a Photo or Logo (optional)
              </label>
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{ display: 'none' }} />
              {filePreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={filePreview} alt="preview" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={() => { setFilePreview(null); setFileName(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{
                      position: 'absolute', top: -6, right: -6, background: '#f25a5a',
                      border: 'none', borderRadius: '50%', width: 20, height: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <X size={11} color="#fff" />
                  </button>
                </div>
              ) : fileName ? (
                <div style={{
                  background: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: 8,
                  padding: '0.6rem 1rem', color: '#9299b5', fontSize: '0.85rem',
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <Upload size={14} />
                  {fileName}
                  <button
                    type="button"
                    onClick={() => { setFileName(null); if (fileRef.current) fileRef.current.value = '' }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f25a5a', display: 'flex' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    background: '#1a1d27', border: '1px dashed #2a2d3e', borderRadius: 8,
                    padding: '1rem 1.5rem', cursor: 'pointer', color: '#5a6080',
                    fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}
                >
                  <Upload size={16} />
                  Click to upload vehicle photo or logo
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={submitting}
              style={{
                width: '100%',
                background: submitting ? '#2a2d3e' : 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '1rem', fontSize: '1rem', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              {submitting ? 'Sending...' : <>Send My Quote Request <ArrowRight size={18} /></>}
            </button>

            <p style={{ color: '#5a6080', fontSize: '0.78rem', textAlign: 'center', marginTop: '1rem' }}>
              We respond within 1 business day. No spam, ever.
            </p>
          </form>
        </div>
      </div>
    )
  }

  // ── Landing (default) ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a0c11 0%, #0d0f14 40%, #111318 100%)',
      color: '#e8eaed',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Hero */}
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: 'clamp(3rem, 8vw, 6rem) 1.5rem 2rem',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)',
          borderRadius: 24, padding: '0.35rem 1rem', marginBottom: '1.5rem',
        }}>
          <Zap size={13} color="#4f7fff" />
          <span style={{ color: '#4f7fff', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Vehicle Wraps · Signs · Fleet Graphics
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 900,
          lineHeight: 1.05, margin: '0 0 1.25rem',
          background: 'linear-gradient(135deg, #e8eaed 0%, #9299b5 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Vehicle Wraps<br />
          <span style={{
            background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Made Easy.
          </span>
        </h1>

        <p style={{
          color: '#9299b5', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.65,
        }}>
          Premium vehicle wraps designed, printed, and installed with an AI-powered design studio so you can see your vision before you commit.
        </p>

        {/* CTA cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem', maxWidth: 680, margin: '0 auto 4rem',
        }}>
          {/* Design Studio CTA */}
          <button
            onClick={() => router.push('/mockup-generator')}
            style={{
              background: 'linear-gradient(135deg, rgba(79,127,255,0.15), rgba(124,92,252,0.15))',
              border: '1px solid rgba(79,127,255,0.4)',
              borderRadius: 14, padding: '1.75rem 1.5rem',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f7fff')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(79,127,255,0.4)')}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div style={{ color: '#e8eaed', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              Start Your Design Now
            </div>
            <div style={{ color: '#9299b5', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              Use our AI design studio to generate concept mockups on your actual vehicle in minutes. No commitment required.
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              color: '#4f7fff', fontWeight: 600, fontSize: '0.85rem',
            }}>
              Launch Design Studio <ChevronRight size={15} />
            </div>
          </button>

          {/* Quote CTA */}
          <button
            onClick={() => setMode('form')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid #1a1d27',
              borderRadius: 14, padding: '1.75rem 1.5rem',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1d27')}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: '#1a1d27', border: '1px solid #2a2d3e',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
            }}>
              <MessageSquare size={20} color="#9299b5" />
            </div>
            <div style={{ color: '#e8eaed', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              Get a Quote
            </div>
            <div style={{ color: '#9299b5', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              Tell us about your vehicle, fleet size, and project goals. We&apos;ll respond with a custom quote within 1 business day.
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              color: '#9299b5', fontWeight: 600, fontSize: '0.85rem',
            }}>
              Request a Quote <ChevronRight size={15} />
            </div>
          </button>
        </div>

        {/* Social proof bar */}
        <div style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '2rem',
          borderTop: '1px solid #1a1d27', paddingTop: '2rem',
          marginBottom: '4rem',
        }}>
          {[
            { value: '1,200+', label: 'Wraps Installed' },
            { value: '98%',    label: 'Customer Satisfaction' },
            { value: '5-Star', label: 'Google Rating' },
            { value: '48hr',   label: 'Average Turnaround' },
          ].map(s => (
            <div key={s.value} style={{ textAlign: 'center' }}>
              <div style={{ color: '#4f7fff', fontSize: '1.4rem', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
                {s.value}
              </div>
              <div style={{ color: '#5a6080', fontSize: '0.78rem', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Why us */}
        <div style={{ textAlign: 'left', maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{
            color: '#e8eaed', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 700, textAlign: 'center', marginBottom: '1.5rem',
          }}>
            Why USA Wrap Co?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {WHY_US.map(w => (
              <div key={w.title} style={{
                background: '#13151c', border: '1px solid #1a1d27',
                borderRadius: 12, padding: '1.25rem',
                display: 'flex', gap: '0.75rem',
              }}>
                <CheckCircle size={18} color="#22c07a" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ color: '#e8eaed', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {w.title}
                  </div>
                  <div style={{ color: '#5a6080', fontSize: '0.82rem', lineHeight: 1.5 }}>{w.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA repeat */}
        <div style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '3rem' }}>
          <button
            onClick={() => setMode('form')}
            style={{
              background: 'linear-gradient(135deg, #4f7fff, #7c5cfc)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '1rem 2.5rem', fontSize: '1rem', fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            }}
          >
            Get My Free Quote <ArrowRight size={18} />
          </button>
          <p style={{ color: '#5a6080', fontSize: '0.8rem', marginTop: '0.75rem' }}>
            No commitment · Responds in 1 business day
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  label, icon, type = 'text', value, onChange, placeholder, error,
}: {
  label: string
  icon?: React.ReactNode
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', color: '#9299b5', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', background: error ? 'rgba(242,90,90,0.05)' : '#1a1d27',
            border: `1px solid ${error ? '#f25a5a' : '#2a2d3e'}`,
            borderRadius: 8, color: '#e8eaed', fontSize: '0.9rem',
            padding: icon ? '0.6rem 0.75rem 0.6rem 2.25rem' : '0.6rem 0.75rem',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {error && <p style={{ color: '#f25a5a', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
    </div>
  )
}
