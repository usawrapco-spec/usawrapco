'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Zap, Car, ChevronDown, ChevronRight, Info } from 'lucide-react'
import SharedVehicleSelector, { type VehicleSelectResult } from '@/components/shared/VehicleSelector'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, VINYL_MATERIALS, LAMINATE_RATE, DESIGN_FEE_DEFAULT,
  calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, pillBtn, outputRow, outputVal,
} from './types'

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

// Auto-detect best tier from sqft using non-overlapping primary ranges
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

// ─── Vehicle measurement columns ────────────────────────────────────────────
interface VehicleRecord {
  make: string
  model: string
  full_wrap_sqft: number | null
  partial_wrap_sqft: number | null
  hood_sqft: number | null
  roof_sqft: number | null
  side_sqft: number | null
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
  { key: 'three_quarter', label: '3/4 Wrap',     sqftFn: (v: VehicleRecord) => Math.round((v.full_wrap_sqft || 0) * 0.75) },
  { key: 'half',          label: 'Half Wrap',    sqftFn: (v: VehicleRecord) => Math.round((v.full_wrap_sqft || 0) * 0.50) },
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

  // Load initial vehicle measurement from specs
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
            setVehicle({
              make: mk, model: mdl,
              full_wrap_sqft: (m.full_wrap_sqft as number) || null,
              partial_wrap_sqft: (m.partial_wrap_sqft as number) || null,
              hood_sqft: (m.hood_sqft as number) || null,
              roof_sqft: (m.roof_sqft as number) || null,
              side_sqft: (m.side_sqft as number) || null,
              doors_sqft: (m.doors_sqft as number) || null,
            })
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close material tooltip on outside click
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
        partial_wrap_sqft: (m.partial_wrap_sqft as number) || null,
        hood_sqft: (m.hood_sqft as number) || null,
        roof_sqft: (m.roof_sqft as number) || null,
        side_sqft: (m.side_sqft as number) || null,
        doors_sqft: (m.doors_sqft as number) || null,
      })
      // Auto-detect and apply install tier from sqft
      if (fullSqft > 0) {
        const tierKey = autoDetectTierKey(fullSqft)
        const tier = FLAT_RATE_TIERS.find(t => t.key === tierKey)
        if (tier) {
          setSelectedTierKey(tier.key)
          setInstallerPay(tier.installerPay)
          setInstallHours(tier.installHours)
        }
        // Auto-open advanced section to show auto-selected tier
        setAdvancedOpen(false)
      }
    } else if (!result.model) {
      setVehicle(null)
    }
  }

  // Compute sqft for selected coverage
  const sqft = useMemo(() => {
    if (!vehicle) return 0
    if (coverage === 'custom') {
      let t = 0
      const sides2 = (vehicle.side_sqft || 0) / 2
      if (customZones.hood)         t += vehicle.hood_sqft || 0
      if (customZones.roof)         t += vehicle.roof_sqft || 0
      if (customZones.driver_side)  t += sides2
      if (customZones.pass_side)    t += sides2
      if (customZones.front_bumper) t += Math.round((vehicle.full_wrap_sqft || 0) * 0.05)
      if (customZones.rear_bumper)  t += Math.round((vehicle.full_wrap_sqft || 0) * 0.05)
      if (customZones.mirrors)      t += 6
      if (customZones.doors)        t += vehicle.doors_sqft || 0
      return Math.round(t)
    }
    const cov = COVERAGE.find(c => c.key === coverage)
    return cov ? cov.sqftFn(vehicle) : (vehicle.full_wrap_sqft || 0)
  }, [vehicle, coverage, customZones])

  const matRate         = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel        = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material
  const laminateAdd     = laminate ? LAMINATE_RATE : 0
  const sqftOrdered     = isInstallOnly ? 0 : Math.ceil(sqft * (1 + waste / 100))
  const materialCost    = isInstallOnly ? 0 : sqftOrdered * (matRate + laminateAdd)
  const effectiveDFee   = isInstallOnly ? 0 : designFee
  const cogs            = materialCost + installerPay + effectiveDFee
  const gpm             = calcGPMPct(salePrice, cogs)
  const gp              = salePrice - cogs
  const autoTargetPrice = cogs > 0 ? Math.round(cogs / (1 - gpmTarget / 100)) : 0
  const belowFloor      = salePrice > 0 && gpm < 65
  const autoTierKey     = vehicle?.full_wrap_sqft ? autoDetectTierKey(vehicle.full_wrap_sqft) : ''

  // Emit onChange whenever anything changes
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

  const autoSelectedTierLabel = FLAT_RATE_TIERS.find(t => t.key === selectedTierKey)?.label ?? ''
  const collapsedLabel = selectedTierKey
    ? `${isInstallOnly ? '' : `Waste: ${waste}% · `}${autoSelectedTierLabel} install`
    : `${isInstallOnly ? '' : `Waste: ${waste}% · `}No tier selected`

  const gadget: React.CSSProperties = {
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Car size={13} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Commercial Vehicle Calculator
        </span>
        {isInstallOnly && (
          <span style={{ marginLeft: 6, padding: '2px 8px', background: 'rgba(34,192,122,0.15)', border: '1px solid var(--green)', borderRadius: 10, fontSize: 10, fontWeight: 800, color: 'var(--green)', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            INSTALL ONLY — NO MATERIAL
          </span>
        )}
      </div>

      {/* Step 1 — Vehicle */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 1 — Vehicle
        </div>
        <SharedVehicleSelector
          defaultYear={year}
          defaultMake={make}
          defaultModel={model}
          disabled={!canWrite}
          onVehicleSelect={handleVehicleSelect}
        />
        {vehicle && (
          <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: 'var(--text2)', flexWrap: 'wrap' }}>
            <span>Full: <b style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.full_wrap_sqft}</b> sqft</span>
            <span>Hood: <b style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.hood_sqft}</b></span>
            <span>Roof: <b style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.roof_sqft}</b></span>
            {selectedTierKey && (
              <span style={{ color: 'var(--green)' }}>
                Auto-tier: <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{autoSelectedTierLabel}</b>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Step 2 — Coverage (including Install Only) */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 2 — Coverage
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COVERAGE.map(c => {
            const isInstOnly = c.key === 'install_only'
            const active = coverage === c.key
            return (
              <button
                key={c.key}
                onClick={() => canWrite && setCoverage(c.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, cursor: canWrite ? 'pointer' : 'default',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  border: active
                    ? `2px solid ${isInstOnly ? 'var(--green)' : 'var(--accent)'}`
                    : `1px solid ${isInstOnly ? 'rgba(34,192,122,0.4)' : 'var(--border)'}`,
                  background: active
                    ? (isInstOnly ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.15)')
                    : (isInstOnly ? 'rgba(34,192,122,0.05)' : 'var(--surface)'),
                  color: active
                    ? (isInstOnly ? 'var(--green)' : 'var(--accent)')
                    : (isInstOnly ? 'var(--green)' : 'var(--text2)'),
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        {coverage === 'custom' && vehicle && (
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { key: 'hood',         label: `Hood (${vehicle.hood_sqft} sqft)` },
              { key: 'roof',         label: `Roof (${vehicle.roof_sqft} sqft)` },
              { key: 'driver_side',  label: `Driver Side (~${Math.round((vehicle.side_sqft || 0) / 2)} sqft)` },
              { key: 'pass_side',    label: `Pass Side (~${Math.round((vehicle.side_sqft || 0) / 2)} sqft)` },
              { key: 'front_bumper', label: 'Front Bumper (~est)' },
              { key: 'rear_bumper',  label: 'Rear Bumper (~est)' },
              { key: 'mirrors',      label: 'Mirrors (6 sqft)' },
              { key: 'doors',        label: `Doors (${vehicle.doors_sqft} sqft)` },
            ].map(z => (
              <label key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', fontSize: 12, color: customZones[z.key] ? 'var(--text1)' : 'var(--text2)' }}>
                <input type="checkbox" checked={!!customZones[z.key]} onChange={() => canWrite && toggleZone(z.key)} />
                {z.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 3 — Material (hidden for install-only) */}
      {!isInstallOnly && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Step 3 — Material
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
            {VINYL_MATERIALS.map((m) => {
              const isA1105 = m.key === 'avery_1105'
              return (
                <div key={m.key} style={{ position: 'relative' }}>
                  <button
                    onClick={() => canWrite && setMaterial(m.key)}
                    style={{ ...pillBtn(material === m.key), textAlign: 'left', borderRadius: 8, padding: '7px 10px', fontSize: 11, width: '100%' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{m.label}</span>
                      {isA1105 && (
                        <span
                          onClick={e => { e.stopPropagation(); setMatTooltipOpen(v => !v) }}
                          style={{ cursor: 'pointer', color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
                        >
                          <Info size={11} />
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: material === m.key ? 'var(--accent)' : 'var(--text3)', marginTop: 2 }}>
                      ${m.rate}/sqft
                    </div>
                  </button>
                  {isA1105 && matTooltipOpen && (
                    <div
                      ref={matTooltipRef}
                      style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text1)', width: 210, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', lineHeight: 1.5 }}
                    >
                      Price includes bleed allowance. Waste % covers installation loss only — do not add extra for bleed.
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Compact Summary Bar */}
          {vehicle && sqft > 0 && (
            <div style={{ marginTop: 10, padding: '7px 12px', background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', fontWeight: 700 }}>{sqft} sqft</span>
              <span style={{ color: 'var(--text3)' }}>·</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>${matRate}/sqft</span>
              <span style={{ color: 'var(--text3)' }}>·</span>
              <span>{waste}% waste</span>
              <span style={{ color: 'var(--text3)' }}>·</span>
              <span>{selectedTierKey ? (autoSelectedTierLabel + ' install') : 'No tier'}</span>
              <span style={{ color: 'var(--text3)' }}>·</span>
              <span style={{ color: autoTargetPrice > 0 ? 'var(--green)' : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                Est. {autoTargetPrice > 0 ? fmtC(autoTargetPrice) : '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Install-only summary bar */}
      {isInstallOnly && vehicle && (
        <div style={{ marginBottom: 12, padding: '7px 12px', background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>Install Only</span>
          <span>·</span>
          <span>{selectedTierKey ? autoSelectedTierLabel : 'No tier selected'}</span>
          <span>·</span>
          <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            Est. {autoTargetPrice > 0 ? fmtC(autoTargetPrice) : '—'}
          </span>
        </div>
      )}

      {/* Step 4 — Laminate (hidden for install-only) */}
      {!isInstallOnly && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Step 4 — Laminate
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => canWrite && setLaminate(true)} style={pillBtn(laminate, 'var(--green)')}>Yes +$0.60/sqft</button>
            <button onClick={() => canWrite && setLaminate(false)} style={pillBtn(!laminate)}>No Laminate</button>
          </div>
        </div>
      )}

      {/* Steps 5+6 — Collapsible: Waste + Install Tier */}
      <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            {advancedOpen ? 'Steps 5+6 — Waste & Install Tier' : collapsedLabel}
          </span>
          {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {advancedOpen && (
          <div style={{ padding: 12, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Waste */}
            {!isInstallOnly && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', minWidth: 50 }}>
                  Waste
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {WASTE_OPTS.map(w => (
                    <button key={w} onClick={() => canWrite && setWaste(w)} style={{ ...pillBtn(waste === w, 'var(--amber)'), padding: '4px 10px', borderRadius: 6 }}>
                      {w}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Install Tier Grid */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
                Install Flat Rate
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 5 }}>
                {FLAT_RATE_TIERS.map(tier => {
                  const selected = selectedTierKey === tier.key
                  const isAutoMatch = autoTierKey === tier.key && !selected
                  return (
                    <button
                      key={tier.key}
                      onClick={() => applyTier(tier.key)}
                      style={{
                        padding: '7px 6px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default',
                        border: selected ? '2px solid var(--accent)' : isAutoMatch ? '1px dashed var(--green)' : '1px solid var(--border)',
                        background: selected ? 'rgba(79,127,255,0.1)' : isAutoMatch ? 'rgba(34,192,122,0.06)' : 'var(--surface)',
                        textAlign: 'center', position: 'relative',
                      }}
                    >
                      {isAutoMatch && (
                        <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} title="Auto-detected for this vehicle" />
                      )}
                      <div style={{ fontSize: 9, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text2)', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
                        {tier.label}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--text1)', marginTop: 2 }}>
                        {fmtC(tier.installerPay)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>{tier.installHours}h</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GPM Target Slider */}
      <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Target GPM
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 800, color: gpmTarget >= 75 ? 'var(--green)' : gpmTarget >= 65 ? 'var(--amber)' : 'var(--red)' }}>
            {gpmTarget}%
          </span>
        </div>
        <input
          type="range" min={65} max={85} step={1} value={gpmTarget}
          onChange={e => canWrite && setGpmTarget(Number(e.target.value))}
          disabled={!canWrite}
          style={{ width: '100%', cursor: canWrite ? 'pointer' : 'default', accentColor: gpmTarget >= 75 ? '#22c07a' : gpmTarget >= 65 ? '#f59e0b' : '#f25a5a' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
          <span>65% floor</span>
          <span>75% default</span>
          <span>85% max</span>
        </div>
      </div>

      {/* Manual Override Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: isInstallOnly ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: belowFloor ? 8 : 14 }}>
        <div>
          <label style={calcFieldLabel}>Sale Price</label>
          <input
            type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', borderColor: belowFloor ? 'var(--red)' : undefined }}
            disabled={!canWrite}
          />
        </div>
        <div>
          <label style={calcFieldLabel}>Install Pay</label>
          <input
            type="number" value={installerPay || ''} onChange={e => setInstallerPay(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
            disabled={!canWrite}
          />
        </div>
        {!isInstallOnly && (
          <div>
            <label style={calcFieldLabel}>Design Fee</label>
            <input
              type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
              style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
              disabled={!canWrite}
            />
          </div>
        )}
      </div>

      {/* Below floor warning */}
      {belowFloor && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>
          Below minimum — job not recommended. Manager override required to save.
        </div>
      )}

      {/* Live Outputs */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Live Outputs
        </div>
        {(isInstallOnly ? [
          ['Coverage',      'Install Only — No Material'],
          ['Installer Pay', fmtC(installerPay)],
          ['Install Hours', `${installHours}h`],
          ['COGS',          fmtC(cogs)],
        ] : [
          ['Sqft (Coverage)',      `${sqft} sqft`],
          ['Material to Order',   `${sqftOrdered} sqft (+${waste}% waste)`],
          ['Material Cost',       fmtC(materialCost)],
          ['Install Hours',       `${installHours}h`],
          ['Installer Pay',       fmtC(installerPay)],
          ['Design Fee',          fmtC(effectiveDFee)],
          ['COGS',                fmtC(cogs)],
        ]).map(([label, val]) => (
          <div key={String(label)} style={outputRow}>
            <span>{label}</span>
            <span style={outputVal}>{val}</span>
          </div>
        ))}
        <div style={{ ...outputRow, borderBottom: 'none', paddingTop: 8, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text1)' }}>GPM</span>
          <span style={{ ...outputVal, fontSize: 14, color: gpmColor(gpm) }}>
            {gpm.toFixed(1)}%  ({fmtC(gp)} GP)
          </span>
        </div>

        <button
          onClick={() => { if (canWrite) setSalePrice(autoTargetPrice) }}
          disabled={!canWrite || cogs === 0}
          style={{
            marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, cursor: canWrite && cogs > 0 ? 'pointer' : 'not-allowed',
            background: 'linear-gradient(135deg, rgba(34,192,122,0.15) 0%, rgba(79,127,255,0.15) 100%)',
            border: '1px solid rgba(34,192,122,0.3)',
            color: 'var(--green)', fontSize: 11, fontWeight: 700,
            fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase',
            opacity: cogs === 0 ? 0.5 : 1,
          }}
        >
          <Zap size={12} /> Hit {gpmTarget}% GPM → Set Price to {fmtC(autoTargetPrice)}
        </button>
      </div>
    </div>
  )
}
