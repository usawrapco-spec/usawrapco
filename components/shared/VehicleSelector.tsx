'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleSelectResult {
  year: string
  make: string
  model: string
  sqft: number | null
  base_price: number | null
  install_hours: number | null
  measurement: Record<string, unknown> | null
}

interface ModelInfo {
  model: string
  sqft: number | null
  base_price: number | null
  install_hours: number | null
}

interface Props {
  onVehicleSelect: (result: VehicleSelectResult) => void
  defaultYear?: string
  defaultMake?: string
  defaultModel?: string
  disabled?: boolean
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 4, display: 'block',
  fontFamily: "'Barlow Condensed', sans-serif",
}

function selStyle(isDisabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '7px 28px 7px 10px',
    fontSize: 12,
    color: isDisabled ? 'var(--text3)' : 'var(--text1)',
    outline: 'none',
    fontFamily: 'inherit',
    appearance: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
  }
}

const YEARS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i)

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleSelector({
  onVehicleSelect,
  defaultYear = '',
  defaultMake = '',
  defaultModel = '',
  disabled = false,
}: Props) {
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [year, setYear] = useState(defaultYear)
  const [make, setMake] = useState(defaultMake)
  const [model, setModel] = useState(defaultModel)
  const [loadingMakes, setLoadingMakes] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Year → makes
  useEffect(() => {
    if (!year) { setMakes([]); return }
    setLoadingMakes(true)
    fetch(`/api/vehicles/makes?year=${year}`)
      .then(r => r.json())
      .then(d => { setMakes(d.makes || []); setLoadingMakes(false) })
      .catch(() => setLoadingMakes(false))
  }, [year])

  // Make → models
  useEffect(() => {
    if (!year || !make) { setModels([]); return }
    setLoadingModels(true)
    fetch(`/api/vehicles/models?year=${year}&make=${encodeURIComponent(make)}`)
      .then(r => r.json())
      .then(d => { setModels(d.models || []); setLoadingModels(false) })
      .catch(() => setLoadingModels(false))
  }, [year, make])

  // Initialize: if defaults provided, load makes + models
  useEffect(() => {
    if (defaultYear && !makes.length) {
      fetch(`/api/vehicles/makes?year=${defaultYear}`)
        .then(r => r.json())
        .then(d => setMakes(d.makes || []))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (defaultYear && defaultMake && !models.length) {
      fetch(`/api/vehicles/models?year=${defaultYear}&make=${encodeURIComponent(defaultMake)}`)
        .then(r => r.json())
        .then(d => setModels(d.models || []))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit(y: string, mk: string, mdl: string, info?: ModelInfo | null) {
    onVehicleSelect({
      year: y, make: mk, model: mdl,
      sqft: info?.sqft ?? null,
      base_price: info?.base_price ?? null,
      install_hours: info?.install_hours ?? null,
      measurement: null,
    })
    // Fetch full measurement when all three are set
    if (y && mk && mdl) {
      fetch(`/api/vehicles/lookup?year=${y}&make=${encodeURIComponent(mk)}&model=${encodeURIComponent(mdl)}`)
        .then(r => r.json())
        .then(d => {
          if (d.measurement) {
            const m = d.measurement as Record<string, unknown>
            const sqft = (m.full_wrap_sqft as number) || null
            onVehicleSelect({
              year: y, make: mk, model: mdl,
              sqft,
              base_price: sqft ? Math.round(sqft * 20) : null,
              install_hours: sqft ? Math.round((sqft / 30) * 10) / 10 : null,
              measurement: m,
            })
          }
        })
        .catch(() => {/* ignore */})
    }
  }

  const handleYearChange = (val: string) => {
    setYear(val); setMake(''); setModel('')
    emit(val, '', '', null)
  }

  const handleMakeChange = (val: string) => {
    setMake(val); setModel('')
    emit(year, val, '', null)
  }

  const handleModelChange = (val: string) => {
    setModel(val)
    const info = models.find(m => m.model === val) ?? null
    emit(year, make, val, info)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {/* Year */}
      <div>
        <label style={fieldLabel}>Year</label>
        <div style={{ position: 'relative' }}>
          <select
            value={year}
            onChange={e => handleYearChange(e.target.value)}
            style={selStyle(disabled)}
            disabled={disabled}
          >
            <option value="">Year</option>
            {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Make */}
      <div>
        <label style={fieldLabel}>Make</label>
        <div style={{ position: 'relative' }}>
          <select
            value={make}
            onChange={e => handleMakeChange(e.target.value)}
            style={selStyle(disabled || !year || loadingMakes)}
            disabled={disabled || !year || loadingMakes}
          >
            <option value="">{loadingMakes ? 'Loading...' : 'Make'}</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Model */}
      <div>
        <label style={fieldLabel}>Model</label>
        <div style={{ position: 'relative' }}>
          <select
            value={model}
            onChange={e => handleModelChange(e.target.value)}
            style={selStyle(disabled || !make || loadingModels)}
            disabled={disabled || !make || loadingModels}
          >
            <option value="">{loadingModels ? 'Loading...' : 'Model'}</option>
            {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
          </select>
          <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  )
}
