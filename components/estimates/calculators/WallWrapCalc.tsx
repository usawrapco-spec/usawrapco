'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, pillBtn, outputRow, outputVal,
} from './types'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const WALL_MATERIALS = [
  { key: 'standard', label: 'Standard Vinyl', rate: 1.50 },
  { key: 'premium',  label: 'Premium Vinyl',  rate: 2.20 },
  { key: 'fabric',   label: 'Fabric Wall',    rate: 3.00 },
]

export default function WallWrapCalc({ specs, onChange, canWrite }: Props) {
  const [width, setWidth]           = useState((specs.wallWidth as number) || 12)
  const [height, setHeight]         = useState((specs.wallHeight as number) || 9)
  const [numWalls, setNumWalls]     = useState((specs.numWalls as number) || 1)
  const [deduct, setDeduct]         = useState(!!(specs.deductWindows as boolean))
  const [deductSqft, setDeductSqft] = useState((specs.deductionSqft as number) || 0)
  const [material, setMaterial]     = useState((specs.wallMaterial as string) || 'standard')
  const [designFee, setDesignFee]   = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]   = useState((specs.unitPriceSaved as number) || 0)

  const matRate  = WALL_MATERIALS.find(m => m.key === material)?.rate ?? 1.50
  const matLabel = WALL_MATERIALS.find(m => m.key === material)?.label ?? material

  const sqft = useMemo(() => {
    const raw = width * height * numWalls
    return Math.max(0, raw - (deduct ? deductSqft : 0))
  }, [width, height, numWalls, deduct, deductSqft])

  const sqftOrdered  = Math.ceil(sqft * 1.10)
  const materialCost = sqftOrdered * matRate
  const installHours = Math.round((sqft / 20) * 10) / 10
  const installerPay = Math.round(installHours * 35)
  const cogs         = materialCost + installerPay + designFee
  const gpm          = calcGPMPct(salePrice, cogs)
  const gp           = salePrice - cogs
  const auto73       = autoPrice(cogs)

  useEffect(() => {
    onChange({
      name: `Wall Wrap — ${width}×${height}ft × ${numWalls} wall${numWalls > 1 ? 's' : ''}`,
      unit_price: salePrice,
      specs: {
        wallWidth: width, wallHeight: height, numWalls, deductWindows: deduct,
        deductionSqft: deductSqft, wallMaterial: material, vinylType: matLabel,
        vinylArea: sqft, materialCost, installerPay, estimatedHours: installHours,
        designFee, productLineType: 'wall_wrap', vehicleType: 'custom', unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, designFee,
      width, height, numWalls, deduct, deductSqft, material])

  const gadget: React.CSSProperties = {
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 14 }}>
        Wall Wrap Calculator
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={calcFieldLabel}>Width (ft)</label>
          <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabel}>Height (ft)</label>
          <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabel}>Number of Walls</label>
          <input type="number" value={numWalls} onChange={e => setNumWalls(Math.max(1, Number(e.target.value)))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
      </div>

      {/* Deduct Windows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canWrite ? 'pointer' : 'default', fontSize: 12, color: 'var(--text2)' }}>
          <input type="checkbox" checked={deduct} onChange={() => canWrite && setDeduct(!deduct)} />
          Deduct windows/doors
        </label>
        {deduct && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...calcFieldLabel, marginBottom: 0 }}>Deduction (sqft)</label>
            <input type="number" value={deductSqft} onChange={e => setDeductSqft(Number(e.target.value))}
              style={{ ...calcInput, width: 90, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={0} />
          </div>
        )}
      </div>

      {/* Material */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Material</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {WALL_MATERIALS.map(m => (
            <button key={m.key} onClick={() => canWrite && setMaterial(m.key)}
              style={{ ...pillBtn(material === m.key, 'var(--purple)'), flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11 }}>{m.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, marginTop: 2 }}>${m.rate}/sqft</div>
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
          ['Net Sqft', `${sqft} sqft`],
          ['Material to Order', `${sqftOrdered} sqft`],
          ['Material Cost', fmtC(materialCost)],
          ['Install Hours', `${installHours}h`],
          ['Installer Pay', fmtC(installerPay)],
          ['Design Fee', fmtC(designFee)],
          ['COGS', fmtC(cogs)],
        ].map(([l, v]) => (
          <div key={String(l)} style={outputRow}><span>{l}</span><span style={outputVal}>{v}</span></div>
        ))}
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
