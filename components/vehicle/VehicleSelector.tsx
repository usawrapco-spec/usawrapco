'use client'

import { useState, useRef, useEffect } from 'react'
import { Car, Search, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VehicleEntry {
  year: number
  make: string
  model: string
  sqft: number
  basePrice: number
  installHours: number
  tier: string
}

interface ModelInfo {
  model: string
  sqft: number | null
  base_price: number | null
  install_hours: number | null
}

interface VehicleSelectorProps {
  onVehicleSelect: (vehicle: VehicleEntry) => void
  defaultYear?: number
  defaultMake?: string
  defaultModel?: string
  showVinField?: boolean
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const monoFont = "'JetBrains Mono', monospace"
const headingFont = "'Barlow Condensed', sans-serif"

const YEARS = Array.from({ length: 37 }, (_, i) => 2026 - i)

const fieldInputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)',
  outline: 'none', fontFamily: 'inherit', minHeight: 38,
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
  letterSpacing: '0.06em', fontFamily: headingFont, marginBottom: 4, display: 'block',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, marginTop: 2, maxHeight: 200, overflowY: 'auto',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const optionStyle: React.CSSProperties = {
  padding: '7px 12px', fontSize: 12, color: 'var(--text1)', cursor: 'pointer',
  borderBottom: '1px solid var(--border)',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function measurementToEntry(
  data: Record<string, unknown>,
  make: string,
  model: string,
  year: number | null,
): VehicleEntry {
  const sqft = Number(data.full_wrap_sqft) || 0
  return {
    year: year || 0,
    make,
    model,
    sqft,
    basePrice: sqft ? Math.round(sqft * 20) : 0,
    installHours: sqft ? Math.round((sqft / 30) * 10) / 10 : 8,
    tier: (data.body_style as string) || 'standard',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VehicleSelector({
  onVehicleSelect,
  defaultYear,
  defaultMake,
  defaultModel,
  showVinField = false,
}: VehicleSelectorProps) {
  // VIN state
  const [vin, setVin] = useState('')
  const [vinLoading, setVinLoading] = useState(false)
  const [vinResult, setVinResult] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(!showVinField)

  // Vehicle fields
  const [selectedYear, setSelectedYear] = useState<number | null>(defaultYear || null)
  const [selectedMake, setSelectedMake] = useState(defaultMake || '')
  const [selectedModel, setSelectedModel] = useState(defaultModel || '')
  const [currentMatch, setCurrentMatch] = useState<VehicleEntry | null>(null)

  // API-loaded data
  const [allMakes, setAllMakes] = useState<string[]>([])
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [loadingMakes, setLoadingMakes] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Dropdown open state
  const [yearOpen, setYearOpen] = useState(false)
  const [makeOpen, setMakeOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [makeFilter, setMakeFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  const yearRef = useRef<HTMLDivElement>(null)
  const makeRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  // Load all makes on mount
  useEffect(() => {
    setLoadingMakes(true)
    fetch('/api/vehicles/makes')
      .then(r => r.json())
      .then(d => { setAllMakes(d.makes || []); setLoadingMakes(false) })
      .catch(() => setLoadingMakes(false))
  }, [])

  // Load models when make changes
  useEffect(() => {
    if (!selectedMake) { setAvailableModels([]); return }
    setLoadingModels(true)
    const yearParam = selectedYear ? `&year=${selectedYear}` : ''
    fetch(`/api/vehicles/models?make=${encodeURIComponent(selectedMake)}${yearParam}`)
      .then(r => r.json())
      .then(d => { setAvailableModels(d.models || []); setLoadingModels(false) })
      .catch(() => setLoadingModels(false))
  }, [selectedMake, selectedYear])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearOpen(false)
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) setMakeOpen(false)
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ─── API Lookup ────────────────────────────────────────────────────────

  async function lookupVehicle(make: string, model: string, year: number | null): Promise<VehicleEntry | null> {
    try {
      const yearParam = year ? `&year=${year}` : ''
      const res = await fetch(`/api/vehicles/lookup?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}${yearParam}`)
      const data = await res.json()
      if (data.measurement) {
        const entry = measurementToEntry(data.measurement, make, model, year)
        setCurrentMatch(entry)
        onVehicleSelect(entry)
        return entry
      }
    } catch {/* ignore */}
    return null
  }

  // ─── VIN Decode ────────────────────────────────────────────────────────

  async function decodeVIN(vinStr: string) {
    if (vinStr.length !== 17) return
    setVinLoading(true)
    setVinResult(null)
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vinStr}?format=json`)
      const data = await res.json()
      const results = data.Results as { Variable: string; Value: string | null }[]
      const get = (name: string) => results.find(r => r.Variable === name)?.Value || ''
      const year = get('Model Year')
      const make = get('Make')
      const model = get('Model')
      const trim = get('Trim')
      const bodyClass = get('Body Class')
      if (make && model) {
        const yearNum = parseInt(year) || null
        setSelectedYear(yearNum)
        setSelectedMake(make)
        setSelectedModel(model)
        const entry = await lookupVehicle(make, model, yearNum)
        if (entry) {
          setVinResult(`${year} ${make} ${model}${trim ? ` ${trim}` : ''} - ${entry.sqft} sqft, $${entry.basePrice}`)
        } else {
          setVinResult(`${year} ${make} ${model}${trim ? ` ${trim}` : ''}${bodyClass ? ` (${bodyClass})` : ''} - not in database`)
        }
      } else {
        setVinResult('VIN not found - enter vehicle info manually')
        setManualMode(true)
      }
    } catch {
      setVinResult('VIN lookup failed - enter manually')
      setManualMode(true)
    }
    setVinLoading(false)
  }

  // ─── Selection Handlers ────────────────────────────────────────────────

  function handleYearSelect(yr: number) {
    setSelectedYear(yr)
    setYearOpen(false)
    if (selectedMake && selectedModel) {
      lookupVehicle(selectedMake, selectedModel, yr)
    }
  }

  function handleMakeSelect(make: string) {
    setSelectedMake(make)
    setMakeOpen(false)
    setMakeFilter('')
    if (make !== selectedMake) {
      setSelectedModel('')
      setCurrentMatch(null)
    }
  }

  function handleModelSelect(model: string) {
    setSelectedModel(model)
    setModelOpen(false)
    setModelFilter('')
    lookupVehicle(selectedMake, model, selectedYear)
  }

  // ─── Filtered Lists ────────────────────────────────────────────────────

  const filteredMakes = makeFilter
    ? allMakes.filter(m => m.toLowerCase().includes(makeFilter.toLowerCase()))
    : allMakes

  const filteredModels = modelFilter
    ? availableModels.filter(m => m.model.toLowerCase().includes(modelFilter.toLowerCase()))
    : availableModels

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
        fontSize: 11, fontWeight: 700, color: 'var(--accent)',
        fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <Car size={13} /> Vehicle Lookup
      </div>

      {/* ── VIN Field ─────────────────────────────────────────────────── */}
      {showVinField && (
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabelStyle}>VIN (17 characters)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={vin}
              onChange={e => {
                const v = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
                setVin(v)
                if (v.length === 17) decodeVIN(v)
              }}
              style={{ ...fieldInputStyle, flex: 1, fontFamily: monoFont, letterSpacing: '0.1em' }}
              placeholder="1FTFW1E50MFA12345"
              maxLength={17}
            />
            <button
              onClick={() => { if (vin.length === 17) decodeVIN(vin) }}
              disabled={vinLoading || vin.length !== 17}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: vinLoading ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(34,192,122,0.3)',
                background: vin.length === 17 ? 'rgba(34,192,122,0.12)' : 'rgba(34,192,122,0.04)',
                color: 'var(--green)', opacity: vinLoading ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Search size={12} />
              {vinLoading ? 'Looking up...' : 'Decode VIN'}
            </button>
          </div>

          {vinResult && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
              padding: '6px 10px', borderRadius: 6, fontSize: 11,
              background: vinResult.includes('sqft') ? 'rgba(34,192,122,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${vinResult.includes('sqft') ? 'rgba(34,192,122,0.2)' : 'rgba(245,158,11,0.2)'}`,
              color: vinResult.includes('sqft') ? 'var(--green)' : 'var(--amber)',
            }}>
              {vinResult.includes('sqft') ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {vinResult}
            </div>
          )}

          {!manualMode && !vinResult && (
            <button
              onClick={() => setManualMode(true)}
              style={{
                marginTop: 6, background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0,
              }}
            >
              Enter manually instead
            </button>
          )}
        </div>
      )}

      {/* ── Year / Make / Model Dropdowns ─────────────────────────────── */}
      {(manualMode || vinResult || !showVinField) && (
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 8 }}>
          {/* Year */}
          <div ref={yearRef} style={{ position: 'relative' }}>
            <label style={fieldLabelStyle}>Year</label>
            <button
              onClick={() => setYearOpen(!yearOpen)}
              style={{
                ...fieldInputStyle, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ color: selectedYear ? 'var(--text1)' : 'var(--text3)' }}>
                {selectedYear || 'Select year'}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--text3)' }} />
            </button>
            {yearOpen && (
              <div style={dropdownStyle}>
                {YEARS.map(yr => (
                  <div
                    key={yr}
                    style={{
                      ...optionStyle,
                      fontFamily: monoFont,
                      fontWeight: yr === selectedYear ? 700 : 400,
                      color: yr === selectedYear ? 'var(--accent)' : 'var(--text1)',
                    }}
                    onMouseDown={() => handleYearSelect(yr)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {yr}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Make */}
          <div ref={makeRef} style={{ position: 'relative' }}>
            <label style={fieldLabelStyle}>Make</label>
            <input
              value={makeOpen ? makeFilter : selectedMake}
              onChange={e => { setMakeFilter(e.target.value); if (!makeOpen) setMakeOpen(true) }}
              onFocus={() => setMakeOpen(true)}
              style={fieldInputStyle}
              placeholder={loadingMakes ? 'Loading makes...' : 'Search makes...'}
            />
            {makeOpen && filteredMakes.length > 0 && (
              <div style={dropdownStyle}>
                {filteredMakes.map(m => (
                  <div key={m} style={optionStyle}
                    onMouseDown={() => handleMakeSelect(m)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model */}
          <div ref={modelRef} style={{ position: 'relative' }}>
            <label style={fieldLabelStyle}>Model</label>
            <input
              value={modelOpen ? modelFilter : selectedModel}
              onChange={e => { setModelFilter(e.target.value); if (!modelOpen) setModelOpen(true) }}
              onFocus={() => { if (selectedMake) setModelOpen(true) }}
              style={fieldInputStyle}
              placeholder={selectedMake ? (loadingModels ? 'Loading models...' : 'Search models...') : 'Select make first'}
              disabled={!selectedMake}
            />
            {modelOpen && filteredModels.length > 0 && (
              <div style={dropdownStyle}>
                {filteredModels.map(m => (
                  <div key={m.model} style={{ ...optionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseDown={() => handleModelSelect(m.model)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span>{m.model}</span>
                    {m.sqft && m.sqft > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: monoFont }}>
                        {m.sqft}sqft | ${m.base_price}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vehicle Match Badge ───────────────────────────────────────── */}
      {currentMatch && currentMatch.sqft > 0 && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 8, padding: '5px 10px',
          background: 'rgba(34,192,122,0.06)', borderRadius: 6,
          border: '1px solid rgba(34,192,122,0.12)', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 10, color: 'var(--green)', fontWeight: 700,
            fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Vehicle Data
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            {currentMatch.sqft} sqft
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            ${currentMatch.basePrice}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            {currentMatch.installHours}hrs
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
            {currentMatch.tier.replace(/_/g, ' ')}
          </span>
        </div>
      )}
    </div>
  )
}
