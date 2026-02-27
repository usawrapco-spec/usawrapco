'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  TrendingUp, ChevronRight, Check, Loader2,
  Car, Users, DollarSign, MapPin, Zap, BarChart2, Phone, Mail,
  Building2, Navigation, Star, ArrowRight,
} from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { label: 'Contractor (General)', conversionRate: 0.007, suggestedLtv: 4000 },
  { label: 'Plumber', conversionRate: 0.012, suggestedLtv: 1050 },
  { label: 'HVAC', conversionRate: 0.010, suggestedLtv: 1850 },
  { label: 'Electrician', conversionRate: 0.013, suggestedLtv: 900 },
  { label: 'Roofer', conversionRate: 0.008, suggestedLtv: 2500 },
  { label: 'Landscaping', conversionRate: 0.015, suggestedLtv: 750 },
  { label: 'Food & Beverage', conversionRate: 0.020, suggestedLtv: 450 },
  { label: 'Delivery / Logistics', conversionRate: 0.008, suggestedLtv: 2200 },
  { label: 'Cleaning Services', conversionRate: 0.016, suggestedLtv: 600 },
  { label: 'Pest Control', conversionRate: 0.014, suggestedLtv: 800 },
  { label: 'Retail', conversionRate: 0.018, suggestedLtv: 350 },
  { label: 'Medical / Healthcare', conversionRate: 0.006, suggestedLtv: 4500 },
  { label: 'Painting', conversionRate: 0.011, suggestedLtv: 1200 },
  { label: 'Flooring', conversionRate: 0.010, suggestedLtv: 2000 },
  { label: 'Other', conversionRate: 0.010, suggestedLtv: 1500 },
]

const WRAP_TYPES = [
  { id: 'full', label: 'Full Wrap', desc: 'Max coverage, max impact', estimatedCost: 3500 },
  { id: 'partial', label: 'Partial Wrap', desc: 'Strategic coverage', estimatedCost: 2000 },
  { id: 'fleet', label: 'Fleet Graphics', desc: 'Consistent branding across vehicles', estimatedCost: 1500 },
]

const VEHICLE_COUNTS = [1, 2, 3, 4, 5, 'Fleet (6-10)', 'Fleet (10+)']

const CPM_COMPARISON = [
  { label: 'Vehicle Wrap', cpm: 0.77, color: '#22c07a' },
  { label: 'Billboard', cpm: 3.56, color: '#f59e0b' },
  { label: 'Google Display', cpm: 2.80, color: '#4f7fff' },
  { label: 'Radio', cpm: 13.00, color: '#8b5cf6' },
  { label: 'Direct Mail', cpm: 19.00, color: '#f25a5a' },
]

const TESTIMONIALS = [
  { name: 'Mike R.', business: 'Raleigh Plumbing', quote: 'Got 14 calls my first month. The wrap paid for itself in 11 weeks.' },
  { name: 'Sarah T.', business: 'Greenfield Landscaping', quote: 'Best advertising decision I ever made. $47K in new contracts last year.' },
  { name: 'Carlos M.', business: 'ProTech HVAC', quote: 'I tracked every call. Wrapped 3 vans and doubled my inbound leads.' },
]

// ─── Calculation helpers ───────────────────────────────────────────────────────

function calcImpressions(milesPerDay: number, urbanPct: number, hoursPerDay: number, vehicles: number) {
  const urban = milesPerDay * (urbanPct / 100)
  const suburb = milesPerDay * ((100 - urbanPct) / 100) * 0.7
  const hwy = milesPerDay * ((100 - urbanPct) / 100) * 0.3
  const basePerVehicle = urban * 1200 + suburb * 400 + hwy * 150
  const rushMultiplier = 1 + (hoursPerDay / 12) * 0.8
  const daily = Math.round(basePerVehicle * rushMultiplier * vehicles)
  return { daily, monthly: daily * 22, annual: daily * 260 }
}

function calcROI(
  annualImpressions: number,
  conversionRate: number,
  avgJobValue: number,
  wrapCost: number,
) {
  const annualLeads = Math.round(annualImpressions * conversionRate)
  const annualRevenue = Math.round(annualLeads * avgJobValue)
  const breakEvenMonths = wrapCost > 0 && annualRevenue > 0
    ? Math.ceil((wrapCost / annualRevenue) * 12)
    : 0
  const cpm5yr = wrapCost > 0 && annualImpressions > 0
    ? ((wrapCost / 5 / 12) / (annualImpressions * 22 / 1000)).toFixed(2)
    : '0.00'
  return { annualLeads, annualRevenue, breakEvenMonths, cpm5yr }
}

