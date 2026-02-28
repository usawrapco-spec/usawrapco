'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap, Truck } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, VINYL_MATERIALS, LAMINATE_RATE, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, pillBtn, outputRow, outputVal,
} from './types'

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
    if (selectedSides.has('rear'))  t += boxHeight * 8 // standard door width ≈ box height
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
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Truck size={13} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Box Truck Calculator
        </span>
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={calcFieldLabel}>Box Length (ft)</label>
          <input type="number" value={boxLength} onChange={e => setBoxLength(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabel}>Box Height (ft)</label>
          <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
      </div>

      {/* Side Selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Sides to Wrap</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {SIDES.map(s => (
            <button key={s} onClick={() => canWrite && toggleSide(s)}
              style={{ ...pillBtn(selectedSides.has(s)), textTransform: 'uppercase', flex: 1 }}>
              {s === 'left' ? 'Left' : s === 'right' ? 'Right' : 'Rear Door'}
            </button>
          ))}
        </div>
      </div>

      {/* Cab Add-On */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <label style={{ ...calcFieldLabel, marginBottom: 0 }}>Cab Add-On</label>
        <button onClick={() => canWrite && setCabAddOn(!cabAddOn)}
          style={pillBtn(cabAddOn, 'var(--amber)')}>
          {cabAddOn ? 'Yes +$1,950 revenue' : 'No'}
        </button>
      </div>

      {/* Material */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Material</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 5 }}>
          {VINYL_MATERIALS.map(m => (
            <button key={m.key} onClick={() => canWrite && setMaterial(m.key)}
              style={{ ...pillBtn(material === m.key), textAlign: 'left', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
              <div>{m.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: material === m.key ? 'var(--accent)' : 'var(--text3)', marginTop: 2 }}>${m.rate}/sqft</div>
            </button>
          ))}
        </div>
      </div>

      {/* Laminate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <label style={{ ...calcFieldLabel, marginBottom: 0 }}>Laminate</label>
        <button onClick={() => canWrite && setLaminate(true)} style={pillBtn(laminate, 'var(--green)')}>Yes +$0.60/sqft</button>
        <button onClick={() => canWrite && setLaminate(false)} style={pillBtn(!laminate)}>No</button>
      </div>

      {/* Sale Price + Design Fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div>
          <label style={calcFieldLabel}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
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
          ['Sqft (Box)', `${sqft} sqft`],
          ['Material to Order', `${sqftOrdered} sqft`],
          ['Material Cost', fmtC(materialCost)],
          ['Install Hours', `${installHours}h`],
          ['Installer Pay', fmtC(installerPay)],
          ['Design Fee', fmtC(designFee)],
          cabAddOn && ['Cab Add-On Revenue', `+${fmtC(1950)}`],
          ['COGS', fmtC(cogs)],
        ].filter(Boolean).map((row) => {
          const [label, val] = row as string[]
          return (
            <div key={String(label)} style={outputRow}>
              <span>{label}</span><span style={outputVal}>{val}</span>
            </div>
          )
        })}
        <div style={{ ...outputRow, borderBottom: 'none', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text1)' }}>GPM</span>
          <span style={{ ...outputVal, fontSize: 14, color: gpmColor(gpm) }}>{gpm.toFixed(1)}%  ({fmtC(gp)} GP)</span>
        </div>
        <button onClick={() => canWrite && setSalePrice(Math.round(auto73))}
          style={{
            marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'not-allowed',
            background: 'linear-gradient(135deg, rgba(34,192,122,0.15) 0%, rgba(79,127,255,0.15) 100%)',
            border: '1px solid rgba(34,192,122,0.3)', color: 'var(--green)',
            fontSize: 11, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
          <Zap size={12} /> Hit 73% GPM → Set Price to {fmtC(auto73)}
        </button>
      </div>
    </div>
  )
}
