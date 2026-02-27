'use client'

import { useState } from 'react'
import { User, ArrowLeft, Loader2, Send } from 'lucide-react'

interface Props {
  formData: {
    name: string
    company: string
    email: string
    phone: string
    vehicleType: string
    industry: string
    avgJobValue: number
    numVehicles: number
    primaryCity: string
    estimatedDailyImpressions: number
    monthlyLeads: number
    annualRevenue: number
    roiMultiplier: number
  }
  onUpdate: (data: any) => void
  onNext: () => void
  onBack: () => void
}

const VEHICLE_TYPES = [
  'Van',
  'Truck',
  'SUV',
  'Car',
  'Box Truck',
  'Trailer',
  'Fleet (Mixed)',
]

export default function PublicLeadCapture({ formData, onUpdate, onNext, onBack }: Props) {
  const [name, setName] = useState(formData.name)
  const [company, setCompany] = useState(formData.company)
  const [email, setEmail] = useState(formData.email)
  const [phone, setPhone] = useState(formData.phone)
  const [vehicleType, setVehicleType] = useState(formData.vehicleType)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = name.trim() && (email.trim() || phone.trim())

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/public/roi/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim(),
          vehicleType,
          industry: formData.industry,
          avgJobValue: formData.avgJobValue,
          numVehicles: formData.numVehicles,
          primaryCity: formData.primaryCity,
          estimatedDailyImpressions: formData.estimatedDailyImpressions,
          projectedMonthlyLeads: formData.monthlyLeads,
          projectedAnnualRevenue: formData.annualRevenue,
          projectedRoiMultiplier: formData.roiMultiplier,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      onUpdate({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        vehicleType,
        trackingCode: data.trackingCode,
        leadId: data.leadId,
      })
      onNext()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 24,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <User size={18} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
            Get Your Free Tracking Code
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px' }}>
          We'll generate a unique tracking code for your wrap and send you a full ROI report.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Your Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Smith"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Smith Plumbing"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="john@smithplumbing.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select vehicle type...</option>
              {VEHICLE_TYPES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(242,90,90,0.1)',
            border: '1px solid rgba(242,90,90,0.3)',
            color: 'var(--red)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(79,127,255,0.06)',
          border: '1px solid rgba(79,127,255,0.15)',
          fontSize: 12,
          color: 'var(--text2)',
          lineHeight: 1.5,
        }}>
          Your tracking code will be placed on your vehicle wrap. When potential customers scan it, we track the lead back to your wrap so you can see real ROI.
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '14px 20px',
            borderRadius: 10,
            background: 'var(--surface2)',
            color: 'var(--text2)',
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px',
            borderRadius: 10,
            background: canSubmit && !submitting ? 'var(--green)' : 'var(--surface2)',
            color: canSubmit && !submitting ? '#fff' : 'var(--text3)',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send size={16} />
              Get My Tracking Code
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--text1)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}
