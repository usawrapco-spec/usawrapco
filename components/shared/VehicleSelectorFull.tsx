'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'

export interface VehicleMeasurements {
  id: string
  make: string
  model: string
  year_range: string
  year_start: number
  year_end: number
  driver_side_sqft: number | null
  passenger_side_sqft: number | null
  both_sides_sqft: number | null
  rear_sqft: number | null
  hood_sqft: number | null
  roof_sqft: number | null
  total_sqft: number | null
  side_width_in: number | null
  side_height_in: number | null
  rear_width_in: number | null
  rear_height_in: number | null
  hood_width_in: number | null
  hood_length_in: number | null
  roof_width_in: number | null
  roof_length_in: number | null
}

export interface VehiclePanelSelection {
  driverSide: boolean
  passengerSide: boolean
  rear: boolean
  hood: boolean
  roof: boolean
}

interface Props {
  onVehicleSelect: (vehicle: VehicleMeasurements | null) => void
  onSqftChange: (sqft: number, breakdown: Record<string, number>) => void
  selectedPanels?: VehiclePanelSelection
  onPanelToggle?: (panel: keyof VehiclePanelSelection) => void
  showPanelSelector?: boolean
  compact?: boolean
  initialMake?: string
  initialModel?: string
  initialYearRange?: string
}

const PANEL_CONFIG: Array<{ key: keyof VehiclePanelSelection; label: string; color: string }> = [
  { key: 'driverSide', label: 'Driver Side', color: '#4f7fff' },
  { key: 'passengerSide', label: 'Pass. Side', color: '#8b5cf6' },
  { key: 'rear', label: 'Rear', color: '#f59e0b' },
  { key: 'hood', label: 'Hood', color: '#22c07a' },
  { key: 'roof', label: 'Roof', color: '#ec4899' },
]

function getPanelSqft(v: VehicleMeasurements, key: keyof VehiclePanelSelection): number | null {
  if (key === 'driverSide') return v.driver_side_sqft
  if (key === 'passengerSide') return v.passenger_side_sqft
  if (key === 'rear') return v.rear_sqft
  if (key === 'hood') return v.hood_sqft
  return v.roof_sqft
}

function computeSqft(
  vehicle: VehicleMeasurements,
  panels: VehiclePanelSelection
): { total: number; breakdown: Record<string, number> } {
  let total = 0
  const breakdown: Record<string, number> = {}
  for (const p of PANEL_CONFIG) {
    const sqft = getPanelSqft(vehicle, p.key)
    if (panels[p.key] && sqft) { breakdown[p.key] = sqft; total += sqft }
  }
  return { total: Math.round(total * 10) / 10, breakdown }
}

