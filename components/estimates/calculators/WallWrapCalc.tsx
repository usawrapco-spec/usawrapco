'use client'

import { useState, useMemo, useEffect } from 'react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const WALL_MATERIALS = [
  { key: 'standard', label: 'Standard', rate: 1.50 },
  { key: 'premium',  label: 'Premium',  rate: 2.20 },
  { key: 'fabric',   label: 'Fabric',   rate: 3.00 },
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
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 10 }}>
        Wall Wrap Calculator
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Width (ft)</label>
          <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Height (ft)</label>
          <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Walls</label>
          <input type="number" value={numWalls} onChange={e => setNumWalls(Math.max(1, Number(e.target.value)))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
      </div>

      {/* Deduct + Material on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'start', marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={calcFieldLabelCompact}>Deduct Windows</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: canWrite ? 'pointer' : 'default', fontSize: 11, color: 'var(--text2)' }}>
              <input type="checkbox" checked={deduct} onChange={() => canWrite && setDeduct(!deduct)} />
              Deduct
            </label>
            {deduct && (
              <input type="number" value={deductSqft} onChange={e => setDeductSqft(Number(e.target.value))}
                style={{ ...calcInputCompact, width: 70, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={0} placeholder="sqft" />
            )}
          </div>
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Material</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {WALL_MATERIALS.map(m => (
              <button key={m.key} onClick={() => canWrite && setMaterial(m.key)}
                style={{ ...pillBtnCompact(material === m.key, 'var(--purple)'), flex: 1, textAlign: 'center' as const }}>
                {m.label} <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}>${m.rate}</span>
              </button>
            ))}
          </div>
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
          { label: 'Net Sqft', value: `${sqft} sqft` },
          { label: 'Ordered', value: `${sqftOrdered} sqft`, color: 'var(--cyan)' },
          { label: 'Mat Cost', value: fmtC(materialCost) },
          { label: 'Labor', value: fmtC(installerPay), color: 'var(--cyan)' },
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
