'use client'

import { useState } from 'react'
import { C } from '@/lib/portal-theme'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Wand2, ChevronRight, Car, Truck, Ship, User, Phone, Mail,
  ArrowRight, CheckCircle2, Loader2,
} from 'lucide-react'

interface Props {
  dealerId: string
  dealerName: string
  token: string
  commissionPct: number
}

type Step = 'customer' | 'vehicle' | 'wrap' | 'confirm'

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car / SUV', icon: Car },
  { value: 'truck', label: 'Truck / Van', icon: Truck },
  { value: 'boat', label: 'Boat / Marine', icon: Ship },
]

const WRAP_TYPES = [
  { value: 'full', label: 'Full Wrap', description: 'Entire vehicle — maximum impact' },
  { value: 'partial', label: 'Partial Wrap', description: 'Hood, sides, or custom sections' },
  { value: 'fleet', label: 'Fleet Branding', description: 'Multiple vehicles, unified look' },
  { value: 'color_change', label: 'Color Change', description: 'New solid or metallic color' },
  { value: 'decals', label: 'Decals / Graphics', description: 'Logos, lettering, accents' },
]

export default function DealerMockupPage({ dealerId, dealerName, token, commissionPct }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const base = `/portal/dealer/${token}`

  const [step, setStep] = useState<Step>('customer')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [vehicleDesc, setVehicleDesc] = useState('')
  const [wrapType, setWrapType] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit() {
    if (!customerName || !vehicleType || !wrapType) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase.from('dealer_referrals').insert({
        dealer_id: dealerId,
        customer_name: customerName,
        vehicle_desc: `${vehicleDesc} — ${wrapType.replace('_', ' ')}`,
        status: 'lead',
        commission_pct: commissionPct,
        notes: [
          `Vehicle type: ${vehicleType}`,
          `Wrap type: ${wrapType}`,
          notes && `Notes: ${notes}`,
          customerPhone && `Phone: ${customerPhone}`,
          customerEmail && `Email: ${customerEmail}`,
        ].filter(Boolean).join('\n'),
      }).select('id').single()

      if (error) throw error

      // Send a welcome message to the shop channel
      await supabase.from('dealer_messages').insert({
        dealer_id: dealerId,
        referral_id: data?.id,
        channel: 'dealer_shop',
        sender_type: 'dealer',
        sender_name: dealerName,
        body: `New referral submitted: ${customerName} — ${vehicleDesc || vehicleType} — ${wrapType.replace('_', ' ')}. Please reach out to them.`,
        read_shop: false,
        read_dealer: true,
      })

      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `${C.green}18`, border: `2px solid ${C.green}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={36} color={C.green} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, marginBottom: 8 }}>
          Referral Submitted!
        </div>
        <div style={{ fontSize: 14, color: C.text2, marginBottom: 32, lineHeight: 1.6 }}>
          We&apos;ll reach out to {customerName} and get an estimate going. You&apos;ll earn {commissionPct}% commission when the job closes.
        </div>
        <button
          onClick={() => router.push(`${base}/jobs`)}
          style={{
            padding: '13px 28px', borderRadius: 12, border: 'none',
            background: C.green, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          View My Jobs
        </button>
      </div>
    )
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'customer', label: 'Customer' },
    { key: 'vehicle',  label: 'Vehicle' },
    { key: 'wrap',     label: 'Wrap Type' },
    { key: 'confirm',  label: 'Submit' },
  ]
  const stepIdx = steps.findIndex(s => s.key === step)

  return (
    <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `${C.green}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Wand2 size={26} color={C.green} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text1 }}>Refer a Customer</div>
        <div style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>
          Earn {commissionPct}% commission when the job closes
        </div>
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: i < stepIdx ? C.green : i === stepIdx ? `${C.green}30` : C.surface2,
              border: `2px solid ${i <= stepIdx ? C.green : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: i < stepIdx ? '#fff' : i === stepIdx ? C.green : C.text3,
            }}>
              {i < stepIdx ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 20, height: 2, background: i < stepIdx ? C.green : C.border, borderRadius: 1 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step: Customer Info */}
      {step === 'customer' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Customer Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Customer Name *', value: customerName, setter: setCustomerName, icon: User, placeholder: 'Full name' },
              { label: 'Phone', value: customerPhone, setter: setCustomerPhone, icon: Phone, placeholder: '(555) 000-0000' },
              { label: 'Email', value: customerEmail, setter: setCustomerEmail, icon: Mail, placeholder: 'email@example.com' },
            ].map(field => (
              <div key={field.label}>
                <label style={{ fontSize: 12, color: C.text3, marginBottom: 6, display: 'block' }}>{field.label}</label>
                <div style={{ position: 'relative' }}>
                  <field.icon size={16} color={C.text3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: '11px 12px 11px 38px', color: C.text1,
                      fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep('vehicle')}
            disabled={!customerName.trim()}
            style={{
              width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, border: 'none',
              background: customerName.trim() ? C.green : C.surface2,
              color: customerName.trim() ? '#fff' : C.text3,
              fontSize: 14, fontWeight: 700, cursor: customerName.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step: Vehicle */}
      {step === 'vehicle' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Vehicle Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {VEHICLE_TYPES.map(v => {
              const Icon = v.icon
              const selected = vehicleType === v.value
              return (
                <button
                  key={v.value}
                  onClick={() => setVehicleType(v.value)}
                  style={{
                    padding: '16px 8px', borderRadius: 12,
                    background: selected ? `${C.green}18` : C.surface,
                    border: `2px solid ${selected ? C.green : C.border}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}
                >
                  <Icon size={22} color={selected ? C.green : C.text2} strokeWidth={1.6} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: selected ? C.green : C.text2 }}>{v.label}</span>
                </button>
              )
            })}
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, marginBottom: 6, display: 'block' }}>Vehicle Description</label>
            <input
              value={vehicleDesc}
              onChange={e => setVehicleDesc(e.target.value)}
              placeholder="e.g. 2024 Ford F-150, white"
              style={{
                width: '100%', background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '11px 14px', color: C.text1,
                fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep('customer')} style={{
              flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: 'none', color: C.text2, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Back
            </button>
            <button
              onClick={() => setStep('wrap')}
              disabled={!vehicleType}
              style={{
                flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                background: vehicleType ? C.green : C.surface2,
                color: vehicleType ? '#fff' : C.text3,
                fontSize: 14, fontWeight: 700, cursor: vehicleType ? 'pointer' : 'default',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Wrap Type */}
      {step === 'wrap' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Wrap Type</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {WRAP_TYPES.map(w => {
              const selected = wrapType === w.value
              return (
                <button
                  key={w.value}
                  onClick={() => setWrapType(w.value)}
                  style={{
                    padding: '14px 16px', borderRadius: 12, textAlign: 'left',
                    background: selected ? `${C.green}18` : C.surface,
                    border: `2px solid ${selected ? C.green : C.border}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selected ? C.green : C.border}`,
                    background: selected ? C.green : 'transparent',
                  }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: selected ? C.green : C.text1 }}>{w.label}</div>
                    <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{w.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, marginBottom: 6, display: 'block' }}>Additional Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any specific ideas, colors, timeline, budget…"
              rows={3}
              style={{
                width: '100%', background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '11px 14px', color: C.text1,
                fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep('vehicle')} style={{
              flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: 'none', color: C.text2, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!wrapType}
              style={{
                flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                background: wrapType ? C.green : C.surface2,
                color: wrapType ? '#fff' : C.text3,
                fontSize: 14, fontWeight: 700, cursor: wrapType ? 'pointer' : 'default',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Review <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Review & Submit</h2>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 14, overflow: 'hidden', marginBottom: 20,
          }}>
            {[
              { label: 'Customer', value: customerName },
              customerPhone && { label: 'Phone', value: customerPhone },
              customerEmail && { label: 'Email', value: customerEmail },
              { label: 'Vehicle', value: vehicleDesc || VEHICLE_TYPES.find(v => v.value === vehicleType)?.label || vehicleType },
              { label: 'Wrap Type', value: WRAP_TYPES.find(w => w.value === wrapType)?.label || wrapType },
              { label: 'Your Commission', value: `${commissionPct}% of final job value` },
              notes && { label: 'Notes', value: notes },
            ].filter(Boolean).map((row, i, arr) => {
              const r = row as { label: string; value: string }
              return (
                <div key={r.label} style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontSize: 12, color: C.text3, width: 110, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 13, color: C.text1, fontWeight: 500 }}>{r.value}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('wrap')} style={{
              flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: 'none', color: C.text2, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                background: C.green, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? 'Submitting…' : 'Submit Referral'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
