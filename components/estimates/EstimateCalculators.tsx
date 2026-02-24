'use client'

import { useState, useMemo } from 'react'
import { Car, Truck, Ship, Shield, Users, Anchor, Calculator, Plus, X, ChevronRight, Layers } from 'lucide-react'

// ─── Fonts ──────────────────────────────────────────────────────────────────────
const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// ─── Props ──────────────────────────────────────────────────────────────────────

interface LineItem {
  name: string
  description: string
  product_type: string
  quantity: number
  unit_price: number
  total_price: number
  specs: Record<string, any>
}

interface EstimateCalculatorsProps {
  onAddLineItems: (items: LineItem[]) => void
  onClose: () => void
}

// ─── Shared Styles ──────────────────────────────────────────────────────────────

const label: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont,
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border, #2a2d3a)',
  borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text1)', outline: 'none',
}

const sel: React.CSSProperties = {
  ...inp,
  appearance: 'none' as const, WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299b5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28,
}

const mono: React.CSSProperties = { fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }

const addBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', padding: '12px 20px', borderRadius: 10, fontWeight: 800, fontSize: 14,
  cursor: 'pointer', background: 'var(--green)', border: 'none', color: '#fff',
  fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em',
}

const checkboxOuter = (checked: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
  borderRadius: 8, cursor: 'pointer', userSelect: 'none',
  border: checked ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
  background: checked ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
  transition: 'all 0.15s ease',
})

const checkboxBox = (checked: boolean): React.CSSProperties => ({
  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
  border: checked ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
  background: checked ? 'var(--accent)' : 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtNumber(n: number, d = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'vehicle', label: 'Vehicle Wrap', icon: Car },
  { id: 'boxtruck', label: 'Box Truck', icon: Truck },
  { id: 'trailer', label: 'Trailer', icon: Layers },
  { id: 'marine', label: 'Marine', icon: Ship },
  { id: 'ppf', label: 'PPF', icon: Shield },
  { id: 'fleet', label: 'Fleet', icon: Users },
  { id: 'decking', label: 'Decking', icon: Anchor },
] as const

type TabId = typeof TABS[number]['id']

// ── Vehicle Wrap Constants ──────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan', basePrice: 2400, sqft: 200, laborHrs: 16 },
  { value: 'mid-suv', label: 'Mid-SUV', basePrice: 2800, sqft: 240, laborHrs: 20 },
  { value: 'full-suv', label: 'Full-SUV', basePrice: 3200, sqft: 280, laborHrs: 20 },
  { value: 'truck', label: 'Truck', basePrice: 3000, sqft: 260, laborHrs: 18 },
  { value: 'van', label: 'Van', basePrice: 3500, sqft: 320, laborHrs: 24 },
]

const COVERAGE_OPTIONS = [
  { value: 'partial', label: 'Partial', multiplier: 0.5 },
  { value: '3/4', label: '3/4', multiplier: 0.75 },
  { value: 'full', label: 'Full', multiplier: 1 },
]

const MATERIALS = [
  { value: '3m-1080', label: '3M 1080', rate: 7 },
  { value: 'avery', label: 'Avery Dennison', rate: 6.5 },
  { value: 'oracal', label: 'Oracal', rate: 5.5 },
  { value: 'premium-cast', label: 'Premium Cast', rate: 8 },
  { value: 'budget', label: 'Budget', rate: 4 },
]

const FINISHES = ['Gloss', 'Matte', 'Satin', 'Brushed', 'Carbon Fiber']

// ── PPF Constants ───────────────────────────────────────────────────────────────

const PPF_ZONES = [
  { id: 'front-bumper', label: 'Front Bumper', price: 450 },
  { id: 'hood', label: 'Hood', price: 650 },
  { id: 'fenders', label: 'Fenders (pair)', price: 400 },
  { id: 'mirrors', label: 'Mirrors (pair)', price: 200 },
  { id: 'rocker-panels', label: 'Rocker Panels (pair)', price: 350 },
  { id: 'a-pillars', label: 'A-Pillars (pair)', price: 200 },
  { id: 'headlights', label: 'Headlights (pair)', price: 250 },
  { id: 'door-cups', label: 'Door Cups', price: 150 },
  { id: 'door-edges', label: 'Door Edges', price: 200 },
  { id: 'full-front', label: 'Full Front', price: 1800 },
  { id: 'full-body', label: 'Full Body', price: 5500 },
]