export default function VehicleSelectorFull({
  onVehicleSelect,
  onSqftChange,
  selectedPanels,
  onPanelToggle,
  showPanelSelector = true,
  compact = false,
  initialMake,
  initialModel,
  initialYearRange,
}: Props) {
  const supabase = createClient()
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [yearRanges, setYearRanges] = useState<string[]>([])
  const [selectedMake, setSelectedMake] = useState(initialMake || '')
  const [selectedModel, setSelectedModel] = useState(initialModel || '')
  const [selectedYearRange, setSelectedYearRange] = useState(initialYearRange || '')
  const [vehicle, setVehicle] = useState<VehicleMeasurements | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VehicleMeasurements[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [localPanels, setLocalPanels] = useState<VehiclePanelSelection>({
    driverSide: true, passengerSide: true, rear: true, hood: true, roof: true,
  })
  const [loading, setLoading] = useState(false)

  const activePanels = selectedPanels || localPanels

  useEffect(() => {
    supabase.from('vehicle_measurements').select('make').order('make')
      .then(({ data }) => {
        if (data) setMakes([...new Set(data.map((d: { make: string }) => d.make))].sort())
      })
  }, [])

  useEffect(() => {
    if (!selectedMake) { setModels([]); return }
    supabase.from('vehicle_measurements').select('model').eq('make', selectedMake).order('model')
      .then(({ data }) => {
        if (data) {
          setModels([...new Set(data.map((d: { model: string }) => d.model))].sort())
          if (!initialModel) {
            setSelectedModel(''); setSelectedYearRange(''); setVehicle(null); onVehicleSelect(null)
          }
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMake])

  useEffect(() => {
    if (!selectedMake || !selectedModel) { setYearRanges([]); return }
    supabase.from('vehicle_measurements').select('year_range, year_start')
      .eq('make', selectedMake).eq('model', selectedModel).order('year_start')
      .then(({ data }) => {
        if (data) {
          const ranges = data.map((d: { year_range: string }) => d.year_range)
          setYearRanges(ranges)
          if (ranges.length === 1) setSelectedYearRange(ranges[0])
          else if (!initialYearRange) setSelectedYearRange('')
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMake, selectedModel])

  useEffect(() => {
    if (!selectedMake || !selectedModel || !selectedYearRange) return
    setLoading(true)
    supabase.from('vehicle_measurements').select('*')
      .eq('make', selectedMake).eq('model', selectedModel).eq('year_range', selectedYearRange)
      .single()
      .then(({ data }) => {
        setLoading(false)
        if (data) { setVehicle(data as VehicleMeasurements); onVehicleSelect(data as VehicleMeasurements) }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMake, selectedModel, selectedYearRange])

  useEffect(() => {
    if (!vehicle) return
    const { total, breakdown } = computeSqft(vehicle, activePanels)
    onSqftChange(total, breakdown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, activePanels])

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    const { data } = await supabase.from('vehicle_measurements').select('*')
      .or(`make.ilike.%${q}%,model.ilike.%${q}%`).order('make').limit(20)
    if (data) setSearchResults(data as VehicleMeasurements[])
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, handleSearch])

  const selectFromSearch = (v: VehicleMeasurements) => {
    setVehicle(v); onVehicleSelect(v)
    setSelectedMake(v.make); setSelectedModel(v.model); setSelectedYearRange(v.year_range)
    setSearchQuery(''); setSearchResults([]); setShowSearch(false)
    const { total, breakdown } = computeSqft(v, activePanels)
    onSqftChange(total, breakdown)
  }

  const togglePanel = (panel: keyof VehiclePanelSelection) => {
    if (onPanelToggle) onPanelToggle(panel)
    else setLocalPanels(prev => ({ ...prev, [panel]: !prev[panel] }))
  }

  const totalSqft = vehicle ? computeSqft(vehicle, activePanels).total : 0

  const sel: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 6, fontSize: 14,
    background: 'var(--bg)', border: '1px solid var(--surface2)',
    color: 'var(--text1)', width: '100%',
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setShowSearch(false)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            background: !showSearch ? 'var(--accent)' : 'var(--surface2)',
            color: 'var(--text1)', border: 'none',
          }}
        >
          Browse Make/Model
        </button>
        <button
          onClick={() => setShowSearch(true)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            background: showSearch ? 'var(--accent)' : 'var(--surface2)',
            color: 'var(--text1)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Search size={13} /> Quick Search
        </button>
      </div>

      {/* Quick search */}
      {showSearch && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search make or model (e.g. 'F-150', 'Sprinter')..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...sel, boxSizing: 'border-box' }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
              background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 6,
              maxHeight: 280, overflowY: 'auto',
            }}>
              {searchResults.map(v => (
                <button
                  key={v.id}
                  onClick={() => selectFromSearch(v)}
                  style={{
                    width: '100%', padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                    background: 'transparent', border: 'none', color: 'var(--text1)',
                    borderBottom: '1px solid var(--surface2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                  }}
                >
                  <span>{v.make} {v.model} ({v.year_range})</span>
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>{v.total_sqft} sq ft</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cascading dropdowns */}
      {!showSearch && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr 1fr 1fr' : '1fr',
          gap: 8, marginBottom: 12,
        }}>
          <select value={selectedMake} onChange={e => setSelectedMake(e.target.value)} style={sel}>
            <option value="">Select Make...</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            disabled={!selectedMake}
            style={{ ...sel, opacity: selectedMake ? 1 : 0.5, cursor: selectedMake ? 'pointer' : 'not-allowed' }}
          >
            <option value="">Select Model...</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedYearRange}
            onChange={e => setSelectedYearRange(e.target.value)}
            disabled={!selectedModel}
            style={{ ...sel, opacity: selectedModel ? 1 : 0.5, cursor: selectedModel ? 'pointer' : 'not-allowed' }}
          >
            <option value="">Select Year Range...</option>
            {yearRanges.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {loading && (
        <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 8 }}>
          Loading...
        </div>
      )}

      {/* Vehicle card */}
      {vehicle && (
        <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid #1e3a5f', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 15 }}>
                {vehicle.year_range} {vehicle.make} {vehicle.model}
              </div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>
                Full wrap = {vehicle.total_sqft} sq ft
              </div>
            </div>
            <div style={{ background: '#1e3a5f', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ color: 'var(--accent)', fontSize: 22, fontWeight: 700 }}>{totalSqft}</div>
              <div style={{ color: 'var(--text3)', fontSize: 10 }}>SELECTED SQ FT</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {PANEL_CONFIG.map(p => {
              const sqft = getPanelSqft(vehicle, p.key)
              const active = activePanels[p.key]
              return (
                <div
                  key={p.key}
                  onClick={() => showPanelSelector && togglePanel(p.key)}
                  style={{
                    padding: '8px 6px', borderRadius: 6, textAlign: 'center',
                    background: active ? `${p.color}22` : 'var(--surface)',
                    border: `1px solid ${active ? p.color : 'var(--surface2)'}`,
                    cursor: showPanelSelector ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 10, color: active ? p.color : 'var(--text3)', fontWeight: 600, marginBottom: 2 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? 'var(--text1)' : 'var(--text3)' }}>
                    {sqft ?? '—'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>sq ft</div>
                </div>
              )
            })}
          </div>

          {!compact && (vehicle.side_width_in || vehicle.rear_width_in || vehicle.hood_width_in || vehicle.roof_width_in) && (
            <div style={{
              marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--surface2)',
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4,
            }}>
              {vehicle.side_width_in && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Side: {vehicle.side_width_in}" x {vehicle.side_height_in}"</div>
              )}
              {vehicle.rear_width_in && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Rear: {vehicle.rear_width_in}" x {vehicle.rear_height_in}"</div>
              )}
              {vehicle.hood_width_in && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Hood: {vehicle.hood_width_in}" x {vehicle.hood_length_in}"</div>
              )}
              {vehicle.roof_width_in && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Roof: {vehicle.roof_width_in}" x {vehicle.roof_length_in}"</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
