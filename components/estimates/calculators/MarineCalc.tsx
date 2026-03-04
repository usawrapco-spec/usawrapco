'use client'

import { useState, useMemo, useEffect } from 'react'
import { Anchor } from 'lucide-react'
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

// Material types: maxInches = max hull height the material width can cover without 2 passes
const MARINE_MATS = [
  { key: 'printed', label: 'Avery 1105 Printed (53")', maxInches: 26, widthFt: 4.42, defaultRate: 28.35 },
  { key: 'ppf',     label: 'PPF / Color Change (60")',  maxInches: 28, widthFt: 5.00, defaultRate: 65.00 },
] as const

export default function MarineCalc({ specs, onChange, canWrite }: Props) {
  const [hullLength, setHullLength]   = useState((specs.hullLength as number) || 24)
  const [hullHeightFt, setHullHeightFt] = useState((specs.hullHeightFt as number) || 1)
  const [hullHeightIn, setHullHeightIn] = useState((specs.hullHeightIn as number) || 8)
  const [beamWidth, setBeamWidth]     = useState((specs.beamWidth as number) || 8)
  const [matType, setMatType]         = useState((specs.marineMatType as string) || 'printed')
  const [transom, setTransom]         = useState(!!(specs.includeTransom as boolean))
  const [prepWork, setPrepWork]       = useState(!!(specs.prepWork as boolean))
  const [prepHours, setPrepHours]     = useState((specs.prepHours as number) || 0)
  const [linftRate, setLinftRate]     = useState((specs.linftRate as number) || MARINE_MATS[0].defaultRate)
  const [designFee, setDesignFee]     = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]     = useState((specs.unitPriceSaved as number) || 0)

  const mat = MARINE_MATS.find(m => m.key === matType) ?? MARINE_MATS[0]

  // When mat type changes, update default rate if user hasn't overridden
  useEffect(() => {
    setLinftRate(mat.defaultRate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matType])

  const hullHeightTotalInches = hullHeightFt * 12 + hullHeightIn
  const hullHeightTotalFt     = hullHeightFt + hullHeightIn / 12
  const passes                = hullHeightTotalInches > mat.maxInches ? 2 : 1

  // Linear feet formula: vinyl ordered in 3ft roll increments
  const calc = useMemo(() => {
    const rawSides  = Math.ceil((hullLength + 1) / 3) * 3 * passes * 2
    const rawTransom = transom ? Math.ceil((beamWidth + 1) / 3) * 3 : 0
    const raw        = rawSides + rawTransom
    const linftToOrder = Math.ceil(raw * 1.20)  // 20% waste buffer
    const netSqft    = Math.round(hullLength * hullHeightTotalFt * 2 + (transom ? beamWidth * hullHeightTotalFt : 0))
    return { rawSides, rawTransom, raw, linftToOrder, netSqft }
  }, [hullLength, passes, transom, beamWidth, hullHeightTotalFt])

  const materialCost = calc.linftToOrder * linftRate
  const installHours = Math.round((calc.netSqft / 10) * 10) / 10
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
        hullLength, hullHeightFt, hullHeightIn, beamWidth,
        marineMatType: matType, includeTransom: transom,
        numPasses: passes, linftOrdered: calc.linftToOrder,
        prepWork, prepHours, linftRate,
        vinylType: mat.label, vinylArea: calc.netSqft,
        materialCost, installerPay,
        estimatedHours: installHours + (prepWork ? prepHours : 0),
        designFee, productLineType: 'marine', vehicleType: 'marine',
        unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.linftToOrder, calc.netSqft, materialCost, salePrice, installerPay,
      designFee, hullLength, hullHeightFt, hullHeightIn, beamWidth,
      matType, transom, prepWork, prepHours, linftRate])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Anchor size={12} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Marine Hull Wrap Calculator
        </span>
      </div>

      {/* Row 1: Dimensions — Hull Length + Height (ft + in) + Beam */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 1fr', gap: 5, marginBottom: 8, alignItems: 'end' }}>
        <div>
          <label style={calcFieldLabelCompact}>Hull Length (ft)</label>
          <input type="number" value={hullLength} onChange={e => setHullLength(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Height ft</label>
          <input type="number" value={hullHeightFt} onChange={e => setHullHeightFt(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={0} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>+ in</label>
          <input type="number" value={hullHeightIn} onChange={e => setHullHeightIn(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={0} max={11} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Beam Width (ft)</label>
          <input type="number" value={beamWidth} onChange={e => setBeamWidth(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      {/* Row 2: Material type + auto-pass badge + Transom + Prep on same row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        {MARINE_MATS.map(m => (
          <button key={m.key} onClick={() => canWrite && setMatType(m.key)}
            style={pillBtnCompact(matType === m.key, 'var(--cyan)')}>
            {m.key === 'printed' ? 'Printed (53")' : 'PPF/CC (60")'}
          </button>
        ))}
        {/* Auto-pass badge */}
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 800,
          background: passes === 2 ? 'rgba(245,158,11,0.15)' : 'rgba(34,192,122,0.15)',
          color: passes === 2 ? 'var(--amber)' : 'var(--green)',
          border: `1px solid ${passes === 2 ? 'rgba(245,158,11,0.3)' : 'rgba(34,192,122,0.3)'}`,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {passes}P · {hullHeightTotalInches}" hull / {mat.maxInches}" max
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', cursor: canWrite ? 'pointer' : 'default' }}>
          <input type="checkbox" checked={transom} onChange={() => canWrite && setTransom(!transom)} />
          Transom
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', cursor: canWrite ? 'pointer' : 'default' }}>
          <input type="checkbox" checked={prepWork} onChange={() => canWrite && setPrepWork(!prepWork)} />
          Prep
        </label>
        {prepWork && (
          <input type="number" value={prepHours} onChange={e => setPrepHours(Number(e.target.value))}
            style={{ ...calcInputCompact, width: 60, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
            disabled={!canWrite} min={0} placeholder="hrs" />
        )}
      </div>

      {/* Row 3: Rate + Design Fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>$/Linft</label>
          <input type="number" value={linftRate} onChange={e => setLinftRate(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step={0.25} />
        </div>
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

      {/* Row 4: Material breakdown bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '5px 8px', marginBottom: 8,
        background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)',
        borderRadius: 7, fontSize: 10, color: 'var(--text3)',
      }}>
        <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{hullHeightTotalInches}" hull</span>
        <span>·</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{passes === 1 ? '1 pass' : '2 passes'}</span>
        <span>·</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>raw: {calc.raw} lft</span>
        <span>·</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>+20% waste</span>
        <span>·</span>
        <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>order: {calc.linftToOrder} lft</span>
      </div>

      <OutputBar
        items={[
          { label: 'Net Sqft', value: `${calc.netSqft} sqft` },
          { label: 'Linft to Order', value: `${calc.linftToOrder} lft`, color: 'var(--cyan)' },
          { label: 'Mat Cost', value: fmtC(materialCost) },
          { label: 'Labor', value: fmtC(installerPay), color: 'var(--cyan)' },
          ...(prepWork ? [{ label: 'Prep', value: fmtC(prepCost) }] : []),
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
