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
import { calculateInstallPay, calculateMarineInstallPay, calculateDeckingInstallPay } from '@/lib/estimator/vehicleDb'

type InstallCategory = 'commercial' | 'marine' | 'decking'

// ─── Vehicle measurement record from DB ─────────────────────────────────────
interface VehicleRecord {
  make: string
  model: string
  full_wrap_sqft: number | null
  full_wrap_with_roof_sqft: number | null
  wrap_sqft: number | null
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
  install_hours: number | null
  install_pay: number | null
  category: string | null
  suggested_price: number | null
}

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
  orgId: string
}

// ─── Body panels (excludes roof — roof is a separate add-on) ────────────────
const BODY_PANELS = [
  { key: 'hood',        label: 'Hood' },
  { key: 'driver_side', label: 'Driver Side' },
  { key: 'pass_side',   label: 'Pass Side' },
  { key: 'back',        label: 'Back / Rear' },
  { key: 'doors',       label: 'Doors' },
] as const

function getPanelSqft(v: VehicleRecord, key: string): number {
  switch (key) {
    case 'hood':        return v.hood_sqft || 0
    case 'driver_side': return v.driver_sqft || Math.round((v.side_sqft || 0) / 2)
    case 'pass_side':   return v.passenger_sqft || Math.round((v.side_sqft || 0) / 2)
    case 'back':        return v.back_sqft || 0
    case 'doors':       return v.doors_sqft || 0
    default:            return 0
  }
}

// ─── Coverage presets ───────────────────────────────────────────────────────
type Preset = 'full' | 'three_quarter' | 'half' | 'quarter' | 'spot' | 'install_only'

const PRESETS: { key: Preset; label: string; fraction: number; panels: string[] }[] = [
  { key: 'full',          label: 'Full Wrap',       fraction: 1.0,   panels: ['hood', 'driver_side', 'pass_side', 'back', 'doors'] },
  { key: 'three_quarter', label: '3/4 Wrap',        fraction: 0.75,  panels: ['hood', 'driver_side', 'pass_side', 'back'] },
  { key: 'half',          label: '1/2 Wrap',        fraction: 0.50,  panels: ['driver_side', 'pass_side'] },
  { key: 'quarter',       label: '1/4 Wrap',        fraction: 0.25,  panels: ['driver_side'] },
  { key: 'spot',          label: '1/8 Spot Graphics', fraction: 0.125, panels: [] },
  { key: 'install_only',  label: 'Install Only',    fraction: 1.0,   panels: ['hood', 'driver_side', 'pass_side', 'back', 'doors'] },
]

