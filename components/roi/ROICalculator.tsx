'use client'

import { useState, useMemo } from 'react'
import { Calculator, DollarSign, TrendingUp, Target, Zap } from 'lucide-react'

const INDUSTRIES: { label: string; ltvMin: number; ltvMax: number; conversionRate: number }[] = [
  { label: 'Plumber', ltvMin: 600, ltvMax: 1500, conversionRate: 0.012 },
  { label: 'HVAC', ltvMin: 1200, ltvMax: 2500, conversionRate: 0.010 },
  { label: 'Roofer', ltvMin: 1500, ltvMax: 3500, conversionRate: 0.008 },
  { label: 'Electrician', ltvMin: 500, ltvMax: 1300, conversionRate: 0.013 },
  { label: 'Landscaper', ltvMin: 400, ltvMax: 1100, conversionRate: 0.015 },
  { label: 'Painter', ltvMin: 800, ltvMax: 1600, conversionRate: 0.011 },
  { label: 'General Contractor', ltvMin: 2000, ltvMax: 5000, conversionRate: 0.007 },
  { label: 'Custom', ltvMin: 500, ltvMax: 5000, conversionRate: 0.010 },
]

const CPM_COMPARISONS = [
  { channel: 'Vehicle Wrap', cpm: 0.77, color: 'var(--green)' },
  { channel: 'Billboard', cpm: 3.56, color: 'var(--amber)' },
  { channel: 'Google Display', cpm: 2.80, color: 'var(--accent)' },
  { channel: 'Radio', cpm: 13.00, color: 'var(--purple)' },
  { channel: 'Direct Mail', cpm: 19.00, color: 'var(--red)' },
]

interface ROICalculatorProps {
  onComplete: (data: {
    industry: string
    avgLtv: number
    investmentAmount: number
    expectedCustomers: number
    lifespanYears: number
  }) => void
  impressionEstimate?: number
}

