'use client'

import { useState, useEffect, useMemo } from 'react'
import { Zap, Car } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, PricingRule, VINYL_MATERIALS, LAMINATE_RATE, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, calcSelect, pillBtn, outputRow, outputVal,
} from './types'

interface VehicleRecord {
  year: number; make: string; model: string
  sqft_full: number; sqft_partial: number; sqft_hood: number
  sqft_roof: number; sqft_sides: number; sqft_doors: number
}

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
  orgId: string
}

const COVERAGE = [
  { key: 'full',          label: 'Full Wrap',    pct: 1.00, sqftFn: (v: VehicleRecord) => v.sqft_full },
  { key: 'three_quarter', label: '3/4 Wrap',     pct: 0.75, sqftFn: (v: VehicleRecord) => Math.round(v.sqft_full * 0.75) },
  { key: 'half',          label: 'Half Wrap',    pct: 0.50, sqftFn: (v: VehicleRecord) => Math.round(v.sqft_full * 0.50) },
  { key: 'hood',          label: 'Hood Only',    pct: 0,    sqftFn: (v: VehicleRecord) => v.sqft_hood },
  { key: 'roof',          label: 'Roof Only',    pct: 0,    sqftFn: (v: VehicleRecord) => v.sqft_roof },
  { key: 'custom',        label: 'Custom Zones', pct: 0,    sqftFn: () => 0 },
]

