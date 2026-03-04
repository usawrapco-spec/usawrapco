'use client'

import { useState, useMemo, useEffect } from 'react'
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

const TRAILER_SIDES = ['left', 'right', 'front', 'rear'] as const
type TrailerSide = typeof TRAILER_SIDES[number]
const FRONT_COVERAGE = [
  { key: '1',    label: 'Full' },
  { key: '0.75', label: '3/4' },
  { key: '0.5',  label: '1/2' },
]
const VNOSE_OPTIONS = ['none', 'half_standard', 'custom'] as const
type VNose = typeof VNOSE_OPTIONS[number]

export default function TrailerCalc({ specs, onChange, canWrite }: Props) {
  const [trailerLength, setTrailerLength] = useState((specs.trailerLength as number) || 53)
  const [trailerHeight, setTrailerHeight] = useState((specs.trailerHeight as number) || 7.5)
  const [selectedSides, setSelectedSides] = useState<Set<TrailerSide>>(
    new Set((specs.selectedSides as TrailerSide[]) || ['left', 'right'])
  )
  const [frontCoverage, setFrontCoverage] = useState((specs.frontCoverage as string) || '1')
  const [vNose, setVNose]           = useState<VNose>((specs.vNose as VNose) || 'none')
  const [vNoseH, setVNoseH]         = useState((specs.vNoseH as number) || 8)
  const [vNoseL, setVNoseL]         = useState((specs.vNoseL as number) || 4)
  const [material, setMaterial]     = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [laminate, setLaminate]     = useState(!!(specs.hasLaminate as boolean))
  const [designFee, setDesignFee]   = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]   = useState((specs.unitPriceSaved as number) || 0)

  const toggleSide = (s: TrailerSide) =>
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
    const sideCount = (['left', 'right'] as TrailerSide[]).filter(s => selectedSides.has(s)).length
    t += sideCount * trailerLength * trailerHeight
    if (selectedSides.has('front')) t += trailerHeight * 8.5 * Number(frontCoverage)
    if (selectedSides.has('rear'))  t += trailerHeight * 8.5
    if (vNose === 'half_standard') {
      t += (trailerHeight * 4) * 0.5
    } else if (vNose === 'custom') {
      t += vNoseH * vNoseL
    }
    return Math.round(t)
  }, [trailerLength, trailerHeight, selectedSides, frontCoverage, vNose, vNoseH, vNoseL])

  const sqftOrdered  = Math.ceil(sqft * 1.10)
  const materialCost = sqftOrdered * (matRate + laminateAdd)
  const installHours = Math.round((sqft / 12) * 10) / 10
  const installerPay = Math.round(installHours * 35)
  const cogs         = materialCost + installerPay + designFee
  const gpm          = calcGPMPct(salePrice, cogs)
  const gp           = salePrice - cogs
  const auto73       = autoPrice(cogs)

  useEffect(() => {
    onChange({
      name: `Trailer Wrap — ${trailerLength}ft`,
      unit_price: salePrice,
      specs: {
        trailerLength, trailerHeight, selectedSides: [...selectedSides],
        frontCoverage, vNose, vNoseH, vNoseL, vinylType: matLabel,
        vinylMaterial: material, hasLaminate: laminate, vinylArea: sqft,
        materialCost, installerPay, estimatedHours: installHours, designFee,
        productLineType: 'trailer', vehicleType: 'trailer', unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, designFee,
      trailerLength, trailerHeight, frontCoverage, vNose, vNoseH, vNoseL, material, laminate, selectedSides])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 10 }}>
        Trailer Calculator
      </div>

      {/* Dimensions + Sides on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Length (ft)</label>
          <input type="number" value={trailerLength} onChange={e => setTrailerLength(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Height (ft)</label>
          <input type="number" value={trailerHeight} onChange={e => setTrailerHeight(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step={0.5} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Sides</label>
          <div style={{ display: 'flex', gap: 3 }}>
            {TRAILER_SIDES.map(s => (
              <button key={s} onClick={() => canWrite && toggleSide(s)}
                style={pillBtnCompact(selectedSides.has(s))}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Front coverage + V-Nose on same row (conditional) */}
      {(selectedSides.has('front') || vNose !== 'none') && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSides.has('front') ? '1fr 1fr' : '1fr', gap: 6, marginBottom: 8 }}>
          {selectedSides.has('front') && (
            <div>
              <label style={calcFieldLabelCompact}>Front Coverage</label>
              <div style={{ display: 'flex', gap: 3 }}>
                {FRONT_COVERAGE.map(c => (
                  <button key={c.key} onClick={() => canWrite && setFrontCoverage(c.key)}
                    style={{ ...pillBtnCompact(frontCoverage === c.key), flex: 1 }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={calcFieldLabelCompact}>V-Nose</label>
            <div style={{ display: 'flex', gap: 3 }}>
              {VNOSE_OPTIONS.map(v => (
                <button key={v} onClick={() => canWrite && setVNose(v)}
                  style={pillBtnCompact(vNose === v)}>
                  {v === 'none' ? 'None' : v === 'half_standard' ? '½ Std' : 'Custom'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* V-Nose row shown even if front not selected */}
      {!selectedSides.has('front') && vNose === 'none' && (
        <div style={{ marginBottom: 8 }}>
          <label style={calcFieldLabelCompact}>V-Nose</label>
          <div style={{ display: 'flex', gap: 3 }}>
            {VNOSE_OPTIONS.map(v => (
              <button key={v} onClick={() => canWrite && setVNose(v)}
                style={pillBtnCompact(vNose === v)}>
                {v === 'none' ? 'None' : v === 'half_standard' ? '½ Std' : 'Custom'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* V-Nose custom dims */}
      {vNose === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <div>
            <label style={calcFieldLabelCompact}>V-Nose H (ft)</label>
            <input type="number" value={vNoseH} onChange={e => setVNoseH(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
          </div>
          <div>
            <label style={calcFieldLabelCompact}>V-Nose L (ft)</label>
            <input type="number" value={vNoseL} onChange={e => setVNoseL(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
          </div>
        </div>
      )}

      {/* Material dropdown + Laminate on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
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
          <label style={calcFieldLabelCompact}>Laminate</label>
          <button onClick={() => canWrite && setLaminate(!laminate)}
            style={pillBtnCompact(laminate, 'var(--green)')}>
            {laminate ? '+$0.60/sqft' : 'No Lam'}
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
          { label: 'Sqft', value: `${sqft} sqft` },
          { label: 'Ordered', value: `${sqftOrdered} sqft`, color: 'var(--cyan)' },
          { label: 'Mat Cost', value: fmtC(materialCost) },
          { label: 'Labor', value: `${fmtC(installerPay)} (${installHours}h)`, color: 'var(--cyan)' },
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
