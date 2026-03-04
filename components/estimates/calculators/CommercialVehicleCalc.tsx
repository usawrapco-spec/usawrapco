'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Car, Info } from 'lucide-react'
import SharedVehicleSelector, { type VehicleSelectResult } from '@/components/shared/VehicleSelector'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, VINYL_MATERIALS, DESIGN_FEE_DEFAULT,
  calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, calcSelect, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'
import { calculateInstallPay } from '@/lib/estimator/vehicleDb'

// ─── Vehicle measurement record from DB ─────────────────────────────────────
interface VehicleRecord {
  make: string
  model: string
  full_wrap_sqft: number | null        // NO roof (sides + back + hood)
  full_wrap_with_roof_sqft: number | null // WITH roof
  wrap_sqft: number | null             // alias for full_wrap_sqft (no roof)
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
  install_hours: number | null         // from DB
  install_pay: number | null           // from DB
  category: string | null
  suggested_price: number | null
}

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
  orgId: string
}

const COVERAGE = [
  { key: 'full',          label: 'Full Wrap' },
  { key: 'three_quarter', label: '3/4 Wrap' },
  { key: 'half',          label: 'Half Wrap' },
  { key: 'hood',          label: 'Hood Only' },
  { key: 'roof',          label: 'Roof Only' },
  { key: 'custom',        label: 'Custom Zones' },
  { key: 'install_only',  label: 'Install Only' },
]

/** Build the list of body panels for a vehicle (excludes roof) */
function getBodyPanels(v: VehicleRecord) {
  const driverSqft = v.driver_sqft || Math.round((v.side_sqft || 0) / 2)
  const passSqft   = v.passenger_sqft || Math.round((v.side_sqft || 0) / 2)
  return [
    { key: 'hood',        label: 'Hood',           sqft: v.hood_sqft || 0 },
    { key: 'driver_side', label: 'Driver Side',    sqft: driverSqft },
    { key: 'pass_side',   label: 'Passenger Side', sqft: passSqft },
    { key: 'back',        label: 'Back / Rear',    sqft: v.back_sqft || 0 },
    { key: 'doors',       label: 'Doors',          sqft: v.doors_sqft || 0 },
  ].filter(p => p.sqft > 0)
}

function getCoverageSqft(v: VehicleRecord, coverage: string, customZones: Record<string, boolean>, includeRoof: boolean) {
  let base = 0
  switch (coverage) {
    case 'full':
      base = v.full_wrap_sqft || 0
      break
    case 'three_quarter':
      base = v.three_quarter_wrap_sqft || Math.round((v.full_wrap_sqft || 0) * 0.75)
      break
    case 'half':
      base = v.half_wrap_sqft || Math.round((v.full_wrap_sqft || 0) * 0.50)
      break
    case 'hood':
      base = v.hood_sqft || 0
      break
    case 'roof':
      return v.roof_sqft || 0 // roof-only, no add-on logic
    case 'install_only':
      base = v.full_wrap_sqft || 0
      break
    case 'custom': {
      const driverSqft = v.driver_sqft || (v.side_sqft || 0) / 2
      const passSqft   = v.passenger_sqft || (v.side_sqft || 0) / 2
      if (customZones.hood)         base += v.hood_sqft || 0
      if (customZones.driver_side)  base += driverSqft
      if (customZones.pass_side)    base += passSqft
      if (customZones.back)         base += v.back_sqft || 0
      if (customZones.front_bumper) base += Math.round((v.full_wrap_sqft || 0) * 0.05)
      if (customZones.rear_bumper)  base += Math.round((v.full_wrap_sqft || 0) * 0.05)
      if (customZones.mirrors)      base += 6
      if (customZones.doors)        base += v.doors_sqft || 0
      if (customZones.roof)         base += v.roof_sqft || 0
      return Math.round(base) // custom handles roof in its own toggles
    }
    default:
      base = v.full_wrap_sqft || 0
  }
  // Add roof if toggled on (and not roof-only or custom)
  if (includeRoof && coverage !== 'roof' && coverage !== 'custom') {
    base += v.roof_sqft || 0
  }
  return Math.round(base)
}

/** Parse a measurement response into a VehicleRecord */
function parseVehicleRecord(mk: string, mdl: string, m: Record<string, unknown>): VehicleRecord {
  const fullSqft = Number(m.full_wrap_sqft) || 0
  const roofSqft = Number(m.roof_sqft) || 0
  return {
    make: mk, model: mdl,
    full_wrap_sqft: fullSqft || null,
    full_wrap_with_roof_sqft: (fullSqft + roofSqft) || null,
    wrap_sqft: Number(m.wrap_sqft) || (fullSqft - roofSqft) || null,
    three_quarter_wrap_sqft: Number(m.three_quarter_wrap_sqft) || null,
    half_wrap_sqft: Number(m.half_wrap_sqft) || null,
    hood_sqft: Number(m.hood_sqft) || null,
    roof_sqft: roofSqft || null,
    driver_sqft: Number(m.driver_sqft) || null,
    passenger_sqft: Number(m.passenger_sqft) || null,
    back_sqft: Number(m.back_sqft) || null,
    side_sqft: Number(m.side_sqft) || null,
    linear_feet: Number(m.linear_feet) || null,
    doors_sqft: Number(m.doors_sqft) || null,
    install_hours: Number(m.install_hours) || null,
    install_pay: Number(m.install_pay) || null,
    category: (m.category as string) || null,
    suggested_price: Number(m.suggested_price) || null,
  }
}

