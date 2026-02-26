'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, Info, Ruler } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface MeasurementResult {
  make: string
  model: string
  year_start: number
  year_end: number
  full_wrap_sqft: number
  partial_wrap_sqft: number
  hood_sqft: number
  roof_sqft: number | null
  trunk_sqft: number
  doors_sqft: number
  side_sqft: number
  back_sqft: number
  side_width: number
  side_height: number
  body_style: string
}

interface Props {
  onMeasurementFound?: (measurement: MeasurementResult) => void
  onVehicleChange?: (year: number, make: string, model: string) => void
  initialYear?: number
  initialMake?: string
  initialModel?: string
  showDetailedBreakdown?: boolean
  compact?: boolean
  disabled?: boolean
}

const monoFont = "'JetBrains Mono', monospace"
const headingFont = "'Barlow Condensed', sans-serif"

const fieldSelectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text1)',
  outline: 'none',
  fontFamily: 'inherit',
  minHeight: 38,
  cursor: 'pointer',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: headingFont,
  marginBottom: 4,
  display: 'block',
}

export function VehicleMeasurementPicker({
  onMeasurementFound,
  onVehicleChange,
  initialYear,
  initialMake,
  initialModel,
  showDetailedBreakdown = true,
  compact = false,
  disabled = false,
}: Props) {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState<number>(initialYear || currentYear)
  const [make, setMake] = useState<string>(initialMake || '')
  const [model, setModel] = useState<string>(initialModel || '')
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [matchStatus, setMatchStatus] = useState<'exact' | 'range' | 'closest' | 'none' | null>(null)

  useEffect(() => {
    supabase
      .from('vehicle_measurements')
      .select('make')
      .order('make')
      .then(({ data }) => {
        const uniqueMakes = [...new Set((data || []).map((x: { make: string }) => x.make))].sort()
        setMakes(uniqueMakes)
      })
  }, [])

  useEffect(() => {
    if (!make) { setModels([]); return }
    supabase
      .from('vehicle_measurements')
      .select('model')
      .eq('make', make)
      .order('model')
      .then(({ data }) => {
        const uniqueModels = [...new Set((data || []).map((x: { model: string }) => x.model))].sort()
        setModels(uniqueModels)
        if (model && !uniqueModels.includes(model)) setModel('')
      })
  }, [make])

  useEffect(() => {
    if (!year || !make || !model) {
      setMeasurement(null)
      setMatchStatus(null)
      return
    }
    fetchMeasurement()
  }, [year, make, model])

  const fetchMeasurement = useCallback(async () => {
    setLoading(true)
    setMatchStatus(null)

    const { data: rangeMatch } = await supabase
      .from('vehicle_measurements')
      .select('*')
      .eq('make', make)
      .ilike('model', model)
      .lte('year_start', year)
      .gte('year_end', year)
      .order('year_start', { ascending: false })
      .limit(1)

    if (rangeMatch && rangeMatch.length > 0) {
      const m = rangeMatch[0] as MeasurementResult
      setMeasurement(m)
      setMatchStatus(m.year_start === year && m.year_end === year ? 'exact' : 'range')
      onMeasurementFound?.(m)
      setLoading(false)
      return
    }

    const { data: closest } = await supabase
      .from('vehicle_measurements')
      .select('*')
      .eq('make', make)
      .ilike('model', model)
      .order('year_start', { ascending: false })
      .limit(1)

    if (closest && closest.length > 0) {
      const m = closest[0] as MeasurementResult
      setMeasurement(m)
      setMatchStatus('closest')
      onMeasurementFound?.(m)
    } else {
      setMeasurement(null)
      setMatchStatus('none')
    }

    setLoading(false)
  }, [year, make, model, supabase, onMeasurementFound])

  const yearOptions = Array.from(
    { length: currentYear + 2 - 1985 + 1 },
    (_, i) => currentYear + 2 - i
  )

  function handleYearChange(yr: number) {
    setYear(yr)
    onVehicleChange?.(yr, make, model)
  }

  function handleMakeChange(m: string) {
    setMake(m)
    setModel('')
    setMeasurement(null)
    setMatchStatus(null)
    onVehicleChange?.(year, m, '')
  }

  function handleModelChange(m: string) {
    setModel(m)
    onVehicleChange?.(year, make, m)
  }

  return (
    <div style={compact ? { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' } : {}}>
      <div style={compact
        ? { display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }
        : { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }
      }>
        <div style={compact ? { minWidth: 80, flex: '0 0 80px' } : {}}>
          <label style={fieldLabelStyle}>Year</label>
          <select
            value={year}
            onChange={e => handleYearChange(Number(e.target.value))}
            style={fieldSelectStyle}
            disabled={disabled}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={compact ? { minWidth: 120, flex: 1 } : {}}>
          <label style={fieldLabelStyle}>Make</label>
          <select
            value={make}
            onChange={e => handleMakeChange(e.target.value)}
            style={fieldSelectStyle}
            disabled={disabled}
          >
            <option value="">-- Select Make --</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={compact ? { minWidth: 140, flex: 1 } : {}}>
          <label style={fieldLabelStyle}>Model</label>
          <select
            value={model}
            onChange={e => handleModelChange(e.target.value)}
            style={{ ...fieldSelectStyle, opacity: !make ? 0.4 : 1 }}
            disabled={disabled || !make}
          >
            <option value="">{make ? '-- Select Model --' : 'Select make first'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {matchStatus && !loading && (
        <div style={{ marginTop: compact ? 0 : 8, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {matchStatus === 'exact' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, padding: '3px 8px', borderRadius: 99,
              background: 'rgba(34,192,122,0.1)', color: 'var(--green)',
              border: '1px solid rgba(34,192,122,0.2)',
            }}>
              <CheckCircle2 size={10} /> Exact match
            </span>
          )}
          {matchStatus === 'range' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, padding: '3px 8px', borderRadius: 99,
              background: 'rgba(245,158,11,0.1)', color: 'var(--amber)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <CheckCircle2 size={10} /> {measurement?.year_start}-{measurement?.year_end} generation
            </span>
          )}
          {matchStatus === 'closest' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, padding: '3px 8px', borderRadius: 99,
              background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
              border: '1px solid rgba(79,127,255,0.2)',
            }}>
              <AlertTriangle size={10} /> Closest data ({measurement?.year_start}-{measurement?.year_end})
            </span>
          )}
          {matchStatus === 'none' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, padding: '3px 8px', borderRadius: 99,
              background: 'var(--surface2)', color: 'var(--text3)',
              border: '1px solid var(--border)',
            }}>
              <Info size={10} /> Not in database
            </span>
          )}
        </div>
      )}

      {showDetailedBreakdown && measurement && !compact && (
        <div style={{
          marginTop: 10, padding: 14, borderRadius: 10,
          background: 'var(--bg)', border: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--amber)',
            fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Ruler size={11} /> Square Footage Breakdown
            <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 9, textTransform: 'none', letterSpacing: 0 }}>
              (includes 6&quot; bleed)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Full Wrap</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: monoFont }}>
                {measurement.full_wrap_sqft} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Partial (Sides)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', fontFamily: monoFont }}>
                {measurement.partial_wrap_sqft} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Each Side</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
                {measurement.side_sqft} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Hood</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
                {measurement.hood_sqft} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Roof</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
                {measurement.roof_sqft ?? '--'} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Rear</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
                {measurement.back_sqft} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Trunk/Tailgate</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
                {measurement.trunk_sqft} sq ft
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Doors</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
                {measurement.doors_sqft} sq ft
              </span>
            </div>
          </div>

          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)',
            display: 'flex', gap: 14, fontSize: 10, color: 'var(--text3)', fontFamily: monoFont,
          }}>
            <span>Side: {measurement.side_width}&quot;W x {measurement.side_height}&quot;H</span>
            {measurement.body_style && (
              <span style={{ color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {measurement.body_style}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VehicleMeasurementPicker
