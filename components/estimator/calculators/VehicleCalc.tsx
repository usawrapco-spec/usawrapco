'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Award, Ruler, DollarSign } from 'lucide-react'
import vehiclesData from '@/lib/data/vehicles.json'
import type { LineItemState, Coverage, VehicleData, VehicleSize } from '@/lib/estimator/types'
import { TIER_SIZE_MAP, SIZE_SQFT } from '@/lib/estimator/types'
import { COVERAGE_LABELS } from '@/lib/estimator/vehicleDb'
import {
  type VehiclePanelSpec, type PanelData, type WrapTier,
  VEHICLE_DATABASE, WRAP_TIERS, WASTE_BUFFER_OPTIONS,
  getAvailableMakes, getModelsForMake, findVehicleSpec,
  calcSelectedSqft, calcWithWaste, sqftToLinearFeet, getTierPanelIds,
} from '@/lib/vehicleDatabase'

// ─── Legacy fallback types ────────────────────────────────────────────────────
interface VehicleEntry {
  year: number; make: string; model: string
  sqft: number; basePrice: number; installHours: number; tier: string
}

const LEGACY_DB: VehicleEntry[] = vehiclesData as VehicleEntry[]
const YEARS = Array.from({ length: 37 }, (_, i) => 2026 - i)
const COVERAGES: Coverage[] = ['half', 'threequarter', 'full']