const PPF_TYPES = [
  { value: 'standard', label: 'Standard', multiplier: 1 },
  { value: 'self-healing', label: 'Self-Healing', multiplier: 1.3 },
  { value: 'stealth', label: 'Stealth/Matte', multiplier: 1.5 },
]

// ── Marine Constants ────────────────────────────────────────────────────────────

const BOAT_TYPES = [
  { value: 'pontoon', label: 'Pontoon', multiplier: 0.7 },
  { value: 'bass', label: 'Bass Boat', multiplier: 0.8 },
  { value: 'ski-wake', label: 'Ski/Wake', multiplier: 1.0 },
  { value: 'center-console', label: 'Center Console', multiplier: 0.9 },
  { value: 'yacht', label: 'Yacht', multiplier: 1.5 },
]

const MARINE_COVERAGE = [
  { value: 'hull-only', label: 'Hull Only', multiplier: 0.4 },
  { value: 'hull-sides', label: 'Hull + Sides', multiplier: 0.7 },
  { value: 'full', label: 'Full', multiplier: 1.0 },
]

// ── Trailer Constants ───────────────────────────────────────────────────────────

const TRAILER_TYPES = [
  { value: 'enclosed', label: 'Enclosed', multiplier: 1.0 },
  { value: 'flatbed', label: 'Flatbed', multiplier: 0.6 },
  { value: 'horse', label: 'Horse', multiplier: 0.8 },
  { value: 'refrigerated', label: 'Refrigerated', multiplier: 1.1 },
]

// ── Decking Constants ───────────────────────────────────────────────────────────

const DECK_MATERIALS = [
  { value: 'seadek', label: 'SeaDek', rate: 18 },
  { value: '3m-marine', label: '3M Marine', rate: 14 },
  { value: 'custom-eva', label: 'Custom EVA', rate: 12 },
]

// ─── Summary Row ────────────────────────────────────────────────────────────────

function SummaryRow({ label: rowLabel, value, color = 'var(--text1)', large }: {
  label: string; value: string; color?: string; large?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: large ? 13 : 12, fontWeight: large ? 800 : 600, color: 'var(--text2)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {rowLabel}
      </span>
      <span style={{ ...mono, fontSize: large ? 18 : 14, fontWeight: large ? 800 : 700, color }}>
        {value}
      </span>
    </div>
  )
}

// ─── Live Preview Panel ─────────────────────────────────────────────────────────

