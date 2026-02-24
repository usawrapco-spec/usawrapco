'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, Square, Layers, ChevronDown } from 'lucide-react'
import panelData from '@/lib/data/panel-dimensions.json'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Panel {
  id: string
  label: string
  width: number
  height: number
  sqft: number
}

interface VehicleTypeData {
  label: string
  panels: Panel[]
  full_wrap_sqft: number
}

interface PanelSelectorProps {
  vehicleType: string
  onPanelsChange: (selectedPanels: Panel[], totalSqft: number) => void
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PANEL_DB = panelData as Record<string, VehicleTypeData>
const VEHICLE_TYPE_KEYS = Object.keys(PANEL_DB)
const WASTE_OPTIONS = [5, 10, 15, 20]

// ─── Styles ──────────────────────────────────────────────────────────────────

const monoFont = "'JetBrains Mono', monospace"
const headingFont = "'Barlow Condensed', sans-serif"

// ─── Component ───────────────────────────────────────────────────────────────

export default function PanelSelector({ vehicleType, onPanelsChange }: PanelSelectorProps) {
  const [activeType, setActiveType] = useState(
    PANEL_DB[vehicleType] ? vehicleType : VEHICLE_TYPE_KEYS[0]
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [wastePercent, setWastePercent] = useState(10)
  const [typeOpen, setTypeOpen] = useState(false)

  const vehicleData = PANEL_DB[activeType]
  const panels = vehicleData?.panels || []

  // Compute totals
  const { netSqft, wasteSqft, totalSqft, selectedPanels } = useMemo(() => {
    const sel = panels.filter(p => selectedIds.has(p.id))
    const net = sel.reduce((sum, p) => sum + p.sqft, 0)
    const waste = net * (wastePercent / 100)
    return {
      netSqft: Math.round(net * 10) / 10,
      wasteSqft: Math.round(waste * 10) / 10,
      totalSqft: Math.round((net + waste) * 10) / 10,
      selectedPanels: sel,
    }
  }, [panels, selectedIds, wastePercent])

  function togglePanel(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      // Compute and fire callback
      const sel = panels.filter(p => next.has(p.id))
      const net = sel.reduce((sum, p) => sum + p.sqft, 0)
      const total = Math.round((net + net * (wastePercent / 100)) * 10) / 10
      onPanelsChange(sel, total)
      return next
    })
  }

  function selectAll() {
    const all = new Set(panels.map(p => p.id))
    setSelectedIds(all)
    const net = panels.reduce((sum, p) => sum + p.sqft, 0)
    const total = Math.round((net + net * (wastePercent / 100)) * 10) / 10
    onPanelsChange(panels, total)
  }

  function clearAll() {
    setSelectedIds(new Set())
    onPanelsChange([], 0)
  }

  function handleWasteChange(pct: number) {
    setWastePercent(pct)
    const sel = panels.filter(p => selectedIds.has(p.id))
    const net = sel.reduce((sum, p) => sum + p.sqft, 0)
    const total = Math.round((net + net * (pct / 100)) * 10) / 10
    onPanelsChange(sel, total)
  }

  function handleTypeChange(key: string) {
    setActiveType(key)
    setSelectedIds(new Set())
    setTypeOpen(false)
    onPanelsChange([], 0)
  }

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, color: 'var(--cyan)',
          fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <Layers size={13} /> Panel Selector
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={selectAll} style={{
            padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700,
            border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.06)',
            color: 'var(--cyan)', cursor: 'pointer',
          }}>
            Select All
          </button>
          <button onClick={clearAll} style={{
            padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text3)', cursor: 'pointer',
          }}>
            Clear All
          </button>
        </div>
      </div>

      {/* ── Vehicle Type Dropdown ──────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <label style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.06em', fontFamily: headingFont, marginBottom: 4, display: 'block',
        }}>
          Vehicle Type
        </label>
        <button
          onClick={() => setTypeOpen(!typeOpen)}
          style={{
            width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)',
            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            textAlign: 'left',
          }}
        >
          <span>{vehicleData?.label || activeType}</span>
          <ChevronDown size={12} style={{ color: 'var(--text3)' }} />
        </button>
        {typeOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, marginTop: 2, maxHeight: 200, overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {VEHICLE_TYPE_KEYS.map(key => (
              <div
                key={key}
                style={{
                  padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  color: key === activeType ? 'var(--cyan)' : 'var(--text1)',
                  fontWeight: key === activeType ? 700 : 400,
                  display: 'flex', justifyContent: 'space-between',
                }}
                onMouseDown={() => handleTypeChange(key)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span>{PANEL_DB[key].label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: monoFont }}>
                  {PANEL_DB[key].full_wrap_sqft} sqft
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel Cards Grid ──────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 8, marginBottom: 12,
      }}>
        {panels.map(panel => {
          const isSelected = selectedIds.has(panel.id)
          return (
            <button
              key={panel.id}
              onClick={() => togglePanel(panel.id)}
              style={{
                background: isSelected ? 'rgba(34,211,238,0.1)' : 'var(--surface2)',
                border: `1.5px solid ${isSelected ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                {isSelected
                  ? <CheckCircle2 size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                  : <Square size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                }
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isSelected ? 'var(--text1)' : 'var(--text2)',
                  textAlign: 'left',
                }}>
                  {panel.label}
                </span>
              </div>
              <span style={{
                fontSize: 11, fontFamily: monoFont, fontWeight: 700,
                color: isSelected ? 'var(--cyan)' : 'var(--text3)',
              }}>
                {panel.sqft} sqft
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Waste Buffer ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <label style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.06em', fontFamily: headingFont, marginBottom: 4, display: 'block',
        }}>
          Waste Buffer
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {WASTE_OPTIONS.map(pct => (
            <button
              key={pct}
              onClick={() => handleWasteChange(pct)}
              style={{
                padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                fontFamily: monoFont, cursor: 'pointer',
                border: `1px solid ${pct === wastePercent ? 'var(--cyan)' : 'var(--border)'}`,
                background: pct === wastePercent ? 'rgba(34,211,238,0.1)' : 'transparent',
                color: pct === wastePercent ? 'var(--cyan)' : 'var(--text3)',
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Totals ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 12px',
        background: 'var(--surface2)', borderRadius: 8, alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Net Sqft
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', fontFamily: monoFont }}>
            {netSqft}
          </span>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: 14 }}>+</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Waste ({wastePercent}%)
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--amber)', fontFamily: monoFont }}>
            {wasteSqft}
          </span>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: 14 }}>=</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total to Order
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--cyan)', fontFamily: monoFont }}>
            {totalSqft} sqft
          </span>
        </div>
        {selectedPanels.length > 0 && (
          <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
            {selectedPanels.length} of {panels.length} panels
          </div>
        )}
      </div>
    </div>
  )
}
