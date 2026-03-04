'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Zap, Car, ChevronDown, ChevronRight, Info } from 'lucide-react'
import SharedVehicleSelector, { type VehicleSelectResult } from '@/components/shared/VehicleSelector'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, VINYL_MATERIALS, LAMINATE_RATE, DESIGN_FEE_DEFAULT,
  calcGPMPct, gpmColor,
  calcFieldLabelCompact, calcInputCompact, calcSelect, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'

// ─── Flat rate install tiers ────────────────────────────────────────────────
const FLAT_RATE_TIERS = [
  { key: 'small_car',  label: 'Small Car',  sqftMin: 0,   sqftMax: 179, installerPay: 400, installHours: 12 },
  { key: 'med_car',    label: 'Med Car',    sqftMin: 180, sqftMax: 229, installerPay: 500, installHours: 14 },
  { key: 'full_car',   label: 'Full Car',   sqftMin: 230, sqftMax: 269, installerPay: 550, installHours: 16 },
  { key: 'sm_truck',   label: 'Sm Truck',   sqftMin: 240, sqftMax: 299, installerPay: 550, installHours: 14 },
  { key: 'med_truck',  label: 'Med Truck',  sqftMin: 300, sqftMax: 349, installerPay: 600, installHours: 16 },
  { key: 'full_truck', label: 'Full Truck', sqftMin: 350, sqftMax: 399, installerPay: 650, installHours: 18 },
  { key: 'single_cab', label: 'Single Cab', sqftMin: 245, sqftMax: 295, installerPay: 500, installHours: 14 },
  { key: 'double_cab', label: 'Double Cab', sqftMin: 295, sqftMax: 355, installerPay: 600, installHours: 16 },
  { key: 'med_van',    label: 'Med Van',    sqftMin: 320, sqftMax: 389, installerPay: 600, installHours: 16 },
  { key: 'large_van',  label: 'Large Van',  sqftMin: 390, sqftMax: 479, installerPay: 650, installHours: 18 },
  { key: 'xl_van',     label: 'XL Van',     sqftMin: 480, sqftMax: 579, installerPay: 700, installHours: 20 },
  { key: 'xxl_van',    label: 'XXL Van',    sqftMin: 580, sqftMax: 9999, installerPay: 750, installHours: 22 },
] as const

function autoDetectTierKey(sqft: number): string {
  if (sqft < 180) return 'small_car'
  if (sqft < 230) return 'med_car'
  if (sqft < 300) return 'full_car'
  if (sqft < 350) return 'med_truck'
  if (sqft < 400) return 'full_truck'
  if (sqft < 480) return 'large_van'
  if (sqft < 580) return 'xl_van'
  return 'xxl_van'
}

interface VehicleRecord {
  make: string
  model: string
  full_wrap_sqft: number | null
  three_quarter_wrap_sqft: number | null
  half_wrap_sqft: number | null
  hood_sqft: number | null
  roof_sqft: number | null
  driver_sqft: number | null
  passenger_sqft: number | null
  back_sqft: number | null
  side_sqft: number | null
  linear_feet: number | null
  doors_sqft: number | null
}

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
  orgId: string
}

const COVERAGE = [
  { key: 'full',          label: 'Full Wrap',    sqftFn: (v: VehicleRecord) => v.full_wrap_sqft || 0 },
  { key: 'three_quarter', label: '3/4 Wrap',     sqftFn: (v: VehicleRecord) => v.three_quarter_wrap_sqft || Math.round((v.full_wrap_sqft || 0) * 0.75) },
  { key: 'half',          label: 'Half Wrap',    sqftFn: (v: VehicleRecord) => v.half_wrap_sqft || Math.round((v.full_wrap_sqft || 0) * 0.50) },
  { key: 'hood',          label: 'Hood Only',    sqftFn: (v: VehicleRecord) => v.hood_sqft || 0 },
  { key: 'roof',          label: 'Roof Only',    sqftFn: (v: VehicleRecord) => v.roof_sqft || 0 },
  { key: 'custom',        label: 'Custom Zones', sqftFn: () => 0 },
  { key: 'install_only',  label: 'Install Only', sqftFn: (v: VehicleRecord) => v.full_wrap_sqft || 0 },
]