function PreviewPanel({ rows, total, onAdd }: {
  rows: Array<{ label: string; value: string; color?: string }>
  total: { label: string; value: string }
  onAdd: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border, #2a2d3a)', borderRadius: 10,
        borderLeft: '3px solid var(--green)', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 4 }}>
          Live Preview
        </span>
        {rows.map((row, i) => (
          <SummaryRow key={i} label={row.label} value={row.value} color={row.color} />
        ))}
        <div style={{ borderTop: '2px solid var(--border, #2a2d3a)', margin: '4px 0' }} />
        <SummaryRow label={total.label} value={total.value} color="var(--green)" large />
      </div>
      <button onClick={onAdd} style={addBtn}>
        <Plus size={16} /> Add to Estimate
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. VEHICLE WRAP CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function VehicleWrapCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [vehicleType, setVehicleType] = useState('sedan')
  const [coverage, setCoverage] = useState('full')
  const [material, setMaterial] = useState('3m-1080')
  const [finish, setFinish] = useState('Gloss')

  const vehicle = VEHICLE_TYPES.find(v => v.value === vehicleType)!
  const coverageOpt = COVERAGE_OPTIONS.find(c => c.value === coverage)!
  const materialOpt = MATERIALS.find(m => m.value === material)!

  const estimatedSqft = Math.round(vehicle.sqft * coverageOpt.multiplier)
  const materialCost = estimatedSqft * materialOpt.rate
  const laborHrs = Math.round(vehicle.laborHrs * coverageOpt.multiplier)
  const laborCost = laborHrs * 45
  const totalPrice = materialCost + laborCost

  const handleAdd = () => {
    onAdd([{
      name: `${coverageOpt.label} Vehicle Wrap - ${vehicle.label}`,
      description: `${materialOpt.label} ${finish} wrap, ${coverageOpt.label.toLowerCase()} coverage. Est. ${estimatedSqft} sqft, ${laborHrs} hrs labor.`,
      product_type: 'vehicle_wrap',
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      specs: {
        vehicleType: vehicle.value,
        coverage: coverageOpt.value,
        material: materialOpt.value,
        finish,
        estimatedSqft,
        materialCost,
        laborHrs,
        laborCost,
        laborRate: 45,
        materialRate: materialOpt.rate,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <span style={label}>Vehicle Type</span>
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={sel}>
            {VEHICLE_TYPES.map(v => (
              <option key={v.value} value={v.value}>{v.label} (base {fmtCurrency(v.basePrice)})</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Coverage</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {COVERAGE_OPTIONS.map(c => (
              <button key={c.value} onClick={() => setCoverage(c.value)} style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: coverage === c.value ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
                background: coverage === c.value ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                color: coverage === c.value ? 'var(--accent)' : 'var(--text2)',
              }}>
                {c.label} ({Math.round(c.multiplier * 100)}%)
              </button>
            ))}
          </div>
        </div>
        <div>
          <span style={label}>Material</span>
          <select value={material} onChange={e => setMaterial(e.target.value)} style={sel}>
            {MATERIALS.map(m => (
              <option key={m.value} value={m.value}>{m.label} ({fmtCurrency(m.rate)}/sqft)</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Finish</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FINISHES.map(f => (
              <button key={f} onClick={() => setFinish(f)} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: finish === f ? '2px solid var(--cyan)' : '1px solid var(--border, #2a2d3a)',
                background: finish === f ? 'rgba(34,211,238,0.08)' : 'var(--surface)',
                color: finish === f ? 'var(--cyan)' : 'var(--text3)',
              }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <PreviewPanel
        rows={[
          { label: 'Estimated Sqft', value: `${fmtNumber(estimatedSqft)} sqft`, color: 'var(--cyan)' },
          { label: 'Material Cost', value: fmtCurrency(materialCost) },
          { label: `Labor (${laborHrs} hrs @ $45/hr)`, value: fmtCurrency(laborCost) },
        ]}
        total={{ label: 'Total Price', value: fmtCurrency(totalPrice) }}
        onAdd={handleAdd}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BOX TRUCK CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function BoxTruckCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [length, setLength] = useState(16)
  const [height, setHeight] = useState(8)
  const [sides, setSides] = useState<'both' | 'driver' | 'passenger'>('both')
  const [rearDoors, setRearDoors] = useState(true)
  const [cab, setCab] = useState(false)

  const sideCount = sides === 'both' ? 2 : 1
  const sideSqft = length * height * sideCount
  const rearSqft = rearDoors ? 8 * height : 0
  const cabSqft = cab ? 40 : 0
  const totalSqft = sideSqft + rearSqft + cabSqft

  const materialRate = 6
  const installRate = 3
  const materialCost = totalSqft * materialRate
  const installCost = totalSqft * installRate
  const totalPrice = materialCost + installCost

  const handleAdd = () => {
    const sideLabel = sides === 'both' ? 'Both Sides' : sides === 'driver' ? 'Driver Side' : 'Passenger Side'
    const parts = [sideLabel]
    if (rearDoors) parts.push('Rear Doors')
    if (cab) parts.push('Cab')

    onAdd([{
      name: `Box Truck Wrap - ${length}ft`,
      description: `${parts.join(', ')}. ${totalSqft} sqft total. Print+laminate @ ${fmtCurrency(materialRate)}/sqft, install @ ${fmtCurrency(installRate)}/sqft.`,
      product_type: 'box_truck_wrap',
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      specs: {
        truckLength: length,
        truckHeight: height,
        sides,
        rearDoors,
        cab,
        sideSqft,
        rearSqft,
        cabSqft,
        totalSqft,
        materialRate,
        installRate,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={label}>Length (ft)</span>
            <input type="number" value={length} onChange={e => setLength(Math.max(10, Math.min(26, Number(e.target.value))))}
              style={{ ...inp, ...mono }} min={10} max={26} />
          </div>
          <div>
            <span style={label}>Height (ft)</span>
            <input type="number" value={height} onChange={e => setHeight(Math.max(6, Math.min(10, Number(e.target.value))))}
              style={{ ...inp, ...mono }} min={6} max={10} />
          </div>
        </div>
        <div>
          <span style={label}>Sides</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['both', 'Both Sides'], ['driver', 'Driver Only'], ['passenger', 'Passenger Only']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setSides(val)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: sides === val ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
                background: sides === val ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                color: sides === val ? 'var(--accent)' : 'var(--text2)',
              }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setRearDoors(!rearDoors)} style={{
            ...checkboxOuter(rearDoors), flex: 1,
          }}>
            <div style={checkboxBox(rearDoors)}>
              {rearDoors && <ChevronRight size={10} style={{ color: '#fff', transform: 'rotate(-45deg)' }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: rearDoors ? 'var(--text1)' : 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rear Doors</span>
          </button>
          <button onClick={() => setCab(!cab)} style={{
            ...checkboxOuter(cab), flex: 1,
          }}>
            <div style={checkboxBox(cab)}>
              {cab && <ChevronRight size={10} style={{ color: '#fff', transform: 'rotate(-45deg)' }} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: cab ? 'var(--text1)' : 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cab</span>
          </button>
        </div>
        {/* Sqft Breakdown */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont, marginBottom: 2 }}>Sqft Breakdown</span>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Sides ({sideCount}x {length}ft x {height}ft)</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text1)' }}>{sideSqft} sqft</span>
          </div>
          {rearDoors && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>Rear (8ft x {height}ft)</span>
              <span style={{ ...mono, fontSize: 12, color: 'var(--text1)' }}>{rearSqft} sqft</span>
            </div>
          )}
          {cab && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>Cab (flat)</span>
              <span style={{ ...mono, fontSize: 12, color: 'var(--text1)' }}>{cabSqft} sqft</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <PreviewPanel
        rows={[
          { label: 'Total Sqft', value: `${fmtNumber(totalSqft)} sqft`, color: 'var(--cyan)' },
          { label: `Material (${fmtCurrency(materialRate)}/sqft)`, value: fmtCurrency(materialCost) },
          { label: `Install (${fmtCurrency(installRate)}/sqft)`, value: fmtCurrency(installCost) },
        ]}
        total={{ label: 'Total Price', value: fmtCurrency(totalPrice) }}
        onAdd={handleAdd}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TRAILER CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function TrailerCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [length, setLength] = useState(20)
  const [height, setHeight] = useState(8)
  const [sides, setSides] = useState<'both' | 'driver' | 'passenger'>('both')
  const [rear, setRear] = useState(true)
  const [trailerType, setTrailerType] = useState('enclosed')

  const typeOpt = TRAILER_TYPES.find(t => t.value === trailerType)!
  const sideCount = sides === 'both' ? 2 : 1
  const sideSqft = length * height * sideCount
  const rearSqft = rear ? 8 * height : 0
  const rawSqft = sideSqft + rearSqft
  const totalSqft = Math.round(rawSqft * typeOpt.multiplier)

  const materialRate = 6
  const installRate = 3
  const materialCost = totalSqft * materialRate
  const installCost = totalSqft * installRate
  const totalPrice = materialCost + installCost

  const handleAdd = () => {
    const sideLabel = sides === 'both' ? 'Both Sides' : sides === 'driver' ? 'Driver Side' : 'Passenger Side'
    const parts = [sideLabel]
    if (rear) parts.push('Rear')

    onAdd([{
      name: `${typeOpt.label} Trailer Wrap - ${length}ft`,
      description: `${parts.join(', ')}. ${typeOpt.label} type (${typeOpt.multiplier}x). ${totalSqft} sqft total.`,
      product_type: 'trailer_wrap',
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      specs: {
        trailerLength: length,
        trailerHeight: height,
        sides,
        rear,
        trailerType: typeOpt.value,
        typeMultiplier: typeOpt.multiplier,
        rawSqft,
        totalSqft,
        materialRate,
        installRate,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={label}>Length (ft)</span>
            <input type="number" value={length} onChange={e => setLength(Number(e.target.value))}
              style={{ ...inp, ...mono }} min={8} max={53} />
          </div>
          <div>
            <span style={label}>Height (ft)</span>
            <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))}
              style={{ ...inp, ...mono }} min={4} max={14} />
          </div>
        </div>
        <div>
          <span style={label}>Trailer Type</span>
          <select value={trailerType} onChange={e => setTrailerType(e.target.value)} style={sel}>
            {TRAILER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label} ({t.multiplier}x)</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Sides</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['both', 'Both Sides'], ['driver', 'Driver Only'], ['passenger', 'Passenger Only']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setSides(val)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: sides === val ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
                background: sides === val ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                color: sides === val ? 'var(--accent)' : 'var(--text2)',
              }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setRear(!rear)} style={checkboxOuter(rear)}>
          <div style={checkboxBox(rear)}>
            {rear && <ChevronRight size={10} style={{ color: '#fff', transform: 'rotate(-45deg)' }} />}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: rear ? 'var(--text1)' : 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rear</span>
        </button>
        {typeOpt.multiplier !== 1 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px' }}>
            <span style={{ fontSize: 11, color: 'var(--amber)' }}>
              {typeOpt.label} type multiplier: {typeOpt.multiplier}x (raw {rawSqft} sqft adjusted to {totalSqft} sqft)
            </span>
          </div>
        )}
      </div>

      {/* Preview */}
      <PreviewPanel
        rows={[
          { label: 'Total Sqft', value: `${fmtNumber(totalSqft)} sqft`, color: 'var(--cyan)' },
          { label: `Material (${fmtCurrency(materialRate)}/sqft)`, value: fmtCurrency(materialCost) },
          { label: `Install (${fmtCurrency(installRate)}/sqft)`, value: fmtCurrency(installCost) },
        ]}
        total={{ label: 'Total Price', value: fmtCurrency(totalPrice) }}
        onAdd={handleAdd}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MARINE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function MarineCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [boatLength, setBoatLength] = useState(22)
  const [boatType, setBoatType] = useState('ski-wake')
  const [coverage, setCoverage] = useState('full')

  const typeOpt = BOAT_TYPES.find(t => t.value === boatType)!
  const coverageOpt = MARINE_COVERAGE.find(c => c.value === coverage)!

  const baseSqft = boatLength * 8
  const adjustedSqft = Math.round(baseSqft * typeOpt.multiplier * coverageOpt.multiplier)
  const ratePerSqft = 12
  const totalPrice = adjustedSqft * ratePerSqft

  const handleAdd = () => {
    onAdd([{
      name: `Marine Wrap - ${typeOpt.label} ${boatLength}ft`,
      description: `${coverageOpt.label} coverage. ${typeOpt.label} (${typeOpt.multiplier}x). ${adjustedSqft} sqft @ ${fmtCurrency(ratePerSqft)}/sqft (marine-grade vinyl + install).`,
      product_type: 'marine_wrap',
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      specs: {
        boatLength,
        boatType: typeOpt.value,
        coverage: coverageOpt.value,
        typeMultiplier: typeOpt.multiplier,
        coverageMultiplier: coverageOpt.multiplier,
        baseSqft,
        adjustedSqft,
        ratePerSqft,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <span style={label}>Boat Length (ft)</span>
          <input type="number" value={boatLength} onChange={e => setBoatLength(Number(e.target.value))}
            style={{ ...inp, ...mono }} min={10} max={100} />
        </div>
        <div>
          <span style={label}>Boat Type</span>
          <select value={boatType} onChange={e => setBoatType(e.target.value)} style={sel}>
            {BOAT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label} ({t.multiplier}x)</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Coverage</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {MARINE_COVERAGE.map(c => (
              <button key={c.value} onClick={() => setCoverage(c.value)} style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: coverage === c.value ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
                background: coverage === c.value ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                color: coverage === c.value ? 'var(--accent)' : 'var(--text2)',
              }}>
                {c.label} ({Math.round(c.multiplier * 100)}%)
              </button>
            ))}
          </div>
        </div>
        {/* Breakdown */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont, marginBottom: 2 }}>Calculation</span>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Base ({boatLength}ft x 8ft beam)</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text1)' }}>{baseSqft} sqft</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{typeOpt.label} multiplier</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--amber)' }}>{typeOpt.multiplier}x</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{coverageOpt.label} coverage</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--amber)' }}>{coverageOpt.multiplier}x</span>
          </div>
        </div>
      </div>

      {/* Preview */}
      <PreviewPanel
        rows={[
          { label: 'Total Sqft', value: `${fmtNumber(adjustedSqft)} sqft`, color: 'var(--cyan)' },
          { label: `Rate (marine-grade + install)`, value: `${fmtCurrency(ratePerSqft)}/sqft` },
        ]}
        total={{ label: 'Total Price', value: fmtCurrency(totalPrice) }}
        onAdd={handleAdd}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PPF (Paint Protection Film) CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function PPFCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [vehicleType, setVehicleType] = useState('sedan')
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [ppfType, setPpfType] = useState('standard')

  const ppfOpt = PPF_TYPES.find(p => p.value === ppfType)!
  const zonesTotal = selectedZones.reduce((sum, zoneId) => {
    const zone = PPF_ZONES.find(z => z.id === zoneId)
    return sum + (zone?.price || 0)
  }, 0)
  const totalPrice = Math.round(zonesTotal * ppfOpt.multiplier)

  const toggleZone = (zoneId: string) => {
    setSelectedZones(prev =>
      prev.includes(zoneId) ? prev.filter(id => id !== zoneId) : [...prev, zoneId]
    )
  }

  const handleAdd = () => {
    const zoneLabels = selectedZones
      .map(id => PPF_ZONES.find(z => z.id === id)?.label)
      .filter(Boolean)

    onAdd([{
      name: `PPF - ${ppfOpt.label} (${vehicleType})`,
      description: `${zoneLabels.join(', ')}. ${ppfOpt.label} film (${ppfOpt.multiplier}x).`,
      product_type: 'ppf',
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      specs: {
        vehicleType,
        ppfType: ppfOpt.value,
        ppfMultiplier: ppfOpt.multiplier,
        selectedZones,
        zonesTotal,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <span style={label}>Vehicle Type</span>
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={sel}>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="truck">Truck</option>
          </select>
        </div>
        <div>
          <span style={label}>PPF Type</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {PPF_TYPES.map(p => (
              <button key={p.value} onClick={() => setPpfType(p.value)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: ppfType === p.value ? '2px solid var(--purple)' : '1px solid var(--border, #2a2d3a)',
                background: ppfType === p.value ? 'rgba(139,92,246,0.08)' : 'var(--surface)',
                color: ppfType === p.value ? 'var(--purple)' : 'var(--text2)',
              }}>
                {p.label} ({p.multiplier}x)
              </button>
            ))}
          </div>
        </div>
        <div>
          <span style={label}>Coverage Zones</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PPF_ZONES.map(zone => {
              const checked = selectedZones.includes(zone.id)
              return (
                <button key={zone.id} onClick={() => toggleZone(zone.id)} style={{
                  ...checkboxOuter(checked),
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={checkboxBox(checked)}>
                      {checked && <ChevronRight size={10} style={{ color: '#fff', transform: 'rotate(-45deg)' }} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: checked ? 'var(--text1)' : 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {zone.label}
                    </span>
                  </div>
                  <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: checked ? 'var(--accent)' : 'var(--text3)' }}>
                    {fmtCurrency(zone.price)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Preview */}
      <PreviewPanel
        rows={[
          { label: 'Zones Selected', value: `${selectedZones.length}`, color: 'var(--cyan)' },
          { label: 'Zones Subtotal', value: fmtCurrency(zonesTotal) },
          { label: `${ppfOpt.label} Film (${ppfOpt.multiplier}x)`, value: ppfOpt.multiplier !== 1 ? `+${fmtCurrency(totalPrice - zonesTotal)}` : '--', color: 'var(--amber)' },
        ]}
        total={{ label: 'Total Price', value: fmtCurrency(totalPrice) }}
        onAdd={handleAdd}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. FLEET CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function FleetCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [count, setCount] = useState(5)
  const [vehicleType, setVehicleType] = useState('sedan')
  const [wrapType, setWrapType] = useState<'full' | 'partial' | 'decals'>('full')

  const vehicle = VEHICLE_TYPES.find(v => v.value === vehicleType)!

  const basePerUnit = useMemo(() => {
    if (wrapType === 'decals') return 800
    const coverageMultiplier = wrapType === 'partial' ? 0.5 : 1
    const sqft = Math.round(vehicle.sqft * coverageMultiplier)
    const materialCost = sqft * 7 // default 3M 1080
    const laborHrs = Math.round(vehicle.laborHrs * coverageMultiplier)
    const laborCost = laborHrs * 45
    return materialCost + laborCost
  }, [vehicle, wrapType])

  const discountPct = count >= 10 ? 15 : count >= 5 ? 10 : count >= 2 ? 5 : 0
  const discountPerUnit = Math.round(basePerUnit * (discountPct / 100))
  const pricePerUnit = basePerUnit - discountPerUnit
  const totalDiscount = discountPerUnit * count
  const totalPrice = pricePerUnit * count

  const handleAdd = () => {
    const wrapLabel = wrapType === 'full' ? 'Full Wrap' : wrapType === 'partial' ? 'Partial Wrap' : 'Decals Only'

    onAdd([{
      name: `Fleet ${wrapLabel} - ${count}x ${vehicle.label}`,
      description: `${count} vehicles @ ${fmtCurrency(pricePerUnit)}/ea (${discountPct}% fleet discount). Base ${fmtCurrency(basePerUnit)}/ea.`,
      product_type: 'fleet_wrap',
      quantity: count,
      unit_price: pricePerUnit,
      total_price: totalPrice,
      specs: {
        vehicleCount: count,
        vehicleType: vehicle.value,
        wrapType,
        basePerUnit,
        discountPct,
        discountPerUnit,
        pricePerUnit,
        totalDiscount,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <span style={label}>Number of Vehicles</span>
          <input type="number" value={count} onChange={e => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
            style={{ ...inp, ...mono, fontSize: 18, fontWeight: 800, textAlign: 'center' }} min={1} max={100} />
        </div>
        <div>
          <span style={label}>Vehicle Type</span>
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={sel}>
            {VEHICLE_TYPES.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Wrap Type</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['full', 'Full Wrap'], ['partial', 'Partial Wrap'], ['decals', 'Decals Only']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setWrapType(val)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: wrapType === val ? '2px solid var(--accent)' : '1px solid var(--border, #2a2d3a)',
                background: wrapType === val ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
                color: wrapType === val ? 'var(--accent)' : 'var(--text2)',
              }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        {/* Discount tiers */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont, display: 'block', marginBottom: 8 }}>Quantity Discounts</span>
          {[
            { range: '2-4 vehicles', pct: 5 },
            { range: '5-9 vehicles', pct: 10 },
            { range: '10+ vehicles', pct: 15 },
          ].map(tier => (
            <div key={tier.range} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{tier.range}</span>
              <span style={{
                ...mono, fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: discountPct === tier.pct ? 'rgba(34,192,122,0.15)' : 'transparent',
                color: discountPct === tier.pct ? 'var(--green)' : 'var(--text3)',
              }}>
                {tier.pct}% off
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border, #2a2d3a)', borderRadius: 10,
          borderLeft: '3px solid var(--green)', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 4 }}>
            Live Preview
          </span>
          <SummaryRow label="Base Price / Unit" value={fmtCurrency(basePerUnit)} />
          <SummaryRow label={`Fleet Discount (${discountPct}%)`} value={discountPerUnit > 0 ? `-${fmtCurrency(discountPerUnit)}` : '--'} color="var(--red)" />
          <SummaryRow label="Price / Unit" value={fmtCurrency(pricePerUnit)} color="var(--cyan)" />
          <div style={{ borderTop: '1px solid var(--border, #2a2d3a)', margin: '4px 0' }} />
          <SummaryRow label={`${count} Vehicles`} value={`${count} x ${fmtCurrency(pricePerUnit)}`} />
          {totalDiscount > 0 && (
            <div style={{
              background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)',
              borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fleet Savings</span>
              <span style={{ ...mono, fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{fmtCurrency(totalDiscount)}</span>
            </div>
          )}
          <div style={{ borderTop: '2px solid var(--border, #2a2d3a)', margin: '4px 0' }} />
          <SummaryRow label="Total Fleet Price" value={fmtCurrency(totalPrice)} color="var(--green)" large />
        </div>
        <button onClick={handleAdd} style={addBtn}>
          <Plus size={16} /> Add to Estimate
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DECKING CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function DeckingCalc({ onAdd }: { onAdd: (items: LineItem[]) => void }) {
  const [deckWidth, setDeckWidth] = useState(6)
  const [deckLength, setDeckLength] = useState(8)
  const [material, setMaterial] = useState('seadek')

  const matOpt = DECK_MATERIALS.find(m => m.value === material)!
  const totalSqft = deckWidth * deckLength
  const wasteFactor = 0.15
  const adjustedSqft = Math.round(totalSqft * (1 + wasteFactor))
  const installRate = 8
  const materialCost = adjustedSqft * matOpt.rate
  const installCost = adjustedSqft * installRate
  const totalPrice = materialCost + installCost

  const handleAdd = () => {
    onAdd([{
      name: `Marine Decking - ${matOpt.label}`,
      description: `${deckWidth}ft x ${deckLength}ft (${totalSqft} sqft + 15% waste = ${adjustedSqft} sqft). ${matOpt.label} @ ${fmtCurrency(matOpt.rate)}/sqft + install @ ${fmtCurrency(installRate)}/sqft.`,
      product_type: 'decking',
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      specs: {
        deckWidth,
        deckLength,
        material: matOpt.value,
        totalSqft,
        wasteFactor,
        adjustedSqft,
        materialRate: matOpt.rate,
        installRate,
        materialCost,
        installCost,
      },
    }])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={label}>Deck Width (ft)</span>
            <input type="number" value={deckWidth} onChange={e => setDeckWidth(Number(e.target.value))}
              style={{ ...inp, ...mono }} min={1} max={50} />
          </div>
          <div>
            <span style={label}>Deck Length (ft)</span>
            <input type="number" value={deckLength} onChange={e => setDeckLength(Number(e.target.value))}
              style={{ ...inp, ...mono }} min={1} max={50} />
          </div>
        </div>
        <div>
          <span style={label}>Material</span>
          <select value={material} onChange={e => setMaterial(e.target.value)} style={sel}>
            {DECK_MATERIALS.map(m => (
              <option key={m.value} value={m.value}>{m.label} ({fmtCurrency(m.rate)}/sqft)</option>
            ))}
          </select>
        </div>
        {/* Breakdown */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont, marginBottom: 2 }}>Calculation</span>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Raw area ({deckWidth} x {deckLength})</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text1)' }}>{totalSqft} sqft</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>+ 15% waste</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--amber)' }}>+{Math.round(totalSqft * wasteFactor)} sqft</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border, #2a2d3a)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>Adjusted total</span>
            <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{adjustedSqft} sqft</span>
          </div>
        </div>
      </div>

      {/* Preview */}
      <PreviewPanel
        rows={[
          { label: 'Total Sqft (w/ waste)', value: `${fmtNumber(adjustedSqft)} sqft`, color: 'var(--cyan)' },
          { label: `Material (${fmtCurrency(matOpt.rate)}/sqft)`, value: fmtCurrency(materialCost) },
          { label: `Install (${fmtCurrency(installRate)}/sqft)`, value: fmtCurrency(installCost) },
        ]}
        total={{ label: 'Total Price', value: fmtCurrency(totalPrice) }}
        onAdd={handleAdd}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EstimateCalculators({ onAddLineItems, onClose }: EstimateCalculatorsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('vehicle')

  const handleAdd = (items: LineItem[]) => {
    onAddLineItems(items)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border, #2a2d3a)', borderRadius: 14,
      overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px', borderBottom: '1px solid var(--border, #2a2d3a)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} style={{ color: 'var(--accent)' }} />
          <span style={{
            fontSize: 16, fontWeight: 900, fontFamily: headingFont, color: 'var(--text1)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Estimate Calculators
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center',
        }}>
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--border, #2a2d3a)',
        overflowX: 'auto', padding: '0 12px',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
              cursor: 'pointer', background: 'transparent', border: 'none',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              color: isActive ? 'var(--accent)' : 'var(--text3)',
              fontFamily: headingFont, fontSize: 12, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'vehicle' && <VehicleWrapCalc onAdd={handleAdd} />}
        {activeTab === 'boxtruck' && <BoxTruckCalc onAdd={handleAdd} />}
        {activeTab === 'trailer' && <TrailerCalc onAdd={handleAdd} />}
        {activeTab === 'marine' && <MarineCalc onAdd={handleAdd} />}
        {activeTab === 'ppf' && <PPFCalc onAdd={handleAdd} />}
        {activeTab === 'fleet' && <FleetCalc onAdd={handleAdd} />}
        {activeTab === 'decking' && <DeckingCalc onAdd={handleAdd} />}
      </div>
    </div>
  )
}
