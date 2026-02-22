'use client'

import { useState } from 'react'
import { Check, ChevronRight, Truck, DollarSign, Palette, CreditCard, Star, Shield, Clock, ArrowRight } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────
type Step = 'vehicle' | 'coverage' | 'style' | 'info' | 'checkout'

interface VehicleOption { id: string; name: string; category: string; sqft: number; basePrice: number }
interface CoverageOption { id: string; label: string; multiplier: number; desc: string }
interface StyleOption { id: string; label: string; desc: string; priceAdj: number }

// ── Data ────────────────────────────────────────────────────────────
const VEHICLES: VehicleOption[] = [
  { id: 'cargo_van',    name: 'Cargo Van',      category: 'Van',     sqft: 240, basePrice: 2800 },
  { id: 'sprinter',     name: 'Sprinter Van',   category: 'Van',     sqft: 280, basePrice: 3400 },
  { id: 'pickup',       name: 'Pickup Truck',   category: 'Truck',   sqft: 120, basePrice: 1800 },
  { id: 'box_truck',    name: 'Box Truck',      category: 'Truck',   sqft: 350, basePrice: 4500 },
  { id: 'sedan',        name: 'Sedan / Car',    category: 'Car',     sqft: 100, basePrice: 1500 },
  { id: 'suv',          name: 'SUV / Crossover',category: 'Car',     sqft: 150, basePrice: 2200 },
  { id: 'trailer',      name: 'Trailer',        category: 'Trailer', sqft: 500, basePrice: 6000 },
  { id: 'food_truck',   name: 'Food Truck',     category: 'Truck',   sqft: 200, basePrice: 3200 },
]

const COVERAGES: CoverageOption[] = [
  { id: 'full',        label: 'Full Wrap',       multiplier: 1.00, desc: 'Complete vehicle coverage — maximum impact' },
  { id: 'partial_3q',  label: '3/4 Partial',    multiplier: 0.75, desc: 'Sides, rear, and partial hood' },
  { id: 'sides_rear',  label: 'Sides + Rear',    multiplier: 0.65, desc: 'Driver/passenger sides and rear doors' },
  { id: 'hood_roof',   label: 'Hood + Roof',     multiplier: 0.25, desc: 'Top panels only — color accent' },
  { id: 'decals',      label: 'Spot Graphics',   multiplier: 0.30, desc: 'Logos, lettering, and spot decals' },
]

const STYLES: StyleOption[] = [
  { id: 'company_brand', label: 'Company Branding',    desc: 'Logo, contact info, brand colors on your fleet',  priceAdj: 0 },
  { id: 'color_change',  label: 'Color Change',        desc: 'Change vehicle color — matte, gloss, chrome, satin', priceAdj: 200 },
  { id: 'premium_print', label: 'Full Custom Design',  desc: 'Our designers create a fully custom graphic design', priceAdj: 500 },
  { id: 'i_have_files',  label: 'I Have Design Files', desc: 'Provide your own print-ready design files',         priceAdj: -200 },
]

const DESIGN_DEPOSIT = 250

function fM(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'vehicle',   label: 'Vehicle' },
  { key: 'coverage',  label: 'Coverage' },
  { key: 'style',     label: 'Style' },
  { key: 'info',      label: 'Your Info' },
  { key: 'checkout',  label: 'Checkout' },
]