const WASTE_OPTS = [5, 10, 15, 20] as const

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function CommercialVehicleCalc({ specs, onChange, canWrite, orgId }: Props) {
  const supabase = createClient()

  const [years, setYears] = useState<number[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null)
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])

  const [year, setYear]         = useState((specs.vehicleYear as string) || '')
  const [make, setMake]         = useState((specs.vehicleMake as string) || '')
  const [model, setModel]       = useState((specs.vehicleModel as string) || '')
  const [coverage, setCoverage] = useState((specs.wrapType as string) || 'full')
  const [material, setMaterial] = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [laminate, setLaminate] = useState(!!(specs.hasLaminate as boolean))
  const [waste, setWaste]       = useState((specs.wasteBuffer as number) || 10)
  const [designFee, setDesignFee] = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [installerPay, setInstallerPay] = useState((specs.installerPay as number) || 0)
  const [installHours, setInstallHours] = useState((specs.estimatedHours as number) || 0)
  const [salePrice, setSalePrice] = useState((specs.unitPriceSaved as number) || 0)

  const [customZones, setCustomZones] = useState<Record<string, boolean>>(
    (specs.customZones as Record<string, boolean>) || {}
  )

  // Fetch years on mount
  useEffect(() => {
    supabase.from('vehicle_database').select('year').eq('org_id', orgId)
      .then(({ data }) => {
        if (data) setYears([...new Set(data.map(r => r.year as number))].sort((a, b) => b - a))
      })
    supabase.from('pricing_rules').select('id,name,applies_to,conditions,value')
      .eq('org_id', orgId).eq('applies_to', 'commercial').eq('active', true)
      .then(({ data }) => { if (data) setPricingRules(data as PricingRule[]) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    if (!year) { setMakes([]); setModels([]); return }
    supabase.from('vehicle_database').select('make').eq('org_id', orgId).eq('year', Number(year))
      .then(({ data }) => {
        if (data) setMakes([...new Set(data.map(r => r.make as string))].sort())
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, orgId])

  useEffect(() => {
    if (!year || !make) { setModels([]); return }
    supabase.from('vehicle_database').select('model').eq('org_id', orgId)
      .eq('year', Number(year)).eq('make', make)
      .then(({ data }) => {
        if (data) setModels([...new Set(data.map(r => r.model as string))].sort())
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, make, orgId])

  useEffect(() => {
    if (!year || !make || !model) { setVehicle(null); return }
    supabase.from('vehicle_database').select('*')
      .eq('org_id', orgId).eq('year', Number(year)).eq('make', make).eq('model', model)
      .limit(1).single()
      .then(({ data }) => { if (data) setVehicle(data as VehicleRecord) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, make, model, orgId])

  // Compute sqft
  const sqft = useMemo(() => {
    if (!vehicle) return 0
    if (coverage === 'custom') {
      let t = 0
      const sides2 = (vehicle.sqft_sides || 0) / 2
      if (customZones.hood)         t += vehicle.sqft_hood || 0
      if (customZones.roof)         t += vehicle.sqft_roof || 0
      if (customZones.driver_side)  t += sides2
      if (customZones.pass_side)    t += sides2
      if (customZones.front_bumper) t += Math.round(vehicle.sqft_full * 0.05)
      if (customZones.rear_bumper)  t += Math.round(vehicle.sqft_full * 0.05)
      if (customZones.mirrors)      t += 6
      if (customZones.doors)        t += vehicle.sqft_doors || 0
      return Math.round(t)
    }
    const cov = COVERAGE.find(c => c.key === coverage)
    return cov ? cov.sqftFn(vehicle) : vehicle.sqft_full
  }, [vehicle, coverage, customZones])

  const matRate  = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material
  const laminateAdd = laminate ? LAMINATE_RATE : 0
  const sqftOrdered = Math.ceil(sqft * (1 + waste / 100))
  const materialCost = sqftOrdered * (matRate + laminateAdd)
  const cogs = materialCost + installerPay + designFee
  const gpm = calcGPMPct(salePrice, cogs)
  const gp = salePrice - cogs
  const auto73 = autoPrice(cogs)

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
        installerPay, estimatedHours: installHours, designFee,
        vinylMaterial: material,
        customZones: coverage === 'custom' ? customZones : undefined,
        productLineType: 'commercial_vehicle',
        vehicleType: 'med_car',
        unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, installHours, designFee,
      year, make, model, coverage, material, laminate, waste, customZones])

  const toggleZone = (zone: string) =>
    setCustomZones(prev => ({ ...prev, [zone]: !prev[zone] }))

  const gadget: React.CSSProperties = {
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Car size={13} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Commercial Vehicle Calculator
        </span>
      </div>

      {/* Step 1 — Vehicle Lookup */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 1 — Vehicle
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={calcFieldLabel}>Year</label>
            <select value={year} onChange={e => { setYear(e.target.value); setMake(''); setModel('') }} style={calcSelect} disabled={!canWrite}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={calcFieldLabel}>Make</label>
            <select value={make} onChange={e => { setMake(e.target.value); setModel('') }} style={calcSelect} disabled={!canWrite || !year}>
              <option value="">Make</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={calcFieldLabel}>Model</label>
            <select value={model} onChange={e => setModel(e.target.value)} style={calcSelect} disabled={!canWrite || !make}>
              <option value="">Model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {vehicle && (
          <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: 'var(--text2)' }}>
            <span>Full: <b style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.sqft_full}</b> sqft</span>
            <span>Partial: <b style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.sqft_partial}</b></span>
            <span>Hood: <b style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.sqft_hood}</b></span>
            <span>Roof: <b style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{vehicle.sqft_roof}</b></span>
          </div>
        )}
      </div>

      {/* Step 2 — Coverage */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 2 — Coverage
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COVERAGE.map(c => (
            <button key={c.key} onClick={() => canWrite && setCoverage(c.key)}
              style={pillBtn(coverage === c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        {coverage === 'custom' && vehicle && (
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { key: 'hood',         label: `Hood (${vehicle.sqft_hood} sqft)` },
              { key: 'roof',         label: `Roof (${vehicle.sqft_roof} sqft)` },
              { key: 'driver_side',  label: `Driver Side (~${Math.round((vehicle.sqft_sides||0)/2)} sqft)` },
              { key: 'pass_side',    label: `Pass Side (~${Math.round((vehicle.sqft_sides||0)/2)} sqft)` },
              { key: 'front_bumper', label: 'Front Bumper (~est)' },
              { key: 'rear_bumper',  label: 'Rear Bumper (~est)' },
              { key: 'mirrors',      label: 'Mirrors (6 sqft)' },
              { key: 'doors',        label: `Doors (${vehicle.sqft_doors} sqft)` },
            ].map(z => (
              <label key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', fontSize: 12, color: customZones[z.key] ? 'var(--text1)' : 'var(--text2)' }}>
                <input type="checkbox" checked={!!customZones[z.key]} onChange={() => canWrite && toggleZone(z.key)} />
                {z.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 3 — Material */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 3 — Material
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
          {VINYL_MATERIALS.map(m => (
            <button key={m.key} onClick={() => canWrite && setMaterial(m.key)}
              style={{ ...pillBtn(material === m.key), textAlign: 'left', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
              <div>{m.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: material === m.key ? 'var(--accent)' : 'var(--text3)', marginTop: 2 }}>${m.rate}/sqft</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 4 — Laminate */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 4 — Laminate
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => canWrite && setLaminate(true)} style={pillBtn(laminate, 'var(--green)')}>Yes +$0.60/sqft</button>
          <button onClick={() => canWrite && setLaminate(false)} style={pillBtn(!laminate)}>No Laminate</button>
        </div>
      </div>

      {/* Step 5 — Waste Buffer */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Step 5 — Waste
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {WASTE_OPTS.map(w => (
            <button key={w} onClick={() => canWrite && setWaste(w)} style={{ ...pillBtn(waste === w, 'var(--amber)'), padding: '4px 10px', borderRadius: 6 }}>
              {w}%
            </button>
          ))}
        </div>
      </div>

      {/* Step 6 — Flat Rate Quick-Select */}
      {pricingRules.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Step 6 — Install Flat Rate
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 5 }}>
            {pricingRules.map(rule => {
              const selected = installerPay === rule.conditions.installer_pay
              return (
                <button key={rule.id}
                  onClick={() => {
                    if (!canWrite) return
                    setInstallerPay(rule.conditions.installer_pay || 0)
                    setInstallHours(rule.conditions.install_hours || 0)
                    setSalePrice(rule.value)
                  }}
                  style={{
                    padding: '7px 8px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default',
                    border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selected ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
                    textAlign: 'center',
                  }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text2)', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {rule.conditions.label || rule.name}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: selected ? 'var(--accent)' : 'var(--text1)', marginTop: 2 }}>
                    ${rule.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{rule.conditions.install_hours}h</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Manual Price Override */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div>
          <label style={calcFieldLabel}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabel}>Install Pay</label>
          <input type="number" value={installerPay || ''} onChange={e => setInstallerPay(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabel}>Design Fee</label>
          <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      {/* Outputs */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Live Outputs
        </div>
        {[
          ['Sqft (Coverage)', `${sqft} sqft`],
          ['Material to Order', `${sqftOrdered} sqft (+${waste}% waste)`],
          ['Material Cost', fmtC(materialCost)],
          ['Install Hours', `${installHours}h`],
          ['Installer Pay', fmtC(installerPay)],
          ['Design Fee', fmtC(designFee)],
          ['COGS', fmtC(cogs)],
        ].map(([label, val]) => (
          <div key={String(label)} style={outputRow}>
            <span>{label}</span>
            <span style={outputVal}>{val}</span>
          </div>
        ))}
        <div style={{ ...outputRow, borderBottom: 'none', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text1)' }}>GPM</span>
          <span style={{ ...outputVal, fontSize: 14, color: gpmColor(gpm) }}>
            {gpm.toFixed(1)}%  ({fmtC(gp)} GP)
          </span>
        </div>

        <button
          onClick={() => { if (canWrite) { setSalePrice(Math.round(auto73)) } }}
          style={{
            marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'not-allowed',
            background: 'linear-gradient(135deg, rgba(34,192,122,0.15) 0%, rgba(79,127,255,0.15) 100%)',
            border: '1px solid rgba(34,192,122,0.3)',
            color: 'var(--green)', fontSize: 11, fontWeight: 700,
            fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <Zap size={12} /> Hit 73% GPM → Set Price to {fmtC(auto73)}
        </button>
      </div>
    </div>
  )
}