const WASTE_OPTS = [5, 10, 15, 20] as const
const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CommercialVehicleCalc({ specs, onChange, canWrite }: Props) {
  const [vehicle, setVehicle]         = useState<VehicleRecord | null>(null)
  const [year, setYear]               = useState((specs.vehicleYear as string) || '')
  const [make, setMake]               = useState((specs.vehicleMake as string) || '')
  const [model, setModel]             = useState((specs.vehicleModel as string) || '')
  const [coverage, setCoverage]       = useState((specs.wrapType as string) || 'full')
  const [material, setMaterial]       = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [waste, setWaste]             = useState((specs.wasteBuffer as number) || 10)
  const [designFee, setDesignFee]     = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [installerPay, setInstallerPay]       = useState((specs.installerPay as number) || 0)
  const [installHours, setInstallHours]       = useState((specs.estimatedHours as number) || 0)
  const [salePrice, setSalePrice]             = useState((specs.unitPriceSaved as number) || 0)
  const [installOverride, setInstallOverride] = useState(!!(specs.installOverride as boolean))
  const [gpmTarget, setGpmTarget]             = useState((specs.gpmTarget as number) || 75)
  const [matTooltipOpen, setMatTooltipOpen]   = useState(false)
  const matTooltipRef = useRef<HTMLDivElement>(null)

  const [includeRoof, setIncludeRoof] = useState(!!(specs.includeRoof as boolean))
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
            const v = parseVehicleRecord(mk, mdl, d.measurement as Record<string, unknown>)
            setVehicle(v)
            if (!installOverride) {
              // Use DB install values; fall back to formula
              if (v.install_pay) {
                setInstallerPay(v.install_pay)
                setInstallHours(v.install_hours || 0)
              } else if (v.full_wrap_sqft) {
                const inst = calculateInstallPay(v.full_wrap_sqft)
                setInstallerPay(inst.pay)
                setInstallHours(inst.hours)
              }
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
      const v = parseVehicleRecord(result.make, result.model, result.measurement)
      setVehicle(v)
      if (!installOverride) {
        // Use DB install values; fall back to formula
        if (v.install_pay) {
          setInstallerPay(v.install_pay)
          setInstallHours(v.install_hours || 0)
        } else if (v.full_wrap_sqft) {
          const inst = calculateInstallPay(v.full_wrap_sqft)
          setInstallerPay(inst.pay)
          setInstallHours(inst.hours)
        }
      }
    } else if (!result.model) {
      setVehicle(null)
    }
  }

  const sqft = useMemo(() => {
    if (!vehicle) return 0
    return getCoverageSqft(vehicle, coverage, customZones, includeRoof)
  }, [vehicle, coverage, customZones, includeRoof])

  const matRate          = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel         = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material
  const sqftOrdered      = isInstallOnly ? 0 : Math.ceil(sqft * (1 + waste / 100))
  const linearFeetToOrder = sqftOrdered > 0 ? Math.ceil(sqftOrdered / 4.5) : 0
  const materialCost     = isInstallOnly ? 0 : sqftOrdered * matRate
  const effectiveDFee    = isInstallOnly ? 0 : designFee
  const cogs             = materialCost + installerPay + effectiveDFee
  const gpm              = calcGPMPct(salePrice, cogs)
  const gp               = salePrice - cogs
  const belowFloor       = salePrice > 0 && gpm < 65
  // Prefer DB install data, fall back to formula
  const wrapSqftForTier  = vehicle?.full_wrap_sqft || 0
  const formulaResult    = wrapSqftForTier > 0 ? calculateInstallPay(wrapSqftForTier) : null
  const dbInstall        = vehicle?.install_pay ? { pay: vehicle.install_pay, hours: vehicle.install_hours || 0 } : null
  const currentTierLabel = vehicle?.category || formulaResult?.tierLabel || '--'


  useEffect(() => {
    const covLabel = COVERAGE.find(c => c.key === coverage)?.label || coverage
    const roofLabel = includeRoof && coverage !== 'roof' && coverage !== 'custom' ? ' + Roof' : ''
    const nameParts = [year, make, model].filter(Boolean)
    onChange({
      name: nameParts.length ? `${nameParts.join(' ')} — ${covLabel}${roofLabel}` : undefined,
      unit_price: salePrice,
      specs: {
        vehicleYear: year, vehicleMake: make, vehicleModel: model,
        wrapType: covLabel + roofLabel, vinylType: matLabel,
        vinylArea: sqft, includeRoof,
        wasteBuffer: waste, materialCost,
        installerPay, estimatedHours: installHours, designFee: effectiveDFee,
        vinylMaterial: material,
        customZones: coverage === 'custom' ? customZones : undefined,
        productLineType: isInstallOnly ? 'install_only' : 'commercial_vehicle',
        installTierLabel: currentTierLabel,
        installOverride,
        gpmTarget, isInstallOnly,
        unitPriceSaved: salePrice,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, installHours, effectiveDFee,
      year, make, model, coverage, material, waste, customZones, currentTierLabel, gpmTarget, installOverride, includeRoof])

  const toggleZone = (zone: string) =>
    setCustomZones(prev => ({ ...prev, [zone]: !prev[zone] }))

  const applyFormula = () => {
    if (!canWrite) return
    const src = dbInstall || formulaResult
    if (!src) return
    setInstallerPay(src.pay)
    setInstallHours(src.hours)
    setInstallOverride(false)
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

      {/* Coverage */}
      <div style={{ marginBottom: 8 }}>
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

      {/* Body panel breakdown + Roof add-on */}
      {vehicle && coverage !== 'custom' && coverage !== 'install_only' && (
        <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Panel grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid var(--border)' }}>
            {getBodyPanels(vehicle).map((p, i) => (
              <div key={p.key} style={{
                padding: '4px 10px',
                borderRight: i < getBodyPanels(vehicle).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {p.label}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>
                  {p.sqft} <span style={{ fontSize: 8, color: 'var(--text3)' }}>sqft</span>
                </div>
              </div>
            ))}
            {/* Total body */}
            <div style={{ padding: '4px 10px', marginLeft: 'auto' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>
                Total
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: 'var(--cyan)' }}>
                {sqft} <span style={{ fontSize: 8, color: 'var(--text3)' }}>sqft</span>
              </div>
            </div>
          </div>
          {/* Roof add-on row */}
          {coverage !== 'roof' && (vehicle.roof_sqft || 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: includeRoof ? 'rgba(34,192,122,0.06)' : 'transparent' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: canWrite ? 'pointer' : 'default', fontSize: 11, color: includeRoof ? 'var(--green)' : 'var(--text2)', fontWeight: 700 }}>
                <input type="checkbox" checked={includeRoof} onChange={() => canWrite && setIncludeRoof(!includeRoof)} />
                + Roof
              </label>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: includeRoof ? 'var(--green)' : 'var(--text3)' }}>
                {vehicle.roof_sqft} sqft
              </span>
            </div>
          )}
        </div>
      )}

      {/* Compact info for install-only */}
      {vehicle && coverage === 'install_only' && (
        <div style={{ marginBottom: 6, padding: '4px 8px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, color: 'var(--text2)', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', fontWeight: 700 }}>{sqft} sqft</span>
          {(dbInstall || formulaResult) && <>
            <span>·</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>{currentTierLabel}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(dbInstall || formulaResult)!.hours}h · {fmtC((dbInstall || formulaResult)!.pay)}</span>
          </>}
        </div>
      )}

      {/* Custom zones (when custom coverage selected) */}
      {coverage === 'custom' && vehicle && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
          {[
            { key: 'hood',         label: `Hood (${vehicle.hood_sqft || 0} sqft)` },
            { key: 'driver_side',  label: `Driver (${vehicle.driver_sqft ?? Math.round((vehicle.side_sqft || 0) / 2)} sqft)` },
            { key: 'pass_side',    label: `Pass (${vehicle.passenger_sqft ?? Math.round((vehicle.side_sqft || 0) / 2)} sqft)` },
            { key: 'back',         label: `Back (${vehicle.back_sqft || 0} sqft)` },
            { key: 'doors',        label: `Doors (${vehicle.doors_sqft || 0} sqft)` },
            { key: 'roof',         label: `Roof (${vehicle.roof_sqft || 0} sqft)` },
            { key: 'front_bumper', label: 'Front Bumper (~est)' },
            { key: 'rear_bumper',  label: 'Rear Bumper (~est)' },
            { key: 'mirrors',      label: 'Mirrors (6 sqft)' },
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
        </div>
      )}


      {/* Pricing row: Sale Price + Install Pay + Design Fee */}
      <div style={{ display: 'grid', gridTemplateColumns: !isInstallOnly ? '1fr 1fr 1fr' : '1fr 1fr', gap: 5, marginBottom: 8 }}>
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

      {/* Below floor warning */}
      {belowFloor && (
        <div style={{ marginBottom: 8, padding: '6px 10px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', borderRadius: 7, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
          Below minimum — manager override required.
        </div>
      )}

      <OutputBar
        items={isInstallOnly ? [
          { label: 'Install', value: `${fmtC(installerPay)} (${installHours}h)`, color: 'var(--cyan)' },
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ] : [
          { label: 'Material', value: fmtC(materialCost) },
          { label: 'Install', value: `${fmtC(installerPay)} (${installHours}h)`, color: 'var(--cyan)' },
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ]}
        gpm={gpm}
        gp={gp}
        cogs={cogs}
        currentPrice={salePrice}
        onSetPrice={(p) => canWrite && setSalePrice(p)}
        canWrite={canWrite}
      />
    </div>
  )
}
