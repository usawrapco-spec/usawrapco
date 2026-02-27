'use client'

import { useState } from 'react'
import { Map, ArrowRight, ArrowLeft, SkipForward } from 'lucide-react'

interface Props {
  formData: {
    milesPerDay: number
    cityType: 'urban' | 'suburban' | 'rural'
    numVehicles: number
    estimatedDailyImpressions: number
  }
  onUpdate: (data: any) => void
  onNext: () => void
  onBack: () => void
}

const CITY_TYPES: { value: string; label: string; desc: string }[] = [
  { value: 'urban', label: 'Urban / Downtown', desc: 'Dense city center, heavy traffic' },
  { value: 'suburban', label: 'Suburban', desc: 'Residential areas, moderate traffic' },
  { value: 'rural', label: 'Rural / Highway', desc: 'Open roads, lighter traffic' },
]

export default function PublicRouteMapper({ formData, onUpdate, onNext, onBack }: Props) {
  const [milesPerDay, setMilesPerDay] = useState(formData.milesPerDay || 30)
  const [cityType, setCityType] = useState<'urban' | 'suburban' | 'rural'>(formData.cityType || 'suburban')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/public/roi/route-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milesPerDay,
          cityType,
          numVehicles: formData.numVehicles,
        }),
      })
      const data = await res.json()
      setResults(data)
    } catch (err) {
      console.error('Route estimate error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    onUpdate({
      milesPerDay,
      cityType,
      estimatedDailyImpressions: results?.dailyImpressions || 0,
    })
    onNext()
  }

  const handleSkip = () => {
    onUpdate({ milesPerDay: 30, cityType: 'suburban', estimatedDailyImpressions: 0 })
    onNext()
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
          <Map size={18} style={{ color: 'var(--purple)' }} />
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
            Estimate Your Daily Route
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px' }}>
          Tell us about your typical driving day so we can estimate real impressions.
        </p>

        {/* Miles Per Day Slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={labelStyle}>Miles Driven Per Day</label>
            <span style={{
              fontSize: 16,
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--accent)',
            }}>
              {milesPerDay} mi
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={150}
            value={milesPerDay}
            onChange={e => setMilesPerDay(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
            <span>5 mi</span>
            <span>150 mi</span>
          </div>
        </div>

        {/* City Type Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Primary Driving Area</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {CITY_TYPES.map(ct => (
              <button
                key={ct.value}
                onClick={() => setCityType(ct.value as 'urban' | 'suburban' | 'rural')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: `1px solid ${cityType === ct.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: cityType === ct.value ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: cityType === ct.value ? 'var(--accent)' : 'var(--text1)',
                  marginBottom: 2,
                }}>
                  {ct.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {ct.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Calculating...' : 'Calculate Impressions'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Impression Estimates
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Daily', value: results.dailyImpressions?.toLocaleString() || '0' },
              { label: 'Monthly', value: results.monthlyImpressions?.toLocaleString() || '0' },
              { label: 'Yearly', value: results.yearlyImpressions?.toLocaleString() || '0' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--surface2)',
                borderRadius: 10,
                padding: 14,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 900,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--purple)',
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          onClick={handleNext}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px',
            borderRadius: 10,
            background: results ? 'var(--green)' : 'var(--surface2)',
            color: results ? '#fff' : 'var(--text3)',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: results ? 'pointer' : 'not-allowed',
          }}
          disabled={!results}
        >
          Next: Get Your Tracking Code
          <ArrowRight size={16} />
        </button>
        <button
          onClick={handleSkip}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'transparent',
            color: 'var(--text3)',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          <SkipForward size={14} />
          Skip
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
