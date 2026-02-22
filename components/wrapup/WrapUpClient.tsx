'use client'

import { useState, useMemo } from 'react'
import { Layers, DollarSign, Download, RefreshCw, ChevronDown, Check, Copy, Printer } from 'lucide-react'
import type { Profile } from '@/types'

interface Props { profile: Profile }

// ── Vehicle panel data ─────────────────────────────────────────────
interface VehicleTemplate {
  id: string
  name: string
  category: string
  panels: Panel[]
  priceRange: [number, number]
}

interface Panel {
  id: string
  label: string
  sqft: number
  zone: 'primary' | 'secondary' | 'accent'
  description: string
}

const VEHICLES: VehicleTemplate[] = [
  {
    id: 'cargo_van',
    name: 'Cargo Van',
    category: 'Van',
    priceRange: [2800, 5500],
    panels: [
      { id: 'driver_side',   label: 'Driver Side',    sqft: 80,  zone: 'primary',   description: 'Full driver-side body panel' },
      { id: 'passenger_side',label: 'Passenger Side', sqft: 80,  zone: 'primary',   description: 'Full passenger-side body panel' },
      { id: 'rear_doors',    label: 'Rear Doors',     sqft: 50,  zone: 'primary',   description: 'Both rear cargo doors' },
      { id: 'roof',          label: 'Roof',           sqft: 60,  zone: 'secondary', description: 'Full roof panel' },
      { id: 'hood',          label: 'Hood',           sqft: 25,  zone: 'secondary', description: 'Full hood panel' },
      { id: 'front_bumper',  label: 'Front Bumper',   sqft: 12,  zone: 'accent',    description: 'Front bumper assembly' },
      { id: 'rear_bumper',   label: 'Rear Bumper',    sqft: 10,  zone: 'accent',    description: 'Rear bumper step area' },
      { id: 'mirrors',       label: 'Mirrors',        sqft: 4,   zone: 'accent',    description: 'Both side mirrors' },
    ],
  },
  {
    id: 'sprinter',
    name: 'Sprinter Van',
    category: 'Van',
    priceRange: [3200, 6500],
    panels: [
      { id: 'driver_side',   label: 'Driver Side',    sqft: 95,  zone: 'primary',   description: 'Full high-roof driver side' },
      { id: 'passenger_side',label: 'Passenger Side', sqft: 95,  zone: 'primary',   description: 'Full high-roof passenger side' },
      { id: 'rear_doors',    label: 'Rear Doors',     sqft: 60,  zone: 'primary',   description: 'Rear cargo doors' },
      { id: 'roof',          label: 'Roof',           sqft: 80,  zone: 'secondary', description: 'High-roof panel' },
      { id: 'hood',          label: 'Hood',           sqft: 28,  zone: 'secondary', description: 'Hood panel' },
      { id: 'front_bumper',  label: 'Front Bumper',   sqft: 15,  zone: 'accent',    description: 'Front fascia' },
      { id: 'sliding_door',  label: 'Sliding Door',   sqft: 30,  zone: 'secondary', description: 'Passenger side sliding door' },
      { id: 'mirrors',       label: 'Mirrors',        sqft: 5,   zone: 'accent',    description: 'Extended side mirrors' },
    ],
  },
  {
    id: 'box_truck_16',
    name: "Box Truck 16'",
    category: 'Truck',
    priceRange: [4500, 9000],
    panels: [
      { id: 'driver_side',   label: 'Driver Side',    sqft: 110, zone: 'primary',   description: 'Full box driver side' },
      { id: 'passenger_side',label: 'Passenger Side', sqft: 110, zone: 'primary',   description: 'Full box passenger side' },
      { id: 'rear_door',     label: 'Roll-up Door',   sqft: 90,  zone: 'primary',   description: 'Rear roll-up door' },
      { id: 'cab_sides',     label: 'Cab Sides',      sqft: 40,  zone: 'secondary', description: 'Cab body panels' },
      { id: 'hood',          label: 'Hood',           sqft: 30,  zone: 'secondary', description: 'Cab hood' },
      { id: 'bumper',        label: 'Bumper',         sqft: 14,  zone: 'accent',    description: 'Front bumper' },
      { id: 'roof_cab',      label: 'Cab Roof',       sqft: 20,  zone: 'accent',    description: 'Cab roof panel' },
    ],
  },
  {
    id: 'pickup_truck',
    name: 'Pickup Truck',
    category: 'Truck',
    priceRange: [1800, 4200],
    panels: [
      { id: 'driver_side',   label: 'Driver Side',    sqft: 45,  zone: 'primary',   description: 'Cab + bed driver side' },
      { id: 'passenger_side',label: 'Passenger Side', sqft: 45,  zone: 'primary',   description: 'Cab + bed passenger side' },
      { id: 'hood',          label: 'Hood',           sqft: 22,  zone: 'secondary', description: 'Full hood' },
      { id: 'tailgate',      label: 'Tailgate',       sqft: 18,  zone: 'primary',   description: 'Tailgate panel' },
      { id: 'roof',          label: 'Roof',           sqft: 15,  zone: 'secondary', description: 'Cab roof' },
      { id: 'bumpers',       label: 'Bumpers',        sqft: 10,  zone: 'accent',    description: 'Front & rear bumpers' },
      { id: 'mirrors',       label: 'Mirrors',        sqft: 3,   zone: 'accent',    description: 'Side mirrors' },
    ],
  },
  {
    id: 'sedan',
    name: 'Sedan / Car',
    category: 'Car',
    priceRange: [1200, 3500],
    panels: [
      { id: 'hood',          label: 'Hood',           sqft: 22,  zone: 'primary',   description: 'Full hood panel' },
      { id: 'roof',          label: 'Roof',           sqft: 14,  zone: 'primary',   description: 'Roof panel' },
      { id: 'driver_side',   label: 'Driver Doors',   sqft: 24,  zone: 'primary',   description: 'Front + rear driver doors' },
      { id: 'passenger_side',label: 'Passenger Doors',sqft: 24,  zone: 'primary',   description: 'Front + rear passenger doors' },
      { id: 'trunk',         label: 'Trunk / Deck',   sqft: 12,  zone: 'secondary', description: 'Trunk lid' },
      { id: 'bumpers',       label: 'Bumpers',        sqft: 14,  zone: 'accent',    description: 'Front & rear fascias' },
      { id: 'mirrors',       label: 'Mirrors',        sqft: 3,   zone: 'accent',    description: 'Side mirrors' },
    ],
  },
  {
    id: 'trailer_32',
    name: "Trailer 32'",
    category: 'Trailer',
    priceRange: [5000, 12000],
    panels: [
      { id: 'driver_side',   label: 'Driver Side',    sqft: 160, zone: 'primary',   description: 'Full trailer driver side' },
      { id: 'passenger_side',label: 'Passenger Side', sqft: 160, zone: 'primary',   description: 'Full trailer passenger side' },
      { id: 'rear_doors',    label: 'Rear Doors',     sqft: 80,  zone: 'primary',   description: 'Rear swing doors' },
      { id: 'front_nose',    label: 'Front Nose',     sqft: 40,  zone: 'secondary', description: 'Front nose cone' },
      { id: 'skirts',        label: 'Side Skirts',    sqft: 60,  zone: 'accent',    description: 'Aerodynamic side skirts' },
    ],
  },
]

