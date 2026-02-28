'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap, Anchor } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, VINYL_MATERIALS, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, pillBtn, outputRow, outputVal,
} from './types'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const PASS_OPTS = [1, 2, 3] as const
const WIDTH_OPTS = [54, 60, 76] as const

export default function MarineCalc({ specs, onChange, canWrite }: Props) {
  const [hullLength, setHullLength]   = useState((specs.hullLength as number) || 24)
  const [hullHeight, setHullHeight]   = useState((specs.hullHeight as number) || 3)
  const [numPasses, setNumPasses]     = useState<1|2|3>((specs.numPasses as 1|2|3) || 2)
  const [transom, setTransom]         = useState(!!(specs.includeTransom as boolean))
  const [prepWork, setPrepWork]       = useState(!!(specs.prepWork as boolean))
  const [prepHours, setPrepHours]     = useState((specs.prepHours as number) || 0)
  const [matWidth, setMatWidth]       = useState<54|60|76>((specs.materialWidth as 54|60|76) || 60)
  const [material, setMaterial]       = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [designFee, setDesignFee]     = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]     = useState((specs.unitPriceSaved as number) || 0)

  const matRate  = VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10
  const matLabel = VINYL_MATERIALS.find(m => m.key === material)?.label ?? material

  const sqft = useMemo(() => {
    const linFt  = hullLength * numPasses
    const widthFt = matWidth / 12
    const perSide = linFt * widthFt
    const total   = perSide * 2  // both sides
    const transomSqft = transom ? (hullHeight * (hullLength * 0.12)) : 0  // rough transom estimate
    return Math.round(total + transomSqft)
  }, [hullLength, numPasses, matWidth, hullHeight, transom])

  const sqftOrdered  = Math.ceil(sqft * 1.20)  // 20% waste fixed for marine
  const materialCost = sqftOrdered * matRate
  const installHours = Math.round((sqft / 10) * 10) / 10
  const installerPay = Math.round(installHours * 45)
  const prepCost     = prepWork ? prepHours * 45 : 0
  const cogs         = materialCost + installerPay + prepCost + designFee
  const gpm          = calcGPMPct(salePrice, cogs)
  const gp           = salePrice - cogs
  const auto73       = autoPrice(cogs)

  useEffect(() => {
    onChange({
      name: `Marine Hull Wrap — ${hullLength}ft`,
      unit_price: salePrice,
      specs: {
        hullLength, hullHeight, numPasses, includeTransom: transom,
        prepWork, prepHours, materialWidth: matWidth,
        vinylType: matLabel, vinylMaterial: material, vinylArea: sqft,
        materialCost, installerPay, estimatedHours: installHours + (prepWork ? prepHours : 0),
        designFee, productLineType: 'marine', vehicleType: 'marine', unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, designFee,
      hullLength, hullHeight, numPasses, transom, prepWork, prepHours, matWidth, material])

  const gadget: React.CSSProperties = {
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Anchor size={13} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Marine Hull Wrap Calculator
        </span>
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={calcFieldLabel}>Hull Length (ft)</label>
          <input type="number" value={hullLength} onChange={e => setHullLength(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabel}>Hull Height (ft)</label>
          <input type="number" value={hullHeight} onChange={e => setHullHeight(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step="0.5" />
        </div>
      </div>

      {/* Passes */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Number of Passes</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {PASS_OPTS.map(p => (
            <button key={p} onClick={() => canWrite && setNumPasses(p)}
              style={{ ...pillBtn(numPasses === p), flex: 1 }}>
              {p} {p === 1 ? 'Pass' : 'Passes'}
            </button>
          ))}
        </div>
      </div>

      {/* Transom + Prep */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', fontSize: 12, color: 'var(--text2)' }}>
          <input type="checkbox" checked={transom} onChange={() => canWrite && setTransom(!transom)} />
          Include Transom
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', fontSize: 12, color: 'var(--text2)' }}>
          <input type="checkbox" checked={prepWork} onChange={() => canWrite && setPrepWork(!prepWork)} />
          Prep Work
        </label>
        {prepWork && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...calcFieldLabel, marginBottom: 0 }}>Prep Hours</label>
            <input type="number" value={prepHours} onChange={e => setPrepHours(Number(e.target.value))}
              style={{ ...calcInput, width: 80, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={0} />
          </div>
        )}
      </div>

      {/* Material Width */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Material Width</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {WIDTH_OPTS.map(w => (
            <button key={w} onClick={() => canWrite && setMatWidth(w)}
              style={{ ...pillBtn(matWidth === w), flex: 1 }}>
              {w}&quot;
            </button>
          ))}
        </div>
      </div>

      {/* Material */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Material</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 5 }}>
          {VINYL_MATERIALS.map(m => (
            <button key={m.key} onClick={() => canWrite && setMaterial(m.key)}
              style={{ ...pillBtn(material === m.key), textAlign: 'left', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
              <div>{m.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: material === m.key ? 'var(--cyan)' : 'var(--text3)', marginTop: 2 }}>${m.rate}/sqft</div>
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
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
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Live Outputs</div>
        {[
          ['Sqft', `${sqft} sqft`],
          ['Material to Order', `${sqftOrdered} sqft (20% marine waste)`],
          ['Material Cost', fmtC(materialCost)],
          ['Install Hours', `${installHours}h @ $45/hr`],
          ['Installer Pay', fmtC(installerPay)],
          prepWork && ['Prep Cost', fmtC(prepCost) + ` (${prepHours}h @ $45/hr)`],
          ['Design Fee', fmtC(designFee)],
          ['COGS', fmtC(cogs)],
        ].filter(Boolean).map((row) => {
          const [l, v] = row as string[]
          return <div key={l} style={outputRow}><span>{l}</span><span style={outputVal}>{v}</span></div>
        })}
        <div style={{ ...outputRow, borderBottom: 'none', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text1)' }}>GPM</span>
          <span style={{ ...outputVal, fontSize: 14, color: gpmColor(gpm) }}>{gpm.toFixed(1)}% ({fmtC(gp)} GP)</span>
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