export default function ShopClient() {
  const [step, setStep] = useState<Step>('vehicle')
  const [vehicle, setVehicle]     = useState<VehicleOption | null>(null)
  const [coverage, setCoverage]   = useState<CoverageOption | null>(null)
  const [style, setStyle]         = useState<StyleOption | null>(null)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', vehicle_year: '', vehicle_make: '', vehicle_model: '', notes: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const estimate = vehicle && coverage && style
    ? Math.round((vehicle.basePrice * coverage.multiplier) + style.priceAdj)
    : null

  const stepIdx = STEPS.findIndex(s => s.key === step)

  function next() {
    if (step === 'vehicle'  && !vehicle)  return
    if (step === 'coverage' && !coverage) return
    if (step === 'style'    && !style)    return
    const nextStep = STEPS[stepIdx + 1]
    if (nextStep) setStep(nextStep.key)
  }

  function back() {
    const prevStep = STEPS[stepIdx - 1]
    if (prevStep) setStep(prevStep.key)
  }

  async function handleSubmit() {
    if (!form.name || !form.email) return
    setSubmitting(true)

    // Submit lead to internal API
    try {
      await fetch('/api/shop/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: vehicle?.name,
          coverage: coverage?.label,
          style: style?.label,
          estimate,
          ...form,
        }),
      })
    } catch {}

    setSubmitted(true)
    setSubmitting(false)
  }

  // ── Submitted state ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,192,122,0.15)', border: '2px solid #22c07a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={28} style={{ color: '#22c07a' }} />
          </div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 900, color: '#e8eaed', margin: '0 0 8px' }}>
            Request Received!
          </h2>
          <p style={{ fontSize: 15, color: '#9299b5', lineHeight: 1.6, margin: '0 0 24px' }}>
            Thank you, <strong style={{ color: '#e8eaed' }}>{form.name}</strong>! We&apos;ll reach out within 24 hours to confirm your quote and next steps.
          </p>
          <div style={{ padding: '16px 24px', borderRadius: 12, background: '#13151c', border: '1px solid #2a2f3d', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#5a6080', marginBottom: 4 }}>Estimated Range</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>
              {estimate ? `${fM(estimate)} – ${fM(estimate * 1.15)}` : 'TBD'}
            </div>
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>Final quote after vehicle inspection</div>
          </div>
          <div style={{ fontSize: 12, color: '#9299b5' }}>
            Check <strong style={{ color: '#e8eaed' }}>{form.email}</strong> for confirmation details.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#13151c', borderBottom: '1px solid #2a2f3d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={20} style={{ color: '#4f7fff' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 900, color: '#e8eaed', letterSpacing: '0.04em' }}>
            USA WRAP CO
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#22c07a' }}>
            <Shield size={13} /> Licensed & Insured
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9299b5' }}>
            <Star size={13} style={{ fill: '#f59e0b', color: '#f59e0b' }} /> 4.9 / 5 (230+ reviews)
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < stepIdx ? '#22c07a' : i === stepIdx ? '#4f7fff' : '#2a2f3d',
                  border: `2px solid ${i < stepIdx ? '#22c07a' : i === stepIdx ? '#4f7fff' : '#2a2f3d'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i < stepIdx ? (
                    <Check size={13} color="#fff" strokeWidth={3} />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: i === stepIdx ? '#fff' : '#5a6080' }}>{i + 1}</span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < stepIdx ? '#22c07a' : '#2a2f3d' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {STEPS.map((s, i) => (
              <span key={s.key} style={{ fontSize: 10, color: i === stepIdx ? '#4f7fff' : '#5a6080', fontWeight: i === stepIdx ? 700 : 400, textAlign: 'center', flex: 1 }}>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Step title */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 900, color: '#e8eaed', margin: 0 }}>
            {step === 'vehicle'  && 'Select Your Vehicle'}
            {step === 'coverage' && 'How Much Coverage?'}
            {step === 'style'    && 'Design Style'}
            {step === 'info'     && 'Your Contact Info'}
            {step === 'checkout' && 'Review & Submit'}
          </h2>
          <p style={{ fontSize: 13, color: '#9299b5', margin: '4px 0 0' }}>
            {step === 'vehicle'  && 'Choose the type of vehicle you want wrapped.'}
            {step === 'coverage' && 'How much of the vehicle do you want wrapped?'}
            {step === 'style'    && 'What kind of design are you looking for?'}
            {step === 'info'     && "We'll reach out to finalize your quote."}
            {step === 'checkout' && 'Review your selections and submit your request.'}
          </p>
        </div>

        {/* ── Step: Vehicle ─────────────────────────────────── */}
        {step === 'vehicle' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {VEHICLES.map(v => (
              <button
                key={v.id}
                onClick={() => setVehicle(v)}
                style={{
                  padding: '16px 18px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${vehicle?.id === v.id ? '#4f7fff' : '#2a2f3d'}`,
                  background: vehicle?.id === v.id ? 'rgba(79,127,255,0.08)' : '#13151c',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: vehicle?.id === v.id ? '#4f7fff' : '#e8eaed' }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: '#5a6080', marginTop: 2 }}>{v.sqft} sqft avg coverage</div>
                  </div>
                  {vehicle?.id === v.id && <Check size={16} style={{ color: '#4f7fff' }} />}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#9299b5', marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  from {fM(v.basePrice)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Step: Coverage ──────────────────────────────────── */}
        {step === 'coverage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {COVERAGES.map(c => (
              <button
                key={c.id}
                onClick={() => setCoverage(c)}
                style={{
                  padding: '16px 20px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${coverage?.id === c.id ? '#4f7fff' : '#2a2f3d'}`,
                  background: coverage?.id === c.id ? 'rgba(79,127,255,0.08)' : '#13151c',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: coverage?.id === c.id ? '#4f7fff' : '#e8eaed' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: '#9299b5', marginTop: 2 }}>{c.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {vehicle && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fM(vehicle.basePrice * c.multiplier)}
                    </span>
                  )}
                  {coverage?.id === c.id && <Check size={16} style={{ color: '#4f7fff' }} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Step: Style ─────────────────────────────────────── */}
        {step === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s)}
                style={{
                  padding: '16px 20px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${style?.id === s.id ? '#4f7fff' : '#2a2f3d'}`,
                  background: style?.id === s.id ? 'rgba(79,127,255,0.08)' : '#13151c',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: style?.id === s.id ? '#4f7fff' : '#e8eaed' }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#9299b5', marginTop: 2 }}>{s.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: s.priceAdj > 0 ? '#f59e0b' : s.priceAdj < 0 ? '#22c07a' : '#5a6080', fontWeight: 600 }}>
                    {s.priceAdj > 0 ? `+${fM(s.priceAdj)}` : s.priceAdj < 0 ? fM(s.priceAdj) : 'Included'}
                  </span>
                  {style?.id === s.id && <Check size={16} style={{ color: '#4f7fff' }} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Step: Info ──────────────────────────────────────── */}
        {step === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'name', label: 'Your Name *', placeholder: 'John Smith' },
                { key: 'company', label: 'Company', placeholder: 'ABC Plumbing LLC' },
                { key: 'email', label: 'Email Address *', placeholder: 'john@company.com' },
                { key: 'phone', label: 'Phone', placeholder: '(555) 000-0000' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #2a2f3d', background: '#13151c', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#4f7fff')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2f3d')}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { key: 'vehicle_year', label: 'Year', placeholder: '2022' },
                { key: 'vehicle_make', label: 'Make', placeholder: 'Ford' },
                { key: 'vehicle_model', label: 'Model', placeholder: 'Transit' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #2a2f3d', background: '#13151c', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#4f7fff')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2f3d')}
                  />
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Additional Notes
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Describe your ideal design, colors, logo details, or any special requirements..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #2a2f3d', background: '#13151c', color: '#e8eaed', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#4f7fff')}
                onBlur={e => (e.currentTarget.style.borderColor = '#2a2f3d')}
              />
            </div>
          </div>
        )}

        {/* ── Step: Checkout ──────────────────────────────────── */}
        {step === 'checkout' && (
          <div>
            {/* Summary */}
            <div style={{ background: '#13151c', border: '1px solid #2a2f3d', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9299b5', marginBottom: 14 }}>Your Configuration</div>
              {[
                { label: 'Vehicle',   value: vehicle?.name || '—' },
                { label: 'Coverage',  value: coverage?.label || '—' },
                { label: 'Style',     value: style?.label || '—' },
                { label: 'Name',      value: form.name || '—' },
                { label: 'Email',     value: form.email || '—' },
                { label: 'Vehicle',   value: [form.vehicle_year, form.vehicle_make, form.vehicle_model].filter(Boolean).join(' ') || '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2f3d' }}>
                  <span style={{ fontSize: 12, color: '#5a6080' }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e8eaed' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Estimate */}
            <div style={{ background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#5a6080' }}>Estimated Range</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>
                    {estimate ? `${fM(estimate)} – ${fM(estimate * 1.15)}` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>Final price determined after vehicle inspection</div>
                </div>
                <DollarSign size={40} style={{ color: 'rgba(34,192,122,0.3)' }} />
              </div>
            </div>

            {/* Design deposit info */}
            <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={18} style={{ color: '#4f7fff', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>Design Deposit: {fM(DESIGN_DEPOSIT)}</div>
                  <div style={{ fontSize: 11, color: '#9299b5', marginTop: 2 }}>
                    A {fM(DESIGN_DEPOSIT)} design deposit secures your spot and covers the cost of your initial design concepts.
                    Applied to your final invoice upon project completion.
                  </div>
                </div>
              </div>
            </div>

            {/* Trust signals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { icon: <Shield size={14} style={{ color: '#22c07a' }} />, label: 'Licensed & Insured' },
                { icon: <Clock size={14} style={{ color: '#4f7fff' }} />, label: '24hr Response' },
                { icon: <Star size={14} style={{ fill: '#f59e0b', color: '#f59e0b' }} />, label: '4.9 Star Rating' },
              ].map(t => (
                <div key={t.label} style={{ padding: '10px 12px', borderRadius: 9, background: '#13151c', border: '1px solid #2a2f3d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t.icon}
                  <span style={{ fontSize: 11, color: '#9299b5', fontWeight: 600 }}>{t.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.name || !form.email}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: form.name && form.email ? '#22c07a' : '#2a2f3d',
                color: '#fff', fontSize: 16, fontWeight: 800, cursor: form.name && form.email ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Quote Request'}
              {!submitting && <ArrowRight size={18} />}
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#5a6080', marginTop: 8 }}>
              No payment required to submit. We&apos;ll contact you to confirm details and arrange the design deposit.
            </div>
          </div>
        )}

        {/* Navigation */}
        {step !== 'checkout' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            {stepIdx > 0 ? (
              <button onClick={back} style={{ padding: '11px 22px', borderRadius: 10, border: '1px solid #2a2f3d', background: 'transparent', color: '#9299b5', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
            ) : <div />}
            <button
              onClick={next}
              disabled={(step === 'vehicle' && !vehicle) || (step === 'coverage' && !coverage) || (step === 'style' && !style) || (step === 'info' && (!form.name || !form.email))}
              style={{
                padding: '11px 28px', borderRadius: 10, border: 'none',
                background: '#4f7fff', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: ((step === 'vehicle' && !vehicle) || (step === 'coverage' && !coverage) || (step === 'style' && !style) || (step === 'info' && (!form.name || !form.email))) ? 0.4 : 1,
              }}
            >
              {step === 'info' ? 'Review Quote →' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Estimate pill (sticky) */}
        {estimate !== null && step !== 'checkout' && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#13151c', border: '1px solid rgba(34,192,122,0.3)',
            borderRadius: 50, padding: '10px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 100,
          }}>
            <span style={{ fontSize: 11, color: '#5a6080' }}>Est. Wrap Price</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace' }}>{fM(estimate)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