export default function ROICalculator({ onComplete, impressionEstimate }: ROICalculatorProps) {
  const [industry, setIndustry] = useState('')
  const [avgLtv, setAvgLtv] = useState(1050)
  const [vehicles, setVehicles] = useState(1)
  const [customersPerYear, setCustomersPerYear] = useState(20)
  const [investmentPerWrap, setInvestmentPerWrap] = useState(3500)
  const [lifespanYears, setLifespanYears] = useState(5)

  const selectedIndustry = INDUSTRIES.find(i => i.label === industry)

  // Auto-calculate customers from impressions if available
  const effectiveCustomers = impressionEstimate && selectedIndustry
    ? Math.round(impressionEstimate * 260 * selectedIndustry.conversionRate)
    : customersPerYear

  const calc = useMemo(() => {
    const totalCost = investmentPerWrap * vehicles
    const yearlyRevenue = effectiveCustomers * avgLtv
    const lifetimeRevenue = yearlyRevenue * lifespanYears
    const netRoi = lifetimeRevenue - totalCost
    const roiPercent = totalCost > 0 ? ((netRoi / totalCost) * 100) : 0
    const breakEvenMonths = yearlyRevenue > 0 ? Math.ceil((totalCost / yearlyRevenue) * 12) : 0
    const monthlyImpressions = 50000 * vehicles
    const cpm = monthlyImpressions > 0 ? ((totalCost / lifespanYears / 12) / (monthlyImpressions / 1000)) : 0

    return {
      totalCost,
      yearlyRevenue,
      lifetimeRevenue,
      netRoi,
      roiPercent,
      breakEvenMonths,
      cpm: cpm.toFixed(2),
    }
  }, [avgLtv, vehicles, effectiveCustomers, investmentPerWrap, lifespanYears])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left — Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Calculator size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
            ROI Calculator
          </span>
        </div>

        {/* Industry */}
        <div>
          <label style={labelStyle}>Industry</label>
          <select
            value={industry}
            onChange={e => {
              setIndustry(e.target.value)
              const ind = INDUSTRIES.find(i => i.label === e.target.value)
              if (ind) setAvgLtv(Math.round((ind.ltvMin + ind.ltvMax) / 2))
            }}
            style={inputStyle}
          >
            <option value="">Select industry...</option>
            {INDUSTRIES.map(i => (
              <option key={i.label} value={i.label}>
                {i.label} (${i.ltvMin.toLocaleString()} - ${i.ltvMax.toLocaleString()} LTV)
              </option>
            ))}
          </select>
        </div>

        {/* Customer LTV */}
        <div>
          <label style={labelStyle}>Average Customer Lifetime Value ($)</label>
          <input
            type="number"
            value={avgLtv}
            onChange={e => setAvgLtv(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* Vehicles */}
        <div>
          <label style={labelStyle}>Number of Vehicles</label>
          <input
            type="number"
            value={vehicles}
            min={1}
            onChange={e => setVehicles(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* Customers per year */}
        <div>
          <label style={labelStyle}>Expected New Customers / Year</label>
          <input
            type="number"
            value={impressionEstimate ? effectiveCustomers : customersPerYear}
            onChange={e => setCustomersPerYear(Number(e.target.value))}
            disabled={!!impressionEstimate}
            style={{ ...inputStyle, opacity: impressionEstimate ? 0.6 : 1 }}
          />
          {impressionEstimate && (
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
              Auto-calculated from {impressionEstimate.toLocaleString()} daily impressions
            </div>
          )}
        </div>

        {/* Investment */}
        <div>
          <label style={labelStyle}>Investment Per Wrap ($)</label>
          <input
            type="number"
            value={investmentPerWrap}
            onChange={e => setInvestmentPerWrap(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* Lifespan */}
        <div>
          <label style={labelStyle}>Wrap Lifespan (years)</label>
          <input
            type="number"
            value={lifespanYears}
            min={1}
            max={10}
            onChange={e => setLifespanYears(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        <button
          onClick={() => onComplete({
            industry: industry || 'Custom',
            avgLtv,
            investmentAmount: investmentPerWrap * vehicles,
            expectedCustomers: effectiveCustomers,
            lifespanYears,
          })}
          disabled={!industry}
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            background: industry ? 'var(--green)' : 'var(--surface2)',
            color: industry ? '#fff' : 'var(--text3)',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: industry ? 'pointer' : 'not-allowed',
            marginTop: 8,
          }}
        >
          Continue to Route Mapping
        </button>
      </div>

      {/* Right — Live Output */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Big ROI Number */}
        <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Net ROI
          </div>
          <div style={{
            fontSize: 42,
            fontWeight: 900,
            fontFamily: 'JetBrains Mono, monospace',
            color: calc.netRoi > 0 ? 'var(--green)' : 'var(--red)',
            lineHeight: 1.1,
            marginTop: 4,
          }}>
            ${Math.abs(calc.netRoi).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            {calc.roiPercent.toFixed(0)}% return over {lifespanYears} years
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Fleet Revenue', value: `$${calc.lifetimeRevenue.toLocaleString()}`, icon: DollarSign, color: 'var(--green)' },
            { label: 'Total Cost', value: `$${calc.totalCost.toLocaleString()}`, icon: Target, color: 'var(--red)' },
            { label: 'Break Even', value: `${calc.breakEvenMonths} months`, icon: TrendingUp, color: 'var(--amber)' },
            { label: 'Effective CPM', value: `$${calc.cpm}`, icon: Zap, color: 'var(--cyan)' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--surface2)',
              borderRadius: 10,
              padding: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <stat.icon size={13} style={{ color: stat.color }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  {stat.label}
                </span>
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text1)',
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* CPM Comparison */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            CPM Comparison
          </div>
          {CPM_COMPARISONS.map(c => {
            const maxCpm = 20
            const pct = Math.min((c.cpm / maxCpm) * 100, 100)
            return (
              <div key={c.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', width: 100, flexShrink: 0 }}>{c.channel}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: c.color, width: 50, textAlign: 'right' }}>
                  ${c.cpm.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
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
  fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
}