const MATERIAL_RATES: Record<string, { label: string; rate: number; description: string }> = {
  avery_mpi1105: { label: 'Avery MPI 1105 (Economy)',    rate: 1.85, description: 'Good for fleets, 5yr outdoor' },
  avery_1005ez:  { label: 'Avery 1005EZ (Mid)',          rate: 2.10, description: 'EZ Apply, 7yr, conformable' },
  mpi_180cv3:    { label: '3M 2080 / IJ180Cv3 (Prem)',   rate: 2.50, description: 'Premium cast, 10yr, conforms to rivets' },
  avery_supreme: { label: 'Avery Supreme (Ultra Prem)',   rate: 2.80, description: 'Best conformability, 10yr+ warranty' },
}

const LABOR_RATE = 85 // $/hr shop rate
const LABOR_PER_SQFT = 0.35 // hrs per sqft

const ZONE_COLORS = {
  primary:   { bg: 'rgba(79,127,255,0.2)',  border: 'rgba(79,127,255,0.6)',  active: '#4f7fff', text: '#4f7fff' },
  secondary: { bg: 'rgba(34,192,122,0.2)', border: 'rgba(34,192,122,0.6)', active: '#22c07a', text: '#22c07a' },
  accent:    { bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.6)', active: '#f59e0b', text: '#f59e0b' },
}