// Merge makes from both databases
const PANEL_MAKES = getAvailableMakes()
const LEGACY_MAKES = [...new Set(LEGACY_DB.map(v => v.make))].sort()
const ALL_MAKES = [...new Set([...PANEL_MAKES, ...LEGACY_MAKES])].sort()

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

  // Panel state
  const [selectedPanels, setSelectedPanels] = useState<string[]>([])
  const [wasteBuffer, setWasteBuffer] = useState(10)
  const [vehicleSpec, setVehicleSpec] = useState<VehiclePanelSpec | null>(null)

  const selectedYear = item.year ? parseInt(item.year) : null
  const selectedMake = item.make || ''
  const selectedModel = item.model || ''

  const filteredMakes = makeFilter
    ? ALL_MAKES.filter(m => m.toLowerCase().includes(makeFilter.toLowerCase()))
    : ALL_MAKES

  // Get models — prefer panel database, fall back to legacy
  const models = useMemo(() => {
    if (!selectedMake) return []
    const panelModels = getModelsForMake(selectedMake)
    const legacyModels = [...new Set(LEGACY_DB.filter(v => v.make === selectedMake).map(v => v.model))].sort()
    const seen = new Set<string>()
    const result: { label: string; model: string; variant?: string }[] = []
    panelModels.forEach(m => {
      const label = m.variant ? `${m.model} (${m.variant})` : m.model
      if (!seen.has(label)) { seen.add(label); result.push({ label, ...m }) }
    })
    legacyModels.forEach(m => {
      if (!seen.has(m)) { seen.add(m); result.push({ label: m, model: m }) }
    })
    return result.sort((a, b) => a.label.localeCompare(b.label))
  }, [selectedMake])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) setMakeOpen(false)
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Live math calculations ─────────────────────────────────────────────────
  const selectedSqft = vehicleSpec ? calcSelectedSqft(vehicleSpec.panels, selectedPanels) : 0
  const totalWithWaste = calcWithWaste(selectedSqft, wasteBuffer)
  const linearFeet = sqftToLinearFeet(totalWithWaste)
  const matCostEstimate = totalWithWaste * item.matRate

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function findLegacyVehicle(make: string, model: string, year?: number): VehicleEntry | null {
    if (year) {
      const exact = LEGACY_DB.find(v => v.make === make && v.model === model && v.year === year)
      if (exact) return exact
    }
    return LEGACY_DB.find(v => v.make === make && v.model === model) || null
  }

  function buildVehicleData(entry: VehicleEntry): VehicleData {
    const size: VehicleSize = TIER_SIZE_MAP[entry.tier] || 'medium'
    const sqftData = SIZE_SQFT[size]
    return { size, sqft: { half: sqftData.half, threequarter: sqftData.threequarter, full: sqftData.full }, roof: sqftData.roof }
  }

  function handleMakeSelect(make: string) {
    setMakeOpen(false)
    setMakeFilter('')
    setVehicleSpec(null)
    setSelectedPanels([])
    onChange({ make, model: '', vData: undefined, sqft: 0, roofSqft: 0 })
  }

  function handleModelSelect(model: string, variant?: string) {
    setModelOpen(false)

    // Try panel database first
    const spec = findVehicleSpec(selectedMake, model, variant, selectedYear || undefined)
    if (spec) {
      setVehicleSpec(spec)
      // Auto-select all panels (full wrap by default)
      const allIds = spec.panels.map(p => p.id)
      setSelectedPanels(allIds)
      const totalSqft = spec.totalSqft
      const displayModel = variant ? `${model} (${variant})` : model
      // Build legacy-compatible vData
      const vData: VehicleData = {
        size: totalSqft > 300 ? 'xxlarge' : totalSqft > 250 ? 'xlarge' : totalSqft > 200 ? 'large' : totalSqft > 160 ? 'medium' : 'small',
        sqft: { half: Math.round(totalSqft * 0.4), threequarter: Math.round(totalSqft * 0.7), full: totalSqft },
        roof: spec.panels.find(p => p.id === 'roof')?.sqft || 0,
      }
      onChange({
        model: displayModel, vData, sqft: totalSqft,
        roofSqft: vData.roof || 0, coverage: 'full',
        name: `${selectedMake} ${displayModel} Full Wrap`,
      })
      return
    }

    // Fallback to legacy
    const entry = findLegacyVehicle(selectedMake, model, selectedYear || undefined)
    if (entry) {
      const vData = buildVehicleData(entry)
      const coverage = item.coverage || 'full'
      onChange({
        model, vData, sqft: vData.sqft[coverage], roofSqft: vData.roof || 0,
        name: item.name || `${selectedMake} ${model} ${COVERAGE_LABELS[coverage]}`,
      })
    } else {
      onChange({ model })
    }
  }

  function togglePanel(panelId: string) {
    const next = selectedPanels.includes(panelId)
      ? selectedPanels.filter(id => id !== panelId)
      : [...selectedPanels, panelId]
    setSelectedPanels(next)
    // Update sqft on the line item
    if (vehicleSpec) {
      const sqft = calcSelectedSqft(vehicleSpec.panels, next)
      onChange({ sqft })
    }
  }

  function applyTier(tier: WrapTier) {
    if (!vehicleSpec) return
    const ids = getTierPanelIds(tier, vehicleSpec.panels)
    setSelectedPanels(ids)
    const sqft = calcSelectedSqft(vehicleSpec.panels, ids)
    const displayModel = vehicleSpec.variant ? `${vehicleSpec.model} (${vehicleSpec.variant})` : vehicleSpec.model
    onChange({
      sqft,
      name: `${selectedMake} ${displayModel} ${tier.label}`,
    })
  }

  function handleCoverageSelect(c: Coverage) {
    // Only for legacy mode (no panel spec)
    const newSqft = item.vData ? item.vData.sqft[c] : item.sqft
    onChange({
      coverage: c, sqft: newSqft,
      name: selectedMake && selectedModel
        ? `${selectedMake} ${selectedModel} ${COVERAGE_LABELS[c]}`
        : item.name,
    })
  }

  // ─── Tier calculations ──────────────────────────────────────────────────────
  const tierData = useMemo(() => {
    if (!vehicleSpec) return []
    return WRAP_TIERS.map(tier => {
      const ids = getTierPanelIds(tier, vehicleSpec.panels)
      const sqft = calcSelectedSqft(vehicleSpec.panels, ids)
      const withWaste = calcWithWaste(sqft, wasteBuffer)
      const matCost = withWaste * item.matRate
      const estHours = tier.id === 'best' ? vehicleSpec.installHours : tier.id === 'better' ? Math.round(vehicleSpec.installHours * 0.65) : Math.round(vehicleSpec.installHours * 0.35)
      return { ...tier, panelIds: ids, sqft, withWaste, matCost, estHours }
    })
  }, [vehicleSpec, wasteBuffer, item.matRate])

  const isActive = (id: string) => selectedPanels.includes(id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ─── Year / Make / Model ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 8 }}>
        <div>
          <label style={lbl}>Year</label>
          <select value={item.year || ''} onChange={e => onChange({ year: e.target.value })} style={selStyle}>
            <option value="">Any</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div ref={makeRef} style={{ position: 'relative' }}>
          <label style={lbl}>Make</label>
          <div onClick={() => setMakeOpen(!makeOpen)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: selectedMake ? 'var(--text1)' : 'var(--text3)' }}>{selectedMake || 'Select make...'}</span>
            <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          </div>
          {makeOpen && (
            <div style={dropdownStyle}>
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                <input type="text" placeholder="Search..." value={makeFilter} onChange={e => setMakeFilter(e.target.value)} autoFocus style={{ ...inputStyle, padding: '6px 8px', fontSize: 12 }} />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filteredMakes.map(m => (
                  <div key={m} onClick={() => handleMakeSelect(m)} style={optStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{m}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={modelRef} style={{ position: 'relative' }}>
          <label style={lbl}>Model</label>
          <div onClick={() => selectedMake && setModelOpen(!modelOpen)} style={{ ...inputStyle, cursor: selectedMake ? 'pointer' : 'not-allowed', opacity: selectedMake ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: selectedModel ? 'var(--text1)' : 'var(--text3)' }}>{selectedModel || 'Select model...'}</span>
            <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          </div>
          {modelOpen && (
            <div style={dropdownStyle}>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {models.map(m => (
                  <div key={m.label} onClick={() => handleModelSelect(m.model, m.variant)} style={optStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{m.label}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Panel Breakdown (when vehicle spec found) ─────────────────────── */}
      {vehicleSpec && (
        <>
          {/* Wrap Level Tiers — 3 cards */}
          <div>
            <label style={lbl}>Wrap Level</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {tierData.map(tier => {
                const tierIds = tier.panelIds
                const isCurrent = selectedPanels.length === tierIds.length &&
                  tierIds.every(id => selectedPanels.includes(id))
                const colors = tier.id === 'good' ? { accent: 'var(--amber)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' }
                  : tier.id === 'better' ? { accent: 'var(--cyan)', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.3)' }
                  : { accent: 'var(--green)', bg: 'rgba(34,192,122,0.08)', border: 'rgba(34,192,122,0.3)' }
                return (
                  <button
                    key={tier.id}
                    onClick={() => applyTier(tier)}
                    style={{
                      padding: 12, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: isCurrent ? `2px solid ${colors.accent}` : '1px solid var(--border)',
                      background: isCurrent ? colors.bg : 'var(--surface2)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Award size={14} style={{ color: colors.accent }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: colors.accent, fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {tier.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 8 }}>{tier.description}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: 'var(--text3)' }}>Sqft</span>
                        <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{tier.sqft}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: 'var(--text3)' }}>Material</span>
                        <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>${tier.matCost.toFixed(0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: 'var(--text3)' }}>Install</span>
                        <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{tier.estHours}h</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: 'var(--text3)' }}>Panels</span>
                        <span style={{ color: 'var(--text2)', fontFamily: "'JetBrains Mono', monospace" }}>{tierIds.length}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel Toggle Chips */}
          <div>
            <label style={lbl}>Panel Breakdown ({selectedPanels.length}/{vehicleSpec.panels.length} selected)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {vehicleSpec.panels.map(panel => {
                const active = isActive(panel.id)
                return (
                  <button
                    key={panel.id}
                    onClick={() => togglePanel(panel.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                      border: active ? '2px solid var(--cyan)' : '1px solid var(--border)',
                      background: active ? 'rgba(34,211,238,0.12)' : 'var(--surface2)',
                      color: active ? 'var(--cyan)' : 'var(--text2)',
                      fontSize: 11, fontWeight: 600, transition: 'all 100ms ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{panel.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, opacity: 0.7 }}>
                      {panel.sqft}ft
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Waste Buffer Selector */}
          <div>
            <label style={lbl}>Waste Buffer</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {WASTE_BUFFER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWasteBuffer(opt.value)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer',
                    border: wasteBuffer === opt.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: wasteBuffer === opt.value ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                    color: wasteBuffer === opt.value ? 'var(--accent)' : 'var(--text2)',
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: 'uppercase',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Math Summary */}
          <div style={{
            padding: 12, borderRadius: 10,
            background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.15)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={mathRow}>
                <Ruler size={12} style={{ color: 'var(--cyan)' }} />
                <span style={mathLabel}>Selected Sqft</span>
                <span style={mathValue}>{selectedSqft}</span>
              </div>
              <div style={mathRow}>
                <span style={{ ...mathLabel, paddingLeft: 16 }}>+ Waste ({wasteBuffer}%)</span>
                <span style={mathValue}>{totalWithWaste}</span>
              </div>
              <div style={mathRow}>
                <Ruler size={12} style={{ color: 'var(--accent)' }} />
                <span style={mathLabel}>Linear Feet</span>
                <span style={mathValue}>{linearFeet} LF</span>
              </div>
              <div style={mathRow}>
                <DollarSign size={12} style={{ color: 'var(--green)' }} />
                <span style={mathLabel}>Material @ ${item.matRate.toFixed(2)}/sqft</span>
                <span style={{ ...mathValue, color: 'var(--green)' }}>${matCostEstimate.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Legacy Coverage Mode (no panel spec found) ────────────────────── */}
      {!vehicleSpec && item.vData && (
        <>
          <div>
            <label style={lbl}>Coverage</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COVERAGES.map(c => (
                <button key={c} onClick={() => handleCoverageSelect(c)} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, minHeight: 44,
                  border: item.coverage === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: item.coverage === c ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                  color: item.coverage === c ? 'var(--accent)' : 'var(--text2)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>{COVERAGE_LABELS[c]}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Sqft input (always visible, for manual override) ──────────────── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Total Sqft</label>
          <input
            type="number"
            value={item.sqft || ''}
            onChange={e => onChange({ sqft: parseFloat(e.target.value) || 0 })}
            style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
            placeholder="Auto-calculated"
          />
        </div>
      </div>

      {/* Vehicle info badge */}
      {item.vData && !vehicleSpec && (
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

const mathRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
}

const mathLabel: React.CSSProperties = {
  color: 'var(--text3)', fontWeight: 600, flex: 1,
}

const mathValue: React.CSSProperties = {
  color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700, fontSize: 12,
}