function presetSqft(v: VehicleRecord, preset: Preset): number {
  switch (preset) {
    case 'full':          return v.full_wrap_sqft || 0
    case 'three_quarter': return v.three_quarter_wrap_sqft || Math.round((v.full_wrap_sqft || 0) * 0.75)
    case 'half':          return v.half_wrap_sqft || Math.round((v.full_wrap_sqft || 0) * 0.50)
    case 'quarter':       return Math.round((v.full_wrap_sqft || 0) * 0.25)
    case 'spot':          return Math.round((v.full_wrap_sqft || 0) * 0.125)
    case 'install_only':  return v.full_wrap_sqft || 0
    default:              return 0
  }
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

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CommercialVehicleCalc({ specs, onChange, canWrite }: Props) {
  const [vehicle, setVehicle]         = useState<VehicleRecord | null>(null)
  const [year, setYear]               = useState((specs.vehicleYear as string) || '')
  const [make, setMake]               = useState((specs.vehicleMake as string) || '')
  const [model, setModel]             = useState((specs.vehicleModel as string) || '')

  // Coverage: preset or 'custom' when panels are manually toggled
  const [activePreset, setActivePreset] = useState<Preset | 'custom'>((specs.wrapType as Preset) || 'full')
  const [selectedPanels, setSelectedPanels] = useState<Record<string, boolean>>(() => {
    if (specs.selectedPanels) return specs.selectedPanels as Record<string, boolean>
    // Default: all body panels on (full wrap)
    return Object.fromEntries(BODY_PANELS.map(p => [p.key, true]))
  })
  const [includeRoof, setIncludeRoof] = useState(!!(specs.includeRoof as boolean))
  const [manualSqft, setManualSqft]   = useState<number>((specs.manualSqft as number) || 0)
  const [installCategory, setInstallCategory] = useState<InstallCategory>(
    (specs.installCategory as InstallCategory) || 'commercial'
  )

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

  const isInstallOnly = activePreset === 'install_only'
  const isCustom      = activePreset === 'custom'

  // ─── Apply a preset: set panels + sqft ──────────────────────────────────
  const applyPreset = (preset: Preset) => {
    if (!canWrite) return
    setActivePreset(preset)
    const def = PRESETS.find(p => p.key === preset)
    if (def) {
      const next: Record<string, boolean> = {}
      for (const p of BODY_PANELS) next[p.key] = def.panels.includes(p.key)
      setSelectedPanels(next)
    }
  }

  // ─── Toggle a single panel → goes to custom mode ───────────────────────
  const togglePanel = (key: string) => {
    if (!canWrite) return
    setActivePreset('custom')
    setSelectedPanels(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ─── Sqft calculation ──────────────────────────────────────────────────
  // Manual sqft always wins when > 0, even if a vehicle is selected
  const sqft = useMemo(() => {
    if (manualSqft > 0) return manualSqft

    if (!vehicle) return 0

    let base = 0
    if (isCustom) {
      // Sum selected panels
      for (const p of BODY_PANELS) {
        if (selectedPanels[p.key]) base += getPanelSqft(vehicle, p.key)
      }
    } else {
      // Use preset value from DB
      base = presetSqft(vehicle, activePreset as Preset)
    }

    // Add roof if toggled
    if (includeRoof) base += vehicle.roof_sqft || 0

    return Math.round(base)
  }, [vehicle, activePreset, selectedPanels, includeRoof, manualSqft, isCustom])

  // ─── Vehicle lookup on mount ───────────────────────────────────────────
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
            // Skip DB install pay if manual sqft is active or install is overridden
            if (!installOverride && !manualSqft) {
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

  // ─── Tooltip outside click ─────────────────────────────────────────────
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

  // ─── Vehicle select handler ────────────────────────────────────────────
  const handleVehicleSelect = (result: VehicleSelectResult) => {
    setYear(result.year)
    setMake(result.make)
    setModel(result.model)
    if (result.measurement) {
      const v = parseVehicleRecord(result.make, result.model, result.measurement)
      setVehicle(v)
      // Only reset category if no manual sqft active
      if (!manualSqft) setInstallCategory('commercial')
      // Skip DB install pay if manual sqft is active or install is overridden
      if (!installOverride && !manualSqft) {
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

  // ─── Derived values ────────────────────────────────────────────────────
  const matRate          = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel         = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material
  const sqftOrdered      = isInstallOnly ? 0 : Math.ceil(sqft * (1 + waste / 100))
  const materialCost     = isInstallOnly ? 0 : sqftOrdered * matRate
  const effectiveDFee    = isInstallOnly ? 0 : designFee
  const cogs             = materialCost + installerPay + effectiveDFee
  const gpm              = calcGPMPct(salePrice, cogs)
  const gp               = salePrice - cogs
  const belowFloor       = salePrice > 0 && gpm < 67

  // DB install or formula fallback
  const wrapSqftForTier  = vehicle?.full_wrap_sqft || 0
  const formulaResult    = wrapSqftForTier > 0 ? calculateInstallPay(wrapSqftForTier) : null
  const dbInstall        = vehicle?.install_pay ? { pay: vehicle.install_pay, hours: vehicle.install_hours || 0 } : null
  // Auto-calculate install pay when manual sqft is entered (overrides vehicle DB)
  const manualInstallResult = useMemo(() => {
    if (manualSqft <= 0) return null
    switch (installCategory) {
      case 'marine':     return calculateMarineInstallPay(manualSqft)
      case 'decking':    return calculateDeckingInstallPay(manualSqft)
      case 'commercial':
      default:           return calculateInstallPay(manualSqft)
    }
  }, [manualSqft, installCategory])

  const currentTierLabel = vehicle?.category || formulaResult?.tierLabel || manualInstallResult?.tierLabel || '--'

  // ─── onChange → parent ─────────────────────────────────────────────────
  useEffect(() => {
    const presetDef = PRESETS.find(p => p.key === activePreset)
    const covLabel  = presetDef?.label || 'Custom'
    const roofLabel = includeRoof ? ' + Roof' : ''
    const nameParts = [year, make, model].filter(Boolean)
    onChange({
      name: nameParts.length ? `${nameParts.join(' ')} — ${covLabel}${roofLabel}` : undefined,
      unit_price: salePrice,
      specs: {
        vehicleYear: year, vehicleMake: make, vehicleModel: model,
        wrapType: covLabel + roofLabel, vinylType: matLabel,
        vinylArea: sqft, includeRoof, selectedPanels, manualSqft,
        wasteBuffer: waste, materialCost,
        installerPay, estimatedHours: installHours, designFee: effectiveDFee,
        vinylMaterial: material,
        productLineType: isInstallOnly ? 'install_only' : 'commercial_vehicle',
        installTierLabel: currentTierLabel,
        installOverride, gpmTarget, isInstallOnly, installCategory,
        unitPriceSaved: salePrice,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, installHours, effectiveDFee,
      year, make, model, activePreset, material, waste, selectedPanels, currentTierLabel,
      gpmTarget, installOverride, includeRoof, manualSqft, installCategory])

  // Auto-apply manual sqft install calculation
  useEffect(() => {
    if (!manualInstallResult || installOverride) return
    setInstallerPay(manualInstallResult.pay)
    setInstallHours(manualInstallResult.hours)
  }, [manualInstallResult, installOverride])

  const applyDbInstall = () => {
    if (!canWrite) return
    const src = dbInstall || formulaResult || manualInstallResult
    if (!src) return
    setInstallerPay(src.pay)
    setInstallHours(src.hours)
    setInstallOverride(false)
  }

  // ─── Styles ────────────────────────────────────────────────────────────
  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  const panelBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 8px',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 7,
    background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
    cursor: canWrite ? 'pointer' : 'default',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
    opacity: active ? 1 : 0.5,
  })

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

      {/* Coverage presets */}
      <div style={{ marginBottom: 8 }}>
        <label style={calcFieldLabelCompact}>Coverage</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              style={pillBtnCompact(activePreset === p.key, p.key === 'install_only' ? 'var(--green)' : 'var(--accent)')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body panels — always visible when vehicle is selected */}
      {vehicle && !isInstallOnly && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ ...calcFieldLabelCompact, marginBottom: 0 }}>Body Panels</label>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: 'var(--cyan)' }}>
              {sqft} sqft
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4 }}>
            {BODY_PANELS.map(p => {
              const pSqft = getPanelSqft(vehicle, p.key)
              if (pSqft === 0) return null
              const active = !!selectedPanels[p.key]
              return (
                <button key={p.key} onClick={() => togglePanel(p.key)} style={panelBtn(active)}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: active ? 'var(--text1)' : 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text3)' }}>
                    {pSqft} sqft
                  </div>
                </button>
              )
            })}
          </div>

          {/* Roof add-on — separate from body panels */}
          {(vehicle.roof_sqft || 0) > 0 && (
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => canWrite && setIncludeRoof(!includeRoof)}
                style={{
                  ...panelBtn(includeRoof),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', borderColor: includeRoof ? 'var(--green)' : 'var(--border)',
                  background: includeRoof ? 'rgba(34,192,122,0.1)' : 'transparent',
                  opacity: 1,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: includeRoof ? 'var(--green)' : 'var(--text2)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  + Roof Add-On
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: includeRoof ? 'var(--green)' : 'var(--text3)' }}>
                  {vehicle.roof_sqft} sqft
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual sqft override — always available, overrides vehicle DB when filled */}
      {!isInstallOnly && (
        <div style={{ marginBottom: 8 }}>
          <label style={calcFieldLabelCompact}>Custom Sqft {manualSqft > 0 && vehicle ? '(overriding vehicle)' : ''}</label>
          <input type="number" value={manualSqft || ''} onChange={e => setManualSqft(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', width: 120 }}
            disabled={!canWrite} placeholder="Enter sqft" />

          {/* Install Category Selector — visible when manual sqft is entered */}
          {manualSqft > 0 && (
            <div style={{ marginTop: 6 }}>
              <label style={calcFieldLabelCompact}>Install Category</label>
              <div style={{ display: 'flex', gap: 3 }}>
                {([
                  { key: 'commercial' as const, label: 'Commercial', color: 'var(--accent)' },
                  { key: 'marine' as const,     label: 'Marine',     color: 'var(--cyan)' },
                  { key: 'decking' as const,    label: 'Decking',    color: 'var(--green)' },
                ]).map(cat => (
                  <button key={cat.key}
                    onClick={() => canWrite && setInstallCategory(cat.key)}
                    style={pillBtnCompact(installCategory === cat.key, cat.color)}>
                    {cat.label}
                  </button>
                ))}
              </div>
              {manualInstallResult && !installOverride && (
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text2)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>
                    {manualInstallResult.hours}h × ${manualInstallResult.hourlyRate}/hr = {fmtC(manualInstallResult.pay)}
                  </span>
                  <span style={{ marginLeft: 6, color: 'var(--text3)' }}>
                    ({installCategory === 'commercial' ? 'full rate' : '50% rate'})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Install-only compact info */}
      {vehicle && isInstallOnly && (
        <div style={{ marginBottom: 6, padding: '4px 8px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 10, color: 'var(--text2)', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', fontWeight: 700 }}>{sqft} sqft</span>
          {(dbInstall || formulaResult) && <>
            <span>·</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>{currentTierLabel}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(dbInstall || formulaResult)!.hours}h · {fmtC((dbInstall || formulaResult)!.pay)}</span>
          </>}
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
          <input type="number" value={installerPay || ''} onChange={e => { setInstallerPay(Number(e.target.value)); setInstallOverride(true) }}
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