const PRESETS = {
  'Full Wrap':     (v: VehicleTemplate) => v.panels.map(p => p.id),
  'Sides + Rear':  (v: VehicleTemplate) => v.panels.filter(p => p.id.includes('side') || p.id.includes('rear') || p.id.includes('door')).map(p => p.id),
  'Partial (Hood + Roof)': (v: VehicleTemplate) => v.panels.filter(p => p.id === 'hood' || p.id === 'roof').map(p => p.id),
  'Doors Only':    (v: VehicleTemplate) => v.panels.filter(p => p.id.includes('door') || p.id.includes('side')).map(p => p.id),
  'Clear':         () => [],
}

export default function WrapUpClient({ profile }: Props) {
  const [vehicle, setVehicle] = useState<VehicleTemplate>(VEHICLES[0])
  const [selected, setSelected] = useState<Set<string>>(new Set(vehicle.panels.map(p => p.id)))
  const [materialKey, setMaterialKey] = useState('avery_1005ez')
  const [markup, setMarkup] = useState(55) // % markup
  const [copied, setCopied] = useState(false)
  const [vehicleDropOpen, setVehicleDropOpen] = useState(false)

  function togglePanel(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyPreset(presetName: string) {
    const fn = PRESETS[presetName as keyof typeof PRESETS]
    const ids = fn(vehicle)
    setSelected(new Set(ids))
  }

  function switchVehicle(v: VehicleTemplate) {
    setVehicle(v)
    setSelected(new Set(v.panels.map(p => p.id)))
    setVehicleDropOpen(false)
  }

  const mat = MATERIAL_RATES[materialKey]

  const calc = useMemo(() => {
    const selectedPanels = vehicle.panels.filter(p => selected.has(p.id))
    const totalSqft = selectedPanels.reduce((s, p) => s + p.sqft, 0)
    const matCost = totalSqft * mat.rate
    const laborHrs = totalSqft * LABOR_PER_SQFT
    const laborCost = laborHrs * LABOR_RATE
    const subtotal = matCost + laborCost
    const sellPrice = subtotal * (1 + markup / 100)
    const gp = sellPrice - subtotal
    const gpm = sellPrice > 0 ? (gp / sellPrice) * 100 : 0
    return { totalSqft, matCost, laborHrs, laborCost, subtotal, sellPrice, gp, gpm, selectedPanels }
  }, [selected, vehicle, mat, markup])

  function copyScope() {
    const lines = [
      `WrapUp Coverage Plan — ${vehicle.name}`,
      `Material: ${mat.label}`,
      ``,
      `Selected Panels:`,
      ...calc.selectedPanels.map(p => `  • ${p.label} — ${p.sqft} sqft`),
      ``,
      `Total Coverage: ${calc.totalSqft} sqft`,
      `Material Cost: $${calc.matCost.toFixed(2)}`,
      `Labor (${calc.laborHrs.toFixed(1)} hrs @ $${LABOR_RATE}/hr): $${calc.laborCost.toFixed(2)}`,
      `Sell Price (${markup}% markup): $${Math.round(calc.sellPrice)}`,
      `Gross Profit: $${Math.round(calc.gp)} (${Math.round(calc.gpm)}% GPM)`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fM = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
  const fP = (n: number) => Math.round(n) + '%'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            WrapUp Coverage Tool
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            Select vehicle panels to build a wrap scope — get instant pricing estimates
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyScope} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {copied ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Scope'}
          </button>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14} /> Print Estimate
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left: Vehicle Panel Selector */}
        <div>
          {/* Vehicle picker */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Vehicle Type</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.keys(PRESETS).map(preset => (
                  <button key={preset} onClick={() => applyPreset(preset)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--surface2)', color: 'var(--text3)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setVehicleDropOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 14px', borderRadius: 9,
                  background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer',
                  color: 'var(--text1)', fontSize: 14, fontWeight: 700,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} style={{ color: 'var(--accent)' }} />
                  {vehicle.name}
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>({vehicle.category})</span>
                </div>
                <ChevronDown size={14} style={{ opacity: 0.6, transform: vehicleDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {vehicleDropOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {VEHICLES.map(v => (
                    <button key={v.id} onClick={() => switchVehicle(v)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', padding: '9px 12px', borderRadius: 7,
                      background: vehicle.id === v.id ? 'rgba(79,127,255,0.1)' : 'none',
                      border: 'none', cursor: 'pointer', color: vehicle.id === v.id ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 13, fontWeight: 500, textAlign: 'left',
                    }}
                      onMouseEnter={e => { if (vehicle.id !== v.id) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (vehicle.id !== v.id) e.currentTarget.style.background = 'none' }}
                    >
                      <span>{v.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fM(v.priceRange[0])} – {fM(v.priceRange[1])}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel Grid */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Select Coverage Panels</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                {(['primary', 'secondary', 'accent'] as const).map(z => (
                  <div key={z} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: ZONE_COLORS[z].active }} />
                    <span style={{ color: 'var(--text3)', textTransform: 'capitalize' }}>{z === 'primary' ? 'Main Body' : z === 'secondary' ? 'Roof/Hood' : 'Details'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {vehicle.panels.map(panel => {
                const isSelected = selected.has(panel.id)
                const zc = ZONE_COLORS[panel.zone]
                return (
                  <button
                    key={panel.id}
                    onClick={() => togglePanel(panel.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? zc.active : 'var(--border)'}`,
                      background: isSelected ? zc.bg : 'var(--surface2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 18, height: 18, borderRadius: '50%',
                        background: zc.active,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? zc.text : 'var(--text2)', marginBottom: 3 }}>
                      {panel.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{panel.description}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? zc.text : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {panel.sqft} sqft
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Totals bar */}
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', gap: 24, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Panels</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{selected.size} / {vehicle.panels.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Sqft</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{calc.totalSqft}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Labor</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{calc.laborHrs.toFixed(1)} hrs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pricing Calculator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Material selector */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>Material Selection</div>
            {Object.entries(MATERIAL_RATES).map(([key, m]) => (
              <button
                key={key}
                onClick={() => setMaterialKey(key)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 4,
                  border: `1px solid ${materialKey === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: materialKey === key ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: materialKey === key ? 'var(--accent)' : 'var(--text2)' }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{m.description}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>${m.rate}/sqft</div>
              </button>
            ))}
          </div>

          {/* Markup slider */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Markup</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{markup}%</span>
            </div>
            <input
              type="range" min={30} max={150} value={markup}
              onChange={e => setMarkup(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              <span>30% (low)</span><span>90% (target)</span><span>150% (premium)</span>
            </div>
          </div>

          {/* Pricing breakdown */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Pricing Breakdown</div>

            {[
              { label: 'Material Cost', value: fM(calc.matCost), sub: `${calc.totalSqft} sqft × $${mat.rate}` },
              { label: 'Labor Cost', value: fM(calc.laborCost), sub: `${calc.laborHrs.toFixed(1)} hrs × $${LABOR_RATE}/hr` },
              { label: 'Total COGS', value: fM(calc.subtotal), sub: 'Mat + Labor', highlight: true },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '7px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: row.highlight ? 700 : 500, color: row.highlight ? 'var(--text1)' : 'var(--text2)' }}>{row.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{row.sub}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</div>
              </div>
            ))}

            {/* Sell price highlight */}
            <div style={{
              marginTop: 12, padding: '14px 16px', borderRadius: 10,
              background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.25)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sell Price</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{fM(calc.sellPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                <span>Gross Profit: {fM(calc.gp)}</span>
                <span style={{ fontWeight: 700, color: calc.gpm >= 73 ? 'var(--green)' : calc.gpm >= 55 ? 'var(--amber)' : 'var(--red)' }}>
                  GPM: {fP(calc.gpm)} {calc.gpm >= 73 ? '★' : calc.gpm >= 55 ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* GPM indicator */}
            {calc.gpm >= 73 && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.1)', fontSize: 11, fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>
                GPM bonus tier unlocked (+2% commission)
              </div>
            )}
          </div>

          {/* Action */}
          <button
            onClick={copyScope}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <DollarSign size={16} />
            {copied ? 'Copied to Clipboard!' : 'Copy as Estimate Scope'}
          </button>
        </div>
      </div>
    </div>
  )
}
