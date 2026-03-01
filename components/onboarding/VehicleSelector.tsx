'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, ChevronDown, Car } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleSelection {
  year: string
  make: string
  model: string
  sqft: number | null
  priceMin: number | null
  priceMax: number | null
}

interface Props {
  onChange: (data: VehicleSelection) => void
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  amber: '#f59e0b',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 800,
  color: C.text3,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: C.surface2,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '14px 40px 14px 16px',
  fontSize: 15,
  color: C.text1,
  outline: 'none',
  fontFamily: 'inherit',
  appearance: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleSelector({ onChange }: Props) {
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')

  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [measurement, setMeasurement] = useState<Record<string, unknown> | null>(null)

  const [loadingMakes, setLoadingMakes] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingMeasurement, setLoadingMeasurement] = useState(false)

  // Keep onChange ref stable to avoid effect deps issues
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange })

  // ── Year changes → fetch makes ───────────────────────────────────────────
  useEffect(() => {
    if (!year) {
      setMakes([])
      return
    }
    setLoadingMakes(true)
    fetch(`/api/vehicles/lookup?makes=1&year=${year}`)
      .then(r => r.json())
      .then(data => {
        setMakes(data.makes || [])
        setLoadingMakes(false)
      })
      .catch(() => setLoadingMakes(false))
  }, [year])

  // ── Make changes → fetch models ──────────────────────────────────────────
  useEffect(() => {
    if (!make) {
      setModels([])
      return
    }
    setLoadingModels(true)
    fetch(`/api/vehicles/lookup?models=1&make=${encodeURIComponent(make)}&year=${year}`)
      .then(r => r.json())
      .then(data => {
        setModels(data.models || [])
        setLoadingModels(false)
      })
      .catch(() => setLoadingModels(false))
  }, [make, year])

  // ── Full selection → fetch measurement + emit ────────────────────────────
  useEffect(() => {
    if (!year || !make || !model) {
      setMeasurement(null)
      return
    }
    setLoadingMeasurement(true)
    fetch(`/api/vehicles/lookup?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`)
      .then(r => r.json())
      .then(data => {
        const m = data.measurement ?? null
        setMeasurement(m)
        setLoadingMeasurement(false)
        const sqft: number | null = m
          ? ((m.full_wrap as number) || (m.total_sqft as number) || null)
          : null
        onChangeRef.current({
          year, make, model, sqft,
          priceMin: sqft ? Math.round(sqft * 18) : null,
          priceMax: sqft ? Math.round(sqft * 28) : null,
        })
      })
      .catch(() => {
        setLoadingMeasurement(false)
        onChangeRef.current({ year, make, model, sqft: null, priceMin: null, priceMax: null })
      })
  }, [year, make, model])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleYearChange = (val: string) => {
    setYear(val)
    setMake('')
    setModel('')
    setMeasurement(null)
    onChangeRef.current({ year: val, make: '', model: '', sqft: null, priceMin: null, priceMax: null })
  }

  const handleMakeChange = (val: string) => {
    setMake(val)
    setModel('')
    setMeasurement(null)
    onChangeRef.current({ year, make: val, model: '', sqft: null, priceMin: null, priceMax: null })
  }

  const handleModelChange = (val: string) => {
    setModel(val)
    // Measurement + final onChange will fire via the useEffect above
    onChangeRef.current({ year, make, model: val, sqft: null, priceMin: null, priceMax: null })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const sqft = measurement
    ? ((measurement.full_wrap as number) || (measurement.total_sqft as number) || null)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Year ─────────────────────────────────────────────────────────── */}
      <div>
        <label style={labelStyle}>Year *</label>
        <div style={{ position: 'relative' }}>
          <select
            style={selectStyle}
            value={year}
            onChange={e => handleYearChange(e.target.value)}
          >
            <option value="">Select year</option>
            {Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            color: C.text3, pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* ── Make ─────────────────────────────────────────────────────────── */}
      {year && (
        <div>
          <label style={labelStyle}>Make *</label>
          <div style={{ position: 'relative' }}>
            <select
              style={{ ...selectStyle, opacity: loadingMakes ? 0.6 : 1 }}
              value={make}
              onChange={e => handleMakeChange(e.target.value)}
              disabled={loadingMakes}
            >
              <option value="">
                {loadingMakes ? 'Loading makes...' : 'Select make'}
              </option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={16} style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              color: C.text3, pointerEvents: 'none',
            }} />
          </div>
          {!loadingMakes && makes.length === 0 && year && (
            <div style={{ fontSize: 12, color: C.amber, marginTop: 6 }}>
              No vehicles found for {year} — try a nearby year or enter a custom make below.
            </div>
          )}
          {/* Manual fallback if make not in DB */}
          {!loadingMakes && makes.length === 0 && year && (
            <input
              style={{
                ...selectStyle,
                marginTop: 8,
                appearance: 'none',
                cursor: 'text',
              }}
              placeholder="Enter make manually"
              value={make}
              onChange={e => handleMakeChange(e.target.value)}
            />
          )}
        </div>
      )}

      {/* ── Model ────────────────────────────────────────────────────────── */}
      {make && (
        <div>
          <label style={labelStyle}>Model *</label>
          <div style={{ position: 'relative' }}>
            {models.length > 0 ? (
              <>
                <select
                  style={{ ...selectStyle, opacity: loadingModels ? 0.6 : 1 }}
                  value={model}
                  onChange={e => handleModelChange(e.target.value)}
                  disabled={loadingModels}
                >
                  <option value="">
                    {loadingModels ? 'Loading models...' : 'Select model'}
                  </option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={16} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  color: C.text3, pointerEvents: 'none',
                }} />
              </>
            ) : (
              <input
                style={{ ...selectStyle, appearance: 'none', cursor: 'text' }}
                placeholder={loadingModels ? 'Loading models...' : 'Enter model'}
                value={model}
                onChange={e => handleModelChange(e.target.value)}
                disabled={loadingModels}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation card ─────────────────────────────────────────────── */}
      {year && make && model && (
        <div style={{
          background: C.surface,
          border: `2px solid ${measurement ? C.green : C.border}`,
          borderRadius: 14,
          padding: 20,
          marginTop: 4,
        }}>
          {loadingMeasurement ? (
            <div style={{ fontSize: 13, color: C.text3 }}>
              Looking up vehicle data...
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: sqft ? 16 : 0,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: `${measurement ? C.green : C.accent}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Car size={20} style={{ color: measurement ? C.green : C.accent }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 17, fontWeight: 800, color: C.text1,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {year} {make} {model}
                  </div>
                  <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
                    {measurement
                      ? 'Found in our vehicle database'
                      : "Not in our database — we'll measure on intake"}
                  </div>
                </div>
                {measurement && (
                  <CheckCircle2 size={22} style={{ color: C.green, flexShrink: 0 }} />
                )}
              </div>

              {sqft != null && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{
                    background: C.surface2, borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: C.text3,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                    }}>
                      Full Wrap Area
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 900, color: C.text1,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {sqft} sq ft
                    </div>
                  </div>
                  <div style={{
                    background: C.surface2, borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: C.text3,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                    }}>
                      Est. Price Range
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 900, color: C.amber,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      ${Math.round(sqft * 18).toLocaleString()}–${Math.round(sqft * 28).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}