const WASTE_OPTS = [5, 10, 15, 20] as const
const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CommercialVehicleCalc({ specs, onChange, canWrite }: Props) {
  const [vehicle, setVehicle]         = useState<VehicleRecord | null>(null)
  const [year, setYear]               = useState((specs.vehicleYear as string) || '')
  const [make, setMake]               = useState((specs.vehicleMake as string) || '')
  const [model, setModel]             = useState((specs.vehicleModel as string) || '')
  const [coverage, setCoverage]       = useState((specs.wrapType as string) || 'full')
  const [material, setMaterial]       = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [laminate, setLaminate]       = useState(!!(specs.hasLaminate as boolean))
  const [waste, setWaste]             = useState((specs.wasteBuffer as number) || 10)
  const [designFee, setDesignFee]     = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [installerPay, setInstallerPay]       = useState((specs.installerPay as number) || 0)
  const [installHours, setInstallHours]       = useState((specs.estimatedHours as number) || 0)
  const [salePrice, setSalePrice]             = useState((specs.unitPriceSaved as number) || 0)
  const [selectedTierKey, setSelectedTierKey] = useState((specs.installTierKey as string) || '')
  const [gpmTarget, setGpmTarget]             = useState((specs.gpmTarget as number) || 75)
  const [advancedOpen, setAdvancedOpen]       = useState(false)
  const [matTooltipOpen, setMatTooltipOpen]   = useState(false)
  const matTooltipRef = useRef<HTMLDivElement>(null)

  const [customZones, setCustomZones] = useState<Record<string, boolean>>(
    (specs.customZones as Record<string, boolean>) || {}
  )

  const isInstallOnly = coverage === 'install_only'

  useEffect(() => {
    const y = (specs.vehicleYear as string) || ''
    const mk = (specs.vehicleMake as string) || ''
    const mdl = (specs.vehicleModel as string) || ''
    if (y && mk && mdl) {
      fetch(`/api/vehicles/lookup?year=${y}&make=${encodeURIComponent(mk)}&model=${encodeURIComponent(mdl)}`)
        .then(r => r.json())
        .then(d => {
          if (d.measurement) {
            const m = d.measurement as Record<string, unknown>
            const fullSqft = Number(m.full_wrap_sqft) || 0
            setVehicle({
              make: mk, model: mdl,
              full_wrap_sqft: fullSqft || null,
              three_quarter_wrap_sqft: (m.three_quarter_wrap_sqft as number) || null,
              half_wrap_sqft: (m.half_wrap_sqft as number) || null,
              hood_sqft: (m.hood_sqft as number) || null,
              roof_sqft: (m.roof_sqft as number) || null,
              driver_sqft: (m.driver_sqft as number) || null,
              passenger_sqft: (m.passenger_sqft as number) || null,
              back_sqft: (m.back_sqft as number) || null,
              side_sqft: (m.side_sqft as number) || null,
              linear_feet: (m.linear_feet as number) || null,
              doors_sqft: (m.doors_sqft as number) || null,
            })
            if (fullSqft > 0) {
              const tierKey = autoDetectTierKey(fullSqft)
              const tier = FLAT_RATE_TIERS.find(t => t.key === tierKey)
              if (tier) { setSelectedTierKey(tier.key); setInstallerPay(tier.installerPay); setInstallHours(tier.installHours) }
            }
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!matTooltipOpen) return
    const handler = (e: MouseEvent) => {
      if (matTooltipRef.current && !matTooltipRef.current.contains(e.target as Node)) {
        setMatTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [matTooltipOpen])

  const handleVehicleSelect = (result: VehicleSelectResult) => {
    setYear(result.year)
    setMake(result.make)
    setModel(result.model)
    if (result.measurement) {
      const m = result.measurement as Record<string, unknown>
      const fullSqft = Number(m.full_wrap_sqft) || 0
      setVehicle({
        make: result.make, model: result.model,
        full_wrap_sqft: fullSqft || null,
        three_quarter_wrap_sqft: (m.three_quarter_wrap_sqft as number) || null,
        half_wrap_sqft: (m.half_wrap_sqft as number) || null,
        hood_sqft: (m.hood_sqft as number) || null,
        roof_sqft: (m.roof_sqft as number) || null,
        driver_sqft: (m.driver_sqft as number) || null,
        passenger_sqft: (m.passenger_sqft as number) || null,
        back_sqft: (m.back_sqft as number) || null,
        side_sqft: (m.side_sqft as number) || null,
        linear_feet: (m.linear_feet as number) || null,
        doors_sqft: (m.doors_sqft as number) || null,
      })
      if (fullSqft > 0) {
        const tierKey = autoDetectTierKey(fullSqft)
        const tier = FLAT_RATE_TIERS.find(t => t.key === tierKey)
        if (tier) {
          setSelectedTierKey(tier.key)
          setInstallerPay(tier.installerPay)
          setInstallHours(tier.installHours)
        }
        setAdvancedOpen(false)
      }
    } else if (!result.model) {
      setVehicle(null)
    }
  }

  const sqft = useMemo(() => {
    if (!vehicle) return 0
    if (coverage === 'custom') {
      let t = 0
      const driverSqft = vehicle.driver_sqft || (vehicle.side_sqft || 0) / 2
      const passSqft   = vehicle.passenger_sqft || (vehicle.side_sqft || 0) / 2
      if (customZones.hood)         t += vehicle.hood_sqft || 0
      if (customZones.roof)         t += vehicle.roof_sqft || 0
      if (customZones.driver_side)  t += driverSqft
      if (customZones.pass_side)    t += passSqft
      if (customZones.front_bumper) t += Math.round((vehicle.full_wrap_sqft || 0) * 0.05)
      if (customZones.rear_bumper)  t += Math.round((vehicle.full_wrap_sqft || 0) * 0.05)
      if (customZones.mirrors)      t += 6
      if (customZones.doors)        t += vehicle.doors_sqft || 0
      return Math.round(t)
    }
    const cov = COVERAGE.find(c => c.key === coverage)
    return cov ? cov.sqftFn(vehicle) : (vehicle.full_wrap_sqft || 0)
  }, [vehicle, coverage, customZones])

  const matRate          = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel         = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material
  const laminateAdd      = laminate ? LAMINATE_RATE : 0
  const sqftOrdered      = isInstallOnly ? 0 : Math.ceil(sqft * (1 + waste / 100))
  const linearFeetToOrder = sqftOrdered > 0 ? Math.ceil(sqftOrdered / 4.5) : 0
  const materialCost     = isInstallOnly ? 0 : sqftOrdered * (matRate + laminateAdd)
  const effectiveDFee    = isInstallOnly ? 0 : designFee
  const cogs             = materialCost + installerPay + effectiveDFee
  const gpm              = calcGPMPct(salePrice, cogs)
  const gp               = salePrice - cogs
  const autoTargetPrice  = cogs > 0 ? Math.round(cogs / (1 - gpmTarget / 100)) : 0
  const belowFloor       = salePrice > 0 && gpm < 65
  const autoTierKey      = vehicle?.full_wrap_sqft ? autoDetectTierKey(vehicle.full_wrap_sqft) : ''
  const autoSelectedTierLabel = FLAT_RATE_TIERS.find(t => t.key === selectedTierKey)?.label ?? ''
  const collapsedLabel = selectedTierKey
    ? `${isInstallOnly ? '' : `Waste: ${waste}% · `}${autoSelectedTierLabel} install`
    : `${isInstallOnly ? '' : `Waste: ${waste}% · `}No tier selected`

  useEffect(() => {
    const covLabel = COVERAGE.find(c => c.key === coverage)?.label || coverage
    const nameParts = [year, make, model].filter(Boolean)
    onChange({
      name: nameParts.length ? `${nameParts.join(' ')} — ${covLabel}` : undefined,
      unit_price: salePrice,
      specs: {
        vehicleYear: year, vehicleMake: make, vehicleModel: model,
        wrapType: covLabel, vinylType: matLabel,
        vinylArea: sqft, hasLaminate: laminate,
        wasteBuffer: waste, materialCost,
        installerPay, estimatedHours: installHours, designFee: effectiveDFee,
        vinylMaterial: material,
        customZones: coverage === 'custom' ? customZones : undefined,
        productLineType: isInstallOnly ? 'install_only' : 'commercial_vehicle',
        installTierKey: selectedTierKey,
        gpmTarget, isInstallOnly,
        unitPriceSaved: salePrice,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, installHours, effectiveDFee,
      year, make, model, coverage, material, laminate, waste, customZones, selectedTierKey, gpmTarget])

  const toggleZone = (zone: string) =>
    setCustomZones(prev => ({ ...prev, [zone]: !prev[zone] }))

  const applyTier = (tierKey: string) => {
    if (!canWrite) return
    const tier = FLAT_RATE_TIERS.find(t => t.key === tierKey)
    if (tier) {
      setSelectedTierKey(tier.key)
      setInstallerPay(tier.installerPay)
      setInstallHours(tier.installHours)
    }
  }

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Car size={12} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Commercial Vehicle Calculator
        </span>
        {isInstallOnly && (
          <span style={{ padding: '1px 6px', background: 'rgba(34,192,122,0.15)', border: '1px solid var(--green)', borderRadius: 8, fontSize: 9, fontWeight: 800, color: 'var(--green)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            INSTALL ONLY
          </span>
        )}
      </div>

      {/* Vehicle Selector */}
      <div style={{ marginBottom: 8 }}>
        <SharedVehicleSelector
          defaultYear={year}
          defaultMake={make}
          defaultModel={model}
          disabled={!canWrite}
          onVehicleSelect={handleVehicleSelect}
        />
      </div>

      {/* Panel grid: 6-col single row (compact micro-badges) */}
      {vehicle && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginBottom: 8 }}>
          {[
            { label: 'Driver', val: vehicle.driver_sqft,   color: '#4f7fff' },
            { label: 'Pass',   val: vehicle.passenger_sqft, color: '#8b5cf6' },
            { label: 'Rear',   val: vehicle.back_sqft,      color: '#f59e0b' },
            { label: 'Hood',   val: vehicle.hood_sqft,      color: '#22c07a' },
            { label: 'Roof',   val: vehicle.roof_sqft,      color: '#ec4899' },
            { label: 'Full',   val: vehicle.full_wrap_sqft, color: 'var(--cyan)' },
          ].map(p => (
            <div key={p.label} style={{ padding: '3px 4px', borderRadius: 5, background: 'var(--surface)', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 8, color: p.color, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>{p.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>{p.val ?? '—'}</div>
            </div>
          ))}
        </div>
      )}
      {vehicle && selectedTierKey && (
        <div style={{ marginBottom: 6, fontSize: 10, color: 'var(--green)' }}>
          Auto-tier: <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{autoSelectedTierLabel}</b>
        </div>
      )}

      {/* Coverage + Laminate on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start', marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Coverage</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {COVERAGE.map(c => {
              const isInstOnly = c.key === 'install_only'
              const active = coverage === c.key
              return (
                <button key={c.key} onClick={() => canWrite && setCoverage(c.key)}
                  style={pillBtnCompact(active, isInstOnly ? 'var(--green)' : 'var(--accent)')}>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
        {!isInstallOnly && (
          <div>
            <label style={calcFieldLabelCompact}>Laminate</label>
            <button onClick={() => canWrite && setLaminate(!laminate)}
              style={pillBtnCompact(laminate, 'var(--green)')}>
              {laminate ? '+$0.60' : 'No Lam'}
            </button>
          </div>
        )}
      </div>

      {/* Custom zones (when custom coverage selected) */}
      {coverage === 'custom' && vehicle && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
          {[
            { key: 'hood',         label: `Hood (${vehicle.hood_sqft} sqft)` },
            { key: 'roof',         label: `Roof (${vehicle.roof_sqft} sqft)` },
            { key: 'driver_side',  label: `Driver (${vehicle.driver_sqft ?? Math.round((vehicle.side_sqft || 0) / 2)} sqft)` },
            { key: 'pass_side',    label: `Pass (${vehicle.passenger_sqft ?? Math.round((vehicle.side_sqft || 0) / 2)} sqft)` },
            { key: 'front_bumper', label: 'Front Bumper (~est)' },
            { key: 'rear_bumper',  label: 'Rear Bumper (~est)' },
            { key: 'mirrors',      label: 'Mirrors (6 sqft)' },
            { key: 'doors',        label: `Doors (${vehicle.doors_sqft} sqft)` },
          ].map(z => (
            <label key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: canWrite ? 'pointer' : 'default', fontSize: 11, color: customZones[z.key] ? 'var(--text1)' : 'var(--text2)' }}>
              <input type="checkbox" checked={!!customZones[z.key]} onChange={() => canWrite && toggleZone(z.key)} />
              {z.label}
            </label>
          ))}
        </div>
      )}

      {/* Material dropdown (hidden for install-only) */}
      {!isInstallOnly && (
        <div style={{ marginBottom: 8, position: 'relative' }}>
          <label style={calcFieldLabelCompact}>Material</label>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select value={material} onChange={e => canWrite && setMaterial(e.target.value)} disabled={!canWrite}
              style={{ ...calcSelect, fontSize: 12, flex: 1 }}>
              {VINYL_MATERIALS.map(m => (
                <option key={m.key} value={m.key}>{m.label} — ${m.rate}/sqft{m.key === 'avery_1105' ? ' (bleed incl.)' : ''}</option>
              ))}
            </select>
            {material === 'avery_1105' && (
              <div style={{ position: 'relative' }}>
                <span
                  onClick={() => setMatTooltipOpen(v => !v)}
                  style={{ cursor: 'pointer', color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
                >
                  <Info size={12} />
                </span>
                {matTooltipOpen && (
                  <div ref={matTooltipRef} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: 4, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text1)', width: 210, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', lineHeight: 1.5 }}>
                    Price includes bleed allowance. Waste % covers installation loss only.
                  </div>
                )}
              </div>
            )}
          </div>
          {vehicle && sqft > 0 && !isInstallOnly && (
            <div style={{ marginTop: 4, padding: '3px 8px', background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)', borderRadius: 5, fontSize: 10, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', fontWeight: 700 }}>{sqft} sqft</span>
              <span>·</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>${matRate}/sqft</span>
              <span>·</span>
              <span>{waste}% waste</span>
              <span>·</span>
              <span style={{ color: autoTargetPrice > 0 ? 'var(--green)' : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                Est. {autoTargetPrice > 0 ? fmtC(autoTargetPrice) : '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Install-only summary */}
      {isInstallOnly && vehicle && (
        <div style={{ marginBottom: 8, padding: '5px 10px', background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 7, fontSize: 10, color: 'var(--text2)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>Install Only</span>
          <span>·</span>
          <span>{selectedTierKey ? autoSelectedTierLabel : 'No tier selected'}</span>
          <span>·</span>
          <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            Est. {autoTargetPrice > 0 ? fmtC(autoTargetPrice) : '—'}
          </span>
        </div>
      )}

      {/* Collapsible: Waste + Install Tier */}
      <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            {advancedOpen ? 'Waste & Install Tier' : collapsedLabel}
          </span>
          {advancedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {advancedOpen && (
          <div style={{ padding: 10, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Waste */}
            {!isInstallOnly && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', minWidth: 40 }}>Waste</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {WASTE_OPTS.map(w => (
                    <button key={w} onClick={() => canWrite && setWaste(w)}
                      style={{ ...pillBtnCompact(waste === w, 'var(--amber)') }}>
                      {w}%
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Install Tier Grid */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif' }}>
                Install Flat Rate
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 4 }}>
                {FLAT_RATE_TIERS.map(tier => {
                  const selected = selectedTierKey === tier.key
                  const isAutoMatch = autoTierKey === tier.key && !selected
                  return (
                    <button key={tier.key} onClick={() => applyTier(tier.key)}
                      style={{
                        padding: '5px 4px', borderRadius: 7, cursor: canWrite ? 'pointer' : 'default',
                        border: selected ? '1.5px solid var(--accent)' : isAutoMatch ? '1px dashed var(--green)' : '1px solid var(--border)',
                        background: selected ? 'rgba(79,127,255,0.1)' : isAutoMatch ? 'rgba(34,192,122,0.06)' : 'var(--surface)',
                        textAlign: 'center', position: 'relative',
                      }}>
                      {isAutoMatch && (
                        <div style={{ position: 'absolute', top: 2, right: 2, width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
                      )}
                      <div style={{ fontSize: 8, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text2)', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>{tier.label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--text1)', marginTop: 1 }}>{fmtC(tier.installerPay)}</div>
                      <div style={{ fontSize: 8, color: 'var(--text3)' }}>{tier.installHours}h</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GPM Target Slider + Manual Override side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: belowFloor ? 6 : 8 }}>
        {/* GPM Slider */}
        <div style={{ padding: '7px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>Target GPM</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: gpmTarget >= 75 ? 'var(--green)' : gpmTarget >= 65 ? 'var(--amber)' : 'var(--red)' }}>
              {gpmTarget}%
            </span>
          </div>
          <input
            type="range" min={65} max={85} step={1} value={gpmTarget}
            onChange={e => canWrite && setGpmTarget(Number(e.target.value))}
            disabled={!canWrite}
            style={{ width: '100%', cursor: canWrite ? 'pointer' : 'default', accentColor: gpmTarget >= 75 ? '#22c07a' : gpmTarget >= 65 ? '#f59e0b' : '#f25a5a' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text3)', marginTop: 1 }}>
            <span>65%</span><span>75%</span><span>85%</span>
          </div>
        </div>
        {/* Manual Override inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
          <div>
            <label style={calcFieldLabelCompact}>Sale Price</label>
            <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', borderColor: belowFloor ? 'var(--red)' : undefined }}
              disabled={!canWrite} />
          </div>
          <div>
            <label style={calcFieldLabelCompact}>Install Pay</label>
            <input type="number" value={installerPay || ''} onChange={e => setInstallerPay(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
              disabled={!canWrite} />
          </div>
          {!isInstallOnly && (
            <div>
              <label style={calcFieldLabelCompact}>Design Fee</label>
              <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
                style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
                disabled={!canWrite} />
            </div>
          )}
        </div>
      </div>

      {/* Below floor warning */}
      {belowFloor && (
        <div style={{ marginBottom: 8, padding: '6px 10px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', borderRadius: 7, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
          Below minimum — manager override required.
        </div>
      )}

      <OutputBar
        items={isInstallOnly ? [
          { label: 'Coverage', value: 'Install Only' },
          { label: 'Install Pay', value: fmtC(installerPay), color: 'var(--cyan)' },
          { label: 'Hours', value: `${installHours}h` },
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ] : [
          { label: 'Sqft', value: `${sqft} sqft` },
          { label: 'Ordered', value: `${sqftOrdered} sqft (+${waste}%)`, color: 'var(--cyan)' },
          { label: 'Linft', value: `${linearFeetToOrder} ft` },
          { label: 'Mat Cost', value: fmtC(materialCost) },
          { label: 'Labor', value: `${fmtC(installerPay)} (${installHours}h)`, color: 'var(--cyan)' },
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ]}
        gpm={gpm}
        gp={gp}
        autoPrice={autoTargetPrice}
        gpmTarget={gpmTarget}
        onApplyAutoPrice={() => canWrite && setSalePrice(autoTargetPrice)}
        canWrite={canWrite}
      />
    </div>
  )
}
