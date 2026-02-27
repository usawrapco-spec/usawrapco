'use client'

import { useState, useEffect, useRef } from 'react'
import { Calculator, TrendingUp, DollarSign, Target, Zap, ArrowRight } from 'lucide-react'
import { INDUSTRIES, CPM_COMPARISONS } from '@/lib/roi/constants'

interface Props {
  formData: {
    industry: string
    avgJobValue: number
    numVehicles: number
    primaryCity: string
  }
  onUpdate: (data: any) => void
  onNext: () => void
}

export default function PublicROICalculator({ formData, onUpdate, onNext }: Props) {
  const [industry, setIndustry] = useState(formData.industry)
  const [avgJobValue, setAvgJobValue] = useState(formData.avgJobValue || 1000)
  const [numVehicles, setNumVehicles] = useState(formData.numVehicles || 1)
  const [primaryCity, setPrimaryCity] = useState(formData.primaryCity)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!industry) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/public/roi/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ industry, avgJobValue, numVehicles, primaryCity }),
        })
        const data = await res.json()
        setResults(data)
      } catch (err) {
        console.error('Calculate error:', err)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [industry, avgJobValue, numVehicles, primaryCity])

  const handleNext = () => {
    onUpdate({
      industry,
      avgJobValue,
      numVehicles,
      primaryCity,
      monthlyImpressions: results?.monthlyImpressions || 0,
      monthlyLeads: results?.monthlyLeads || 0,
      monthlyRevenue: results?.monthlyRevenue || 0,
      annualRevenue: results?.annualRevenue || 0,
      roiMultiplier: results?.roiMultiplier || 0,
      effectiveCPM: results?.effectiveCPM || 0,
    })
    onNext()
  }

  const selectedIndustry = INDUSTRIES.find(i => i.label === industry)

  return (
    <div>
      {/* Input Form */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 24,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Calculator size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
            Tell Us About Your Business
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>What industry are you in?</label>
            <select
              value={industry}
              onChange={e => {
                setIndustry(e.target.value)
                const ind = INDUSTRIES.find(i => i.label === e.target.value)
                if (ind) setAvgJobValue(Math.round((ind.ltvMin + ind.ltvMax) / 2))
              }}
              style={inputStyle}
            >
              <option value="">Select your industry...</option>
              {INDUSTRIES.map(i => (
                <option key={i.label} value={i.label}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Average Job Value ($)</label>
            <input
              type="number"
              value={avgJobValue}
              onChange={e => setAvgJobValue(Number(e.target.value))}
              style={inputStyle}
            />
            {selectedIndustry && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                {selectedIndustry.label} avg: ${selectedIndustry.ltvMin.toLocaleString()} - ${selectedIndustry.ltvMax.toLocaleString()}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Number of Vehicles</label>
            <input
              type="number"
              value={numVehicles}
              min={1}
              max={100}
              onChange={e => setNumVehicles(Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Primary City / Area</label>
            <input
              value={primaryCity}
              onChange={e => setPrimaryCity(e.target.value)}
              placeholder="e.g. Seattle, WA"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Live Results */}
      {results && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(34,192,122,0.3)',
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Your Projected Results
          </div>

          {/* Big Numbers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              {
                label: 'Monthly Impressions',
                value: results.monthlyImpressions?.toLocaleString() || '0',
                icon: Target,
                color: 'var(--accent)',
              },
              {
                label: 'Monthly Leads',
                value: results.monthlyLeads?.toString() || '0',
                icon: TrendingUp,
                color: 'var(--cyan)',
              },
              {
                label: 'Monthly Revenue',
                value: `$${(results.monthlyRevenue || 0).toLocaleString()}`,
                icon: DollarSign,
                color: 'var(--green)',
              },
              {
                label: 'ROI Multiplier',
                value: `${results.roiMultiplier || 0}x`,
                icon: Zap,
                color: 'var(--purple)',
              },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--surface2)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <stat.icon size={13} style={{ color: stat.color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>
                    {stat.label}
                  </span>
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text1)',
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* CPM Comparison */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Cost Per 1,000 Impressions
            </div>
            {CPM_COMPARISONS.map(c => {
              const maxCpm = 20
              const pct = Math.min((c.cpm / maxCpm) * 100, 100)
              return (
                <div key={c.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)', width: 100, flexShrink: 0 }}>{c.channel}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: c.color,
                      borderRadius: 3,
                      transition: 'width 0.5s',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: c.color,
                    width: 50,
                    textAlign: 'right',
                  }}>
                    ${c.cpm.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={!industry || !results}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          background: industry && results ? 'var(--green)' : 'var(--surface2)',
          color: industry && results ? '#fff' : 'var(--text3)',
          fontSize: 15,
          fontWeight: 700,
          border: 'none',
          cursor: industry && results ? 'pointer' : 'not-allowed',
        }}
      >
        Next: Map Your Route
        <ArrowRight size={16} />
      </button>
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
  boxSizing: 'border-box',
}
