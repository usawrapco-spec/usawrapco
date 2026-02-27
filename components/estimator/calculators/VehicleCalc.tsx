'use client'

import { useState, useEffect, useRef } from 'react'
import { Car, Search, ChevronDown, Plus } from 'lucide-react'
import vehiclesData from '@/lib/data/vehicles.json'
import type { LineItemState, Coverage, VehicleData, VehicleSize } from '@/lib/estimator/types'
import { TIER_SIZE_MAP, SIZE_SQFT } from '@/lib/estimator/types'
import { COVERAGE_LABELS } from '@/lib/estimator/vehicleDb'

interface VehicleEntry {
  year: number
  make: string
  model: string
  sqft: number
  basePrice: number
  installHours: number
  tier: string
}

const VEHICLES_DB: VehicleEntry[] = vehiclesData as VehicleEntry[]
const ALL_MAKES = [...new Set(VEHICLES_DB.map(v => v.make))].sort()
const YEARS = Array.from({ length: 37 }, (_, i) => 2026 - i)
const COVERAGES: Coverage[] = ['half', 'threequarter', 'full']

interface VehicleCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

export default function VehicleCalc({ item, onChange }: VehicleCalcProps) {
  const [makeOpen, setMakeOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [makeFilter, setMakeFilter] = useState('')
  const makeRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const selectedYear = item.year ? parseInt(item.year) : null
  const selectedMake = item.make || ''
  const selectedModel = item.model || ''

  const filteredMakes = makeFilter
    ? ALL_MAKES.filter(m => m.toLowerCase().includes(makeFilter.toLowerCase()))
    : ALL_MAKES

  const models = selectedMake
    ? [...new Set(VEHICLES_DB.filter(v => v.make === selectedMake).map(v => v.model))].sort()
    : []

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) setMakeOpen(false)
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function findVehicle(make: string, model: string, year?: number): VehicleEntry | null {
    if (year) {
      const exact = VEHICLES_DB.find(v => v.make === make && v.model === model && v.year === year)
      if (exact) return exact
    }
    return VEHICLES_DB.find(v => v.make === make && v.model === model) || null
  }

  function buildVehicleData(entry: VehicleEntry): VehicleData {
    const size: VehicleSize = TIER_SIZE_MAP[entry.tier] || 'medium'
    const sqftData = SIZE_SQFT[size]
    return {
      size,
      sqft: { half: sqftData.half, threequarter: sqftData.threequarter, full: sqftData.full },
      roof: sqftData.roof,
    }
  }

  function handleMakeSelect(make: string) {
    setMakeOpen(false)
    setMakeFilter('')
    onChange({ make, model: '', vData: undefined, sqft: 0, roofSqft: 0 })
  }

  function handleModelSelect(model: string) {
    setModelOpen(false)
    const entry = findVehicle(selectedMake, model, selectedYear || undefined)
    if (entry) {
      const vData = buildVehicleData(entry)
      const coverage = item.coverage || 'full'
      onChange({
        model,
        vData,
        sqft: vData.sqft[coverage],
        roofSqft: vData.roof || 0,
        name: item.name || `${selectedMake} ${model} ${COVERAGE_LABELS[coverage]}`,
      })
    } else {
      onChange({ model })
    }
  }

  function handleCoverageSelect(c: Coverage) {
    const newSqft = item.vData ? item.vData.sqft[c] : item.sqft
    onChange({
      coverage: c,
      sqft: newSqft,
      name: selectedMake && selectedModel
        ? `${selectedMake} ${selectedModel} ${COVERAGE_LABELS[c]}`
        : item.name,
    })
  }

  function handleAddRoof() {
    if (!item.vData) return
    onChange({ includeRoof: !item.includeRoof })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Year / Make / Model row */}
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 8 }}>
        {/* Year */}
        <div>
          <label style={lbl}>Year</label>
          <select
            value={item.year || ''}
            onChange={e => onChange({ year: e.target.value })}
            style={selStyle}
          >
            <option value="">Any</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Make */}
        <div ref={makeRef} style={{ position: 'relative' }}>
          <label style={lbl}>Make</label>
          <div
            onClick={() => setMakeOpen(!makeOpen)}
            style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ color: selectedMake ? 'var(--text1)' : 'var(--text3)' }}>
              {selectedMake || 'Select make...'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          </div>
          {makeOpen && (
            <div style={dropdownStyle}>
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={makeFilter}
                  onChange={e => setMakeFilter(e.target.value)}
                  autoFocus
                  style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filteredMakes.map(m => (
                  <div
                    key={m}
                    onClick={() => handleMakeSelect(m)}
                    style={optStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Model */}
        <div ref={modelRef} style={{ position: 'relative' }}>
          <label style={lbl}>Model</label>
          <div
            onClick={() => selectedMake && setModelOpen(!modelOpen)}
            style={{
              ...inputStyle,
              cursor: selectedMake ? 'pointer' : 'not-allowed',
              opacity: selectedMake ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ color: selectedModel ? 'var(--text1)' : 'var(--text3)' }}>
              {selectedModel || 'Select model...'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          </div>
          {modelOpen && (
            <div style={dropdownStyle}>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {models.map(m => (
                  <div
                    key={m}
                    onClick={() => handleModelSelect(m)}
                    style={optStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coverage Chips */}
      <div>
        <label style={lbl}>Coverage</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {COVERAGES.map(c => (
            <button
              key={c}
              onClick={() => handleCoverageSelect(c)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: item.coverage === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: item.coverage === c ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                color: item.coverage === c ? 'var(--accent)' : 'var(--text2)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                minHeight: 44,
              }}
            >
              {COVERAGE_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Sqft display + roof addon */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Sqft</label>
          <input
            type="number"
            value={item.sqft || ''}
            onChange={e => onChange({ sqft: parseFloat(e.target.value) || 0 })}
            style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
            placeholder="Auto-calculated"
          />
        </div>
        {item.vData?.roof && (
          <button
            onClick={handleAddRoof}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 14px', borderRadius: 8, minHeight: 44,
              border: item.includeRoof ? '2px solid var(--green)' : '1px solid var(--border)',
              background: item.includeRoof ? 'rgba(34,192,122,0.12)' : 'var(--surface2)',
              color: item.includeRoof ? 'var(--green)' : 'var(--text2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase',
            }}
          >
            <Plus size={14} />
            Roof (+{item.roofSqft} sqft)
          </button>
        )}
      </div>

      {/* Vehicle info badge */}
      {item.vData && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Size: <span style={{ color: 'var(--accent)' }}>{item.vData.size.toUpperCase()}</span>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>|</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Sqft: <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{item.sqft}</span>
          </span>
          {item.includeRoof && (
            <>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>|</span>
              <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                +Roof {item.roofSqft} sqft
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared Styles ─────────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  fontFamily: "'Barlow Condensed', sans-serif",
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text1)',
  outline: 'none', fontFamily: 'inherit', minHeight: 38,
}

const selStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
  appearance: 'none' as const, WebkitAppearance: 'none' as const,
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const optStyle: React.CSSProperties = {
  padding: '7px 12px', fontSize: 12, color: 'var(--text1)', cursor: 'pointer',
  borderBottom: '1px solid rgba(42,47,61,0.5)',
}
