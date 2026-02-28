'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
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
    // Side panels
    const sideCount = (['left', 'right'] as TrailerSide[]).filter(s => selectedSides.has(s)).length
    t += sideCount * trailerLength * trailerHeight
    // Front panel (assume width ≈ 8.5ft standard)
    if (selectedSides.has('front')) {
      t += trailerHeight * 8.5 * Number(frontCoverage)
    }
    // Rear
    if (selectedSides.has('rear')) {
      t += trailerHeight * 8.5
    }
    // V-Nose
    if (vNose === 'half_standard') {
      t += (trailerHeight * 4) * 0.5  // 4ft nose, half coverage
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
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 14 }}>
        Trailer Calculator
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={calcFieldLabel}>Length (ft)</label>
          <input type="number" value={trailerLength} onChange={e => setTrailerLength(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabel}>Height (ft)</label>
          <input type="number" value={trailerHeight} onChange={e => setTrailerHeight(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step="0.5" />
        </div>
      </div>

      {/* Sides */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Sides</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TRAILER_SIDES.map(s => (
            <button key={s} onClick={() => canWrite && toggleSide(s)}
              style={{ ...pillBtn(selectedSides.has(s)), textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Front Coverage (shown only if front selected) */}
      {selectedSides.has('front') && (
        <div style={{ marginBottom: 12 }}>
          <label style={calcFieldLabel}>Front Panel Coverage</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {FRONT_COVERAGE.map(c => (
              <button key={c.key} onClick={() => canWrite && setFrontCoverage(c.key)}
                style={{ ...pillBtn(frontCoverage === c.key), flex: 1 }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* V-Nose */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>V-Nose</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {VNOSE_OPTIONS.map(v => (
            <button key={v} onClick={() => canWrite && setVNose(v)}
              style={{ ...pillBtn(vNose === v), textTransform: 'capitalize' }}>
              {v === 'none' ? 'None' : v === 'half_standard' ? '1/2 Standard' : 'Custom'}
            </button>
          ))}
        </div>
        {vNose === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div>
              <label style={calcFieldLabel}>H (ft)</label>
              <input type="number" value={vNoseH} onChange={e => setVNoseH(Number(e.target.value))}
                style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
            </div>
            <div>
              <label style={calcFieldLabel}>L (ft)</label>
              <input type="number" value={vNoseL} onChange={e => setVNoseL(Number(e.target.value))}
                style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
            </div>
          </div>
        )}
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <label style={{ ...calcFieldLabel, marginBottom: 0 }}>Laminate</label>
        <button onClick={() => canWrite && setLaminate(true)} style={pillBtn(laminate, 'var(--green)')}>Yes +$0.60/sqft</button>
        <button onClick={() => canWrite && setLaminate(false)} style={pillBtn(!laminate)}>No</button>
      </div>

      {/* Price + Design Fee */}
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
