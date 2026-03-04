'use client'

import { useState, useMemo, useEffect } from 'react'
import { Truck } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, VINYL_MATERIALS, LAMINATE_RATE, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, calcSelect, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const SIDES = ['left', 'right', 'rear'] as const
type Side = typeof SIDES[number]

export default function BoxTruckCalc({ specs, onChange, canWrite }: Props) {
  const [boxLength, setBoxLength]   = useState((specs.boxLength as number) || 20)
  const [boxHeight, setBoxHeight]   = useState((specs.boxHeight as number) || 8)
  const [selectedSides, setSelectedSides] = useState<Set<Side>>(
    new Set((specs.selectedSides as Side[]) || ['left', 'right', 'rear'])
  )
  const [cabAddOn, setCabAddOn]     = useState(!!(specs.cabAddOn as boolean))
  const [material, setMaterial]     = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [laminate, setLaminate]     = useState(!!(specs.hasLaminate as boolean))
  const [designFee, setDesignFee]   = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]   = useState((specs.unitPriceSaved as number) || 0)

  const toggleSide = (s: Side) =>
    setSelectedSides(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })

  const matRate  = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material
  const laminateAdd = laminate ? LAMINATE_RATE : 0

  const sqft = useMemo(() => {
    let t = 0
    if (selectedSides.has('left'))  t += boxLength * boxHeight
    if (selectedSides.has('right')) t += boxLength * boxHeight
    if (selectedSides.has('rear'))  t += boxHeight * 8
    return Math.round(t)
  }, [boxLength, boxHeight, selectedSides])

  const waste = 10
  const sqftOrdered  = Math.ceil(sqft * 1.10)
  const materialCost = sqftOrdered * (matRate + laminateAdd)
  const installHours = Math.round((sqft / 15) * 10) / 10
  const installerPay = Math.round(installHours * 35)
  const cabRevenue   = cabAddOn ? 1950 : 0
  const cogs         = materialCost + installerPay + designFee
  const totalRevenue = salePrice + cabRevenue
  const gpm          = calcGPMPct(totalRevenue, cogs)
  const gp           = totalRevenue - cogs
  const auto73       = autoPrice(cogs) - cabRevenue

  useEffect(() => {
    onChange({
      name: `Box Truck Wrap — ${boxLength}ft`,
      unit_price: salePrice,
      specs: {
        boxLength, boxHeight, selectedSides: [...selectedSides],
        cabAddOn, vinylType: matLabel, vinylMaterial: material,
        hasLaminate: laminate, vinylArea: sqft, materialCost,
        installerPay, estimatedHours: installHours, designFee,
        wasteBuffer: waste, productLineType: 'box_truck', vehicleType: 'box_truck',
        unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, installHours, designFee,
      boxLength, boxHeight, cabAddOn, material, laminate, selectedSides])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  const sideLabel = (s: Side) => s === 'left' ? 'Left' : s === 'right' ? 'Right' : 'Rear'

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Truck size={12} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Box Truck Calculator
        </span>
      </div>

      {/* Dimensions + Sides on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Length (ft)</label>
          <input type="number" value={boxLength} onChange={e => setBoxLength(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Height (ft)</label>
          <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Sides</label>
          <div style={{ display: 'flex', gap: 3 }}>
            {SIDES.map(s => (
              <button key={s} onClick={() => toggleSide(s)}
                style={pillBtnCompact(selectedSides.has(s))}>
                {sideLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Material dropdown + Cab Add-On + Laminate on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Material</label>
          <select value={material} onChange={e => canWrite && setMaterial(e.target.value)} disabled={!canWrite}
            style={{ ...calcSelect, fontSize: 12 }}>
            {VINYL_MATERIALS.map(m => (
              <option key={m.key} value={m.key}>{m.label} — ${m.rate}/sqft</option>
            ))}
          </select>
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Cab</label>
          <button onClick={() => canWrite && setCabAddOn(!cabAddOn)}
            style={pillBtnCompact(cabAddOn, 'var(--amber)')}>
            {cabAddOn ? '+$1,950' : 'No Cab'}
          </button>
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Laminate</label>
          <button onClick={() => canWrite && setLaminate(!laminate)}
            style={pillBtnCompact(laminate, 'var(--green)')}>
            {laminate ? '+$0.60' : 'No Lam'}
          </button>
        </div>
      </div>

      {/* Price row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Design Fee</label>
          <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      <OutputBar
        items={[
          { label: 'Box Sqft', value: `${sqft} sqft` },
          { label: 'Ordered', value: `${sqftOrdered} sqft`, color: 'var(--cyan)' },
          { label: 'Mat Cost', value: fmtC(materialCost) },
          { label: 'Labor', value: fmtC(installerPay), color: 'var(--cyan)' },
          ...(cabAddOn ? [{ label: 'Cab Rev', value: `+${fmtC(1950)}`, color: 'var(--amber)' }] : []),
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ]}
        gpm={gpm}
        gp={gp}
        autoPrice={Math.round(auto73)}
        onApplyAutoPrice={() => setSalePrice(Math.round(auto73))}
        canWrite={canWrite}
      />
    </div>
  )
}