// ─── Animated counter hook ─────────────────────────────────────────────────────

function useCountUp(target: number, duration: number, running: boolean) {
  const [current, setCurrent] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!running) { setCurrent(0); return }
    let startTime = 0
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration, running])

  return current
}

// ─── Step components ───────────────────────────────────────────────────────────

function Step1({
  numVehicles, setNumVehicles,
  wrapType, setWrapType,
  industry, setIndustry,
  avgJobValue, setAvgJobValue,
  onNext,
}: {
  numVehicles: number | string
  setNumVehicles: (v: number | string) => void
  wrapType: string
  setWrapType: (v: string) => void
  industry: string
  setIndustry: (v: string) => void
  avgJobValue: number
  setAvgJobValue: (v: number) => void
  onNext: () => void
}) {
  const canContinue = !!(numVehicles && wrapType && industry && avgJobValue > 0)

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Step 1 of 5
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: '0 0 8px 0' }}>
          Tell Us About Your Business
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0 }}>
          We'll calculate your exact ROI based on your fleet and market.
        </p>
      </div>

      {/* Vehicle count */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>How many vehicles will you wrap?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {VEHICLE_COUNTS.map(v => (
            <button
              key={String(v)}
              onClick={() => setNumVehicles(v)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: `2px solid ${numVehicles === v ? 'var(--green)' : 'var(--border)'}`,
                background: numVehicles === v ? 'rgba(34,192,122,0.12)' : 'var(--surface2)',
                color: numVehicles === v ? 'var(--green)' : 'var(--text2)',
                fontSize: 14,
                fontWeight: numVehicles === v ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Wrap type */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>What type of wrap?</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {WRAP_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setWrapType(t.id)}
              style={{
                padding: '16px 12px',
                borderRadius: 12,
                border: `2px solid ${wrapType === t.id ? 'var(--accent)' : 'var(--border)'}`,
                background: wrapType === t.id ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: wrapType === t.id ? 'var(--accent)' : 'var(--text1)', marginBottom: 4 }}>
                {t.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.desc}</div>
              <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', marginTop: 6, fontWeight: 700 }}>
                ~${t.estimatedCost.toLocaleString()}/vehicle
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>What industry are you in?</label>
        <select
          value={industry}
          onChange={e => {
            setIndustry(e.target.value)
            const ind = INDUSTRIES.find(i => i.label === e.target.value)
            if (ind && avgJobValue === 1500) setAvgJobValue(ind.suggestedLtv)
          }}
          style={inputStyle}
        >
          <option value="">Select your industry…</option>
          {INDUSTRIES.map(i => <option key={i.label} value={i.label}>{i.label}</option>)}
        </select>
      </div>

      {/* Average job value */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>Average value of a new customer or contract ($)</label>
        <div style={{ position: 'relative' }}>
          <DollarSign size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="number"
            value={avgJobValue}
            onChange={e => setAvgJobValue(Number(e.target.value))}
            placeholder="e.g. 1500"
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        {industry && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Typical range for {industry}: ${INDUSTRIES.find(i => i.label === industry)?.suggestedLtv.toLocaleString()} per customer
          </div>
        )}
      </div>

      <button onClick={onNext} disabled={!canContinue} style={primaryBtnStyle(canContinue)}>
        Continue to Route Mapping
        <ArrowRight size={16} />
      </button>
    </div>
  )
}

function Step2({
  city, setCity,
  milesPerDay, setMilesPerDay,
  urbanPct, setUrbanPct,
  hoursPerDay, setHoursPerDay,
  vehicleType, setVehicleType,
  onNext,
  onBack,
}: {
  city: string; setCity: (v: string) => void
  milesPerDay: number; setMilesPerDay: (v: number) => void
  urbanPct: number; setUrbanPct: (v: number) => void
  hoursPerDay: number; setHoursPerDay: (v: number) => void
  vehicleType: string; setVehicleType: (v: string) => void
  onNext: () => void; onBack: () => void
}) {
  const routeLabel = urbanPct >= 70 ? 'Mostly Urban' : urbanPct >= 40 ? 'Mixed Urban/Suburban' : urbanPct >= 20 ? 'Mostly Suburban' : 'Mostly Highway'
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Step 2 of 5
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: '0 0 8px 0' }}>
          Map Your Daily Route
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0 }}>
          Tell us how your vehicles move through the day. This powers our impression calculator.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* City */}
        <div>
          <label style={labelStyle}>
            <Navigation size={13} style={{ display: 'inline', marginRight: 5 }} />
            City / Market Area
          </label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Dallas, TX"
            style={inputStyle}
          />
        </div>

        {/* Vehicle type */}
        <div>
          <label style={labelStyle}>
            <Car size={13} style={{ display: 'inline', marginRight: 5 }} />
            Vehicle Type
          </label>
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={inputStyle}>
            <option value="van">Van</option>
            <option value="truck">Pickup Truck</option>
            <option value="box_truck">Box Truck</option>
            <option value="suv">SUV</option>
            <option value="car">Car</option>
            <option value="trailer">Trailer</option>
          </select>
        </div>
      </div>

      {/* Map placeholder or embed */}
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        marginBottom: 24,
        background: 'var(--surface2)',
        height: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {mapsKey ? (
          <iframe
            width="100%"
            height="200"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${encodeURIComponent(city || 'United States')}`}
          />
        ) : (
          <>
            <MapPin size={32} style={{ color: 'var(--accent)', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>
              Route Visualization
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', maxWidth: 280 }}>
              Enter your city and route details below. Configure <code style={{ fontSize: 11, background: 'var(--surface)', padding: '1px 4px', borderRadius: 3 }}>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> for live map.
            </div>
          </>
        )}
        {/* Route type badge */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(13,15,20,0.85)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--cyan)',
        }}>
          {routeLabel}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
        {/* Miles */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={labelStyle}>Miles driven per day (per vehicle)</label>
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
              {milesPerDay} mi
            </span>
          </div>
          <input
            type="range" min={10} max={300} step={5}
            value={milesPerDay}
            onChange={e => setMilesPerDay(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#22c07a', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            <span>10 mi</span><span>150 mi</span><span>300 mi</span>
          </div>
        </div>

        {/* Urban % */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={labelStyle}>% of driving in urban/city areas</label>
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
              {urbanPct}%
            </span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={urbanPct}
            onChange={e => setUrbanPct(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#4f7fff', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            <span>Highway</span><span>Mixed</span><span>City</span>
          </div>
        </div>

        {/* Hours */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={labelStyle}>Hours driving per day</label>
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--purple)' }}>
              {hoursPerDay} hrs
            </span>
          </div>
          <input
            type="range" min={1} max={14} step={0.5}
            value={hoursPerDay}
            onChange={e => setHoursPerDay(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            <span>1 hr</span><span>7 hrs</span><span>14 hrs</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
        <button onClick={onNext} style={{ ...primaryBtnStyle(true), flex: 1 }}>
          Calculate My Impressions
          <Zap size={16} />
        </button>
      </div>
    </div>
  )
}

function Step3({
  impressions,
  calculating,
  onCalculate,
  onNext,
  onBack,
}: {
  impressions: { daily: number; monthly: number; annual: number } | null
  calculating: boolean
  onCalculate: () => void
  onNext: () => void
  onBack: () => void
}) {
  const revealed = !!impressions && !calculating
  const daily = useCountUp(impressions?.daily ?? 0, 1400, revealed)
  const monthly = useCountUp(impressions?.monthly ?? 0, 1800, revealed)
  const annual = useCountUp(impressions?.annual ?? 0, 2200, revealed)

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Step 3 of 5
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: '0 0 8px 0' }}>
          AI Traffic Estimate
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0 }}>
          Using your route data to calculate real-world impression counts.
        </p>
      </div>

      {!impressions && !calculating && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(34,192,122,0.1)',
            border: '2px solid rgba(34,192,122,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Zap size={32} style={{ color: 'var(--green)' }} />
          </div>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 24 }}>
            Ready to see how many people will see your wrap every day?
          </p>
          <button onClick={onCalculate} style={primaryBtnStyle(true)}>
            Calculate My Impressions
            <Zap size={16} />
          </button>
        </div>
      )}

      {calculating && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 size={36} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 15, color: 'var(--text2)', marginTop: 16 }}>
            Analyzing your route traffic patterns…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {revealed && (
        <>
          {/* Big impression numbers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 28,
          }}>
            {[
              { label: 'Daily Impressions', value: daily, color: 'var(--green)' },
              { label: 'Monthly Impressions', value: monthly, color: 'var(--accent)' },
              { label: 'Annual Impressions', value: annual, color: 'var(--cyan)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--surface2)',
                border: `1px solid ${stat.color}30`,
                borderRadius: 14,
                padding: '20px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: 30,
                  fontWeight: 900,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: stat.color,
                  lineHeight: 1,
                }}>
                  {stat.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* CPM Comparison */}
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Cost Per 1,000 Impressions — How Wraps Compare
            </div>
            {CPM_COMPARISON.map(c => {
              const maxCpm = 20
              const pct = Math.min((c.cpm / maxCpm) * 100, 100)
              return (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)', width: 110, flexShrink: 0 }}>{c.label}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: c.color,
                      borderRadius: 4,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: c.color,
                    width: 52,
                    textAlign: 'right',
                    fontWeight: 700,
                  }}>
                    ${c.cpm.toFixed(2)}
                  </span>
                </div>
              )
            })}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              Vehicle wraps deliver the lowest cost per impression of any local advertising medium.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
            <button onClick={onNext} style={{ ...primaryBtnStyle(true), flex: 1 }}>
              See Your ROI Projection
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}

      {!impressions && !calculating && (
        <div style={{ marginTop: 16 }}>
          <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
        </div>
      )}
    </div>
  )
}

function Step4({
  roi,
  wrapCost,
  impressions,
  onNext,
  onBack,
}: {
  roi: { annualLeads: number; annualRevenue: number; breakEvenMonths: number; cpm5yr: string }
  wrapCost: number
  impressions: { daily: number; monthly: number; annual: number }
  onNext: () => void
  onBack: () => void
}) {
  const lifetimeRevenue = roi.annualRevenue * 5

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Step 4 of 5
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: '0 0 8px 0' }}>
          Your ROI Projection
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0 }}>
          Based on your industry and route data.
        </p>
      </div>

      {/* Headline break-even stat */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,192,122,0.1) 0%, rgba(34,211,238,0.06) 100%)',
        border: '1px solid rgba(34,192,122,0.3)',
        borderRadius: 16,
        padding: '28px 24px',
        textAlign: 'center',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Break-Even Point
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', lineHeight: 1 }}>
          {roi.breakEvenMonths > 0 ? roi.breakEvenMonths : '—'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginTop: 4 }}>
          {roi.breakEvenMonths > 0 ? 'months to break even' : 'Add job value to calculate'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>
          Your wrap pays for itself — then it&apos;s pure profit for years to come.
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Annual Leads Generated', value: roi.annualLeads.toLocaleString(), color: 'var(--accent)', prefix: '', suffix: ' leads' },
          { label: 'Annual Revenue Attributed', value: `$${roi.annualRevenue.toLocaleString()}`, color: 'var(--green)', prefix: '', suffix: '' },
          { label: '5-Year Revenue Projection', value: `$${lifetimeRevenue.toLocaleString()}`, color: 'var(--cyan)', prefix: '', suffix: '' },
          { label: 'Effective CPM (5yr)', value: `$${roi.cpm5yr}`, color: 'var(--amber)', prefix: '', suffix: '' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '18px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 900,
              fontFamily: 'JetBrains Mono, monospace',
              color: stat.color,
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Cost comparison */}
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Advertising Cost to Reach {impressions.annual.toLocaleString()} People/Year
        </div>
        {[
          { label: 'Your Wrap', cost: wrapCost / 5, color: 'var(--green)', highlight: true },
          { label: 'Billboard (same reach)', cost: Math.round(impressions.annual / 1000 * 3.56 * 12), color: 'var(--amber)', highlight: false },
          { label: 'Radio Ads (same reach)', cost: Math.round(impressions.annual / 1000 * 13.00 * 12), color: 'var(--purple)', highlight: false },
          { label: 'Direct Mail (same reach)', cost: Math.round(impressions.annual / 1000 * 19.00 * 12), color: 'var(--red)', highlight: false },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 6,
            background: item.highlight ? 'rgba(34,192,122,0.08)' : 'transparent',
            border: item.highlight ? '1px solid rgba(34,192,122,0.2)' : '1px solid transparent',
          }}>
            <span style={{ fontSize: 13, color: item.highlight ? 'var(--green)' : 'var(--text2)', fontWeight: item.highlight ? 700 : 400 }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              color: item.color,
            }}>
              ${item.cost.toLocaleString()}/yr
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
        <button onClick={onNext} style={{ ...primaryBtnStyle(true), flex: 1 }}>
          Get My Custom Quote
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function Step5({
  roi,
  impressions,
  numVehicles,
  wrapType,
  industry,
  onBack,
}: {
  roi: { annualLeads: number; annualRevenue: number; breakEvenMonths: number; cpm5yr: string }
  impressions: { daily: number; monthly: number; annual: number }
  numVehicles: number | string
  wrapType: string
  industry: string
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fleetSize, setFleetSize] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = !!(name.trim() && (phone.trim() || email.trim()))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/roi/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          business_name: businessName,
          phone,
          email,
          fleet_size: fleetSize ? parseInt(fleetSize) : null,
          notes,
          industry,
          num_vehicles: typeof numVehicles === 'number' ? numVehicles : 8,
          wrap_type: wrapType,
          estimated_roi: roi.annualRevenue,
          estimated_annual_impressions: impressions.annual,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(34,192,122,0.15)',
          border: '2px solid var(--green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Check size={36} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 12 }}>
          You&apos;re on the list!
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
          We&apos;ll reach out within 1 business day with a custom quote and ROI breakdown for your fleet.
        </p>
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 20,
          textAlign: 'left',
          maxWidth: 360,
          margin: '0 auto',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
            Your Estimated Numbers
          </div>
          {[
            { label: 'Annual Impressions', value: impressions.annual.toLocaleString() },
            { label: 'Projected Annual Leads', value: roi.annualLeads.toLocaleString() },
            { label: 'Projected Revenue', value: `$${roi.annualRevenue.toLocaleString()}` },
            { label: 'Break-Even', value: `${roi.breakEvenMonths} months` },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{stat.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Step 5 of 5
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: '0 0 8px 0' }}>
          Get Your Custom Quote
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text2)', margin: 0 }}>
          We&apos;ll reach out within 1 business day with pricing tailored to your fleet.
        </p>
      </div>

      {/* Summary box */}
      <div style={{
        background: 'rgba(34,192,122,0.06)',
        border: '1px solid rgba(34,192,122,0.2)',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        gap: 20,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Annual Impressions', value: impressions.annual.toLocaleString() },
          { label: 'Est. Annual Revenue', value: `$${roi.annualRevenue.toLocaleString()}` },
          { label: 'Break-Even', value: `${roi.breakEvenMonths}mo` },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Your Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Business Name</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Smith Plumbing LLC" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Phone *</label>
            <div style={{ position: 'relative' }}>
              <Phone size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" style={{ ...inputStyle, paddingLeft: 30 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@business.com" style={{ ...inputStyle, paddingLeft: 30 }} />
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Total Fleet Size (vehicles you own/operate)</label>
          <div style={{ position: 'relative' }}>
            <Users size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input type="number" value={fleetSize} onChange={e => setFleetSize(e.target.value)} placeholder="e.g. 5" style={{ ...inputStyle, paddingLeft: 30 }} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Anything else you&apos;d like us to know?</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Timeline, specific vehicles, questions…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{ ...primaryBtnStyle(canSubmit && !submitting), flex: 1 }}
        >
          {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
          {submitting ? 'Submitting…' : 'Get My Custom Quote'}
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 12 }}>
        No spam. No obligation. We&apos;ll respond within 1 business day.
      </p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ROICalculatorPage() {
  const [step, setStep] = useState(1)

  // Step 1
  const [numVehicles, setNumVehicles] = useState<number | string>('')
  const [wrapType, setWrapType] = useState('')
  const [industry, setIndustry] = useState('')
  const [avgJobValue, setAvgJobValue] = useState(1500)

  // Step 2
  const [city, setCity] = useState('')
  const [milesPerDay, setMilesPerDay] = useState(80)
  const [urbanPct, setUrbanPct] = useState(55)
  const [hoursPerDay, setHoursPerDay] = useState(6)
  const [vehicleType, setVehicleType] = useState('van')

  // Step 3
  const [impressions, setImpressions] = useState<{ daily: number; monthly: number; annual: number } | null>(null)
  const [calculating, setCalculating] = useState(false)

  const getVehicleCount = useCallback(() => {
    if (typeof numVehicles === 'number') return numVehicles
    if (numVehicles === 'Fleet (6-10)') return 8
    if (numVehicles === 'Fleet (10+)') return 12
    return 1
  }, [numVehicles])

  const handleCalculate = useCallback(() => {
    setCalculating(true)
    setTimeout(() => {
      const result = calcImpressions(milesPerDay, urbanPct, hoursPerDay, getVehicleCount())
      setImpressions(result)
      setCalculating(false)
    }, 1800)
  }, [milesPerDay, urbanPct, hoursPerDay, getVehicleCount])

  const wrapCost = (WRAP_TYPES.find(w => w.id === wrapType)?.estimatedCost ?? 3500) * getVehicleCount()
  const industryData = INDUSTRIES.find(i => i.label === industry)

  const roi = impressions && industryData
    ? calcROI(impressions.annual, industryData.conversionRate, avgJobValue, wrapCost)
    : { annualLeads: 0, annualRevenue: 0, breakEvenMonths: 0, cpm5yr: '0.00' }

  const testimonialIndex = step > 2 ? (step - 1) % TESTIMONIALS.length : 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text1)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1000,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
              USA WRAP CO
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.04em' }}>ROI CALCULATOR</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          Free · No login required
        </div>
      </div>

      {/* Social proof banner */}
      <div style={{
        background: 'rgba(34,192,122,0.06)',
        borderBottom: '1px solid rgba(34,192,122,0.15)',
        padding: '10px 24px',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text2)',
      }}>
        <Star size={12} style={{ display: 'inline', color: 'var(--amber)', marginRight: 6 }} />
        Trusted by 2,400+ businesses — average wrap ROI of 680% over 5 years
        <Star size={12} style={{ display: 'inline', color: 'var(--amber)', marginLeft: 6 }} />
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <div
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: s < step ? 'var(--green)' : s === step ? 'var(--accent)' : 'var(--surface2)',
                  border: `2px solid ${s < step ? 'var(--green)' : s === step ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: s <= step ? '#fff' : 'var(--text3)',
                  transition: 'all 0.3s',
                }}
              >
                {s < step ? <Check size={13} /> : s}
              </div>
            ))}
          </div>
          <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((step - 1) / 4) * 100}%`,
              background: 'linear-gradient(to right, var(--green), var(--cyan))',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Step content */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '32px 28px',
          marginBottom: 24,
        }}>
          {step === 1 && (
            <Step1
              numVehicles={numVehicles} setNumVehicles={setNumVehicles}
              wrapType={wrapType} setWrapType={setWrapType}
              industry={industry} setIndustry={setIndustry}
              avgJobValue={avgJobValue} setAvgJobValue={setAvgJobValue}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              city={city} setCity={setCity}
              milesPerDay={milesPerDay} setMilesPerDay={setMilesPerDay}
              urbanPct={urbanPct} setUrbanPct={setUrbanPct}
              hoursPerDay={hoursPerDay} setHoursPerDay={setHoursPerDay}
              vehicleType={vehicleType} setVehicleType={setVehicleType}
              onNext={() => { setStep(3); if (!impressions) {} }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3
              impressions={impressions}
              calculating={calculating}
              onCalculate={handleCalculate}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && impressions && (
            <Step4
              roi={roi}
              wrapCost={wrapCost}
              impressions={impressions}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && impressions && (
            <Step5
              roi={roi}
              impressions={impressions}
              numVehicles={numVehicles}
              wrapType={wrapType}
              industry={industry}
              onBack={() => setStep(4)}
            />
          )}
        </div>

        {/* Testimonial */}
        {step >= 2 && (
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={13} style={{ color: 'var(--amber)', fill: '#f59e0b' }} />
              ))}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.6, margin: '0 0 10px 0', fontStyle: 'italic' }}>
              &ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;
            </p>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
              — {TESTIMONIALS[testimonialIndex].name}, {TESTIMONIALS[testimonialIndex].business}
            </div>
          </div>
        )}

        {/* Footer trust signals */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginTop: 24,
          flexWrap: 'wrap',
        }}>
          {[
            { icon: Check, label: '100% Free Calculator' },
            { icon: Building2, label: '2,400+ Businesses Served' },
            { icon: TrendingUp, label: 'Average 680% ROI' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <item.icon size={12} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

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
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function primaryBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 24px',
    borderRadius: 10,
    background: enabled ? 'var(--green)' : 'var(--surface2)',
    color: enabled ? '#fff' : 'var(--text3)',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    cursor: enabled ? 'pointer' : 'not-allowed',
    width: '100%',
    transition: 'all 0.15s',
  }
}

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '13px 20px',
  borderRadius: 10,
  background: 'var(--surface2)',
  color: 'var(--text2)',
  fontSize: 14,
  fontWeight: 600,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
