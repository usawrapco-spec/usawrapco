'use client'

import { useState, useMemo, useEffect } from 'react'
import { Anchor } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import { calcMarineSqft } from '@/lib/estimator/pricing'
import {
  CalcOutput, VINYL_MATERIALS, DESIGN_FEE_DEFAULT,
  calcGPMPct, gpmColor,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const priceAt = (cogs: number, gpmPct: number) => cogs > 0 ? Math.round(cogs / (1 - gpmPct / 100)) : 0
type WrapType = 'printed' | 'color_change'

const MARINE_INSTALL_RATE = 22.50 // half of commercial $45/hr

export default function MarineCalc({ specs, onChange, canWrite }: Props) {
  const [wrapType, setWrapType]           = useState<WrapType>((specs.wrapType as WrapType) || 'printed')
  const [hullLength, setHullLength]       = useState((specs.hullLength as number) || 24)
  const [hullHeight, setHullHeight]       = useState((specs.hullHeight as number) || 24) // inches
  const [transom, setTransom]             = useState(!!(specs.includeTransom as boolean))
  const [transomWidth, setTransomWidth]   = useState((specs.transomWidth as number) || 72) // inches
  const [transomHeight, setTransomHeight] = useState((specs.transomHeight as number) || 24) // inches
  const [prepWork, setPrepWork]           = useState(!!(specs.prepWork as boolean))
  const [prepHours, setPrepHours]         = useState((specs.prepHours as number) || 0)
  const [material, setMaterial]           = useState((specs.vinylMaterial as string) || 'avery_1105')
  const [customRate, setCustomRate]       = useState((specs.customMatRate as number) || 0)
  const [installRate, setInstallRate]     = useState((specs.installRate as number) || MARINE_INSTALL_RATE)
  const [designFee, setDesignFee]         = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]         = useState((specs.unitPriceSaved as number) || 0)

  const isCustom = material === 'custom'
  const matRate  = isCustom ? customRate : (VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10)
  const matLabel = isCustom ? 'Custom' : (VINYL_MATERIALS.find(m => m.key === material)?.label ?? material)

  const marine = useMemo(() => calcMarineSqft(
    hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight, matRate
  ), [hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight, matRate])

  // Install: marine rate is about half commercial
  const installHours = Math.round((marine.boatSqft / 10) * 10) / 10
  const installerPay = Math.round(installHours * installRate)
  const prepCost     = prepWork ? prepHours * installRate : 0

  // COGS = materials (coverage + waste) + install + design
  const cogs         = marine.totalCost + installerPay + prepCost + designFee
  const gpm          = calcGPMPct(salePrice, cogs)
  const gp           = salePrice - cogs
  const belowFloor   = salePrice > 0 && gpm < 65

  // Target prices
  const price75 = priceAt(cogs, 75)
  const price65 = priceAt(cogs, 65)

  useEffect(() => {
    onChange({
      name: `Marine Hull Wrap — ${hullLength}ft ${wrapType === 'printed' ? 'Printed' : 'Color Change'}`,
      unit_price: salePrice,
      specs: {
        hullLength, hullHeight, wrapType, includeTransom: transom,
        transomWidth, transomHeight,
        prepWork, prepHours, installRate,
        vinylType: matLabel, vinylMaterial: material, vinylArea: marine.boatSqft,
        materialCost: marine.totalCost, installerPay,
        estimatedHours: installHours + (prepWork ? prepHours : 0),
        designFee, productLineType: 'marine', vehicleType: 'marine', unitPriceSaved: salePrice,
        panels: marine.panels, totalLinearFt: marine.totalLinearFt,
        wasteSqft: marine.wasteSqft, wasteCost: marine.wasteCost,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marine.boatSqft, marine.totalCost, salePrice, installerPay, designFee,
      hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight,
      prepWork, prepHours, material, customRate, installRate])

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

      {/* Row 1: Wrap Type + auto-panel badge */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        {([['printed', 'Printed (54")'], ['color_change', 'Color Change (60")']] as const).map(([k, label]) => (
          <button key={k} onClick={() => canWrite && setWrapType(k)}
            style={pillBtnCompact(wrapType === k, 'var(--cyan)')}>
            {label}
          </button>
        ))}
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 800,
          background: marine.panels === 2 ? 'rgba(245,158,11,0.15)' : 'rgba(34,192,122,0.15)',
          color: marine.panels === 2 ? 'var(--amber)' : 'var(--green)',
          border: `1px solid ${marine.panels === 2 ? 'rgba(245,158,11,0.3)' : 'rgba(34,192,122,0.3)'}`,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {marine.panels}P · {hullHeight}&quot; hull / {marine.maxHeightIn}&quot; max
        </span>
      </div>

      {/* Row 2: Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Hull Length (ft)</label>
          <input type="number" value={hullLength} onChange={e => setHullLength(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Hull Height (inches)</label>
          <input type="number" value={hullHeight} onChange={e => setHullHeight(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step="1" />
        </div>
      </div>

      {/* Row 3: Transom + Prep */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
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

      {/* Transom Dimensions */}
      {transom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
          <div>
            <label style={calcFieldLabelCompact}>Transom Width (in)</label>
            <input type="number" value={transomWidth} onChange={e => setTransomWidth(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
          </div>
          <div>
            <label style={calcFieldLabelCompact}>Transom Height (in)</label>
            <input type="number" value={transomHeight} onChange={e => setTransomHeight(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
          </div>
        </div>
      )}

      {/* Material selector */}
      <div style={{ marginBottom: 8 }}>
        <label style={calcFieldLabelCompact}>Material</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {VINYL_MATERIALS.map(m => (
            <button key={m.key} onClick={() => canWrite && setMaterial(m.key)}
              style={pillBtnCompact(material === m.key)}>
              {m.label} · ${m.rate}
            </button>
          ))}
          <button onClick={() => canWrite && setMaterial('custom')}
            style={pillBtnCompact(isCustom)}>
            Custom
          </button>
        </div>
        {isCustom && (
          <div style={{ marginTop: 4 }}>
            <label style={calcFieldLabelCompact}>Custom Rate ($/sqft)</label>
            <input type="number" value={customRate || ''} onChange={e => setCustomRate(Number(e.target.value))}
              style={{ ...calcInputCompact, width: 100, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
              disabled={!canWrite} step="0.01" min={0} />
          </div>
        )}
      </div>

      {/* Install Rate + Sale Price + Design Fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Install $/hr</label>
          <input type="number" value={installRate} onChange={e => setInstallRate(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step="0.50" />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', borderColor: belowFloor ? 'var(--red)' : undefined }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Design Fee</label>
          <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      {/* COGS Breakdown — the math */}
      <div style={{ marginBottom: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>COGS Breakdown</div>
        {[
          { label: `Boat coverage (${marine.boatSqft - marine.transomSqft} sqft × $${matRate}/sqft)`, val: fmtC(marine.materialCost) },
          ...(marine.transomSqft > 0 ? [{ label: `Transom (${marine.transomSqft} sqft × $${matRate}/sqft)`, val: fmtC(marine.transomSqft * matRate) }] : []),
          { label: `Waste @ 2× rate (${marine.wasteSqft} sqft × $${matRate} × 2)`, val: fmtC(marine.wasteCost), color: 'var(--amber)' },
          { label: `Total Material`, val: fmtC(marine.totalCost), bold: true },
          { label: `Install (${installHours}h × $${installRate}/hr)`, val: fmtC(installerPay) },
          ...(prepWork ? [{ label: `Prep (${prepHours}h × $${installRate}/hr)`, val: fmtC(prepCost) }] : []),
          { label: 'Design Fee', val: fmtC(designFee) },
          { label: 'Total COGS', val: fmtC(cogs), bold: true },
          { label: 'Target 75% GPM', val: fmtC(price75), bold: true, color: 'var(--green)' },
          { label: 'Floor 65% GPM', val: fmtC(price65), bold: true, color: 'var(--amber)' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 10, color: 'var(--text2)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <span>{row.label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: row.bold ? 700 : 400, color: row.color || (row.bold ? 'var(--text1)' : 'var(--text2)') }}>{row.val}</span>
          </div>
        ))}
      </div>

      {/* Material info bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '5px 8px', marginBottom: 8,
        background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.15)',
        borderRadius: 7, fontSize: 10, color: 'var(--text3)',
      }}>
        <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{hullHeight}&quot; hull</span>
        <span>·</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{marine.panels === 1 ? '1 panel' : '2 panels'}/side</span>
        <span>·</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{marine.totalLinearFt} lft</span>
        <span>·</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{marine.totalMaterialSqft} sqft ordered</span>
        <span>·</span>
        <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>{marine.wasteSqft} waste</span>
      </div>

      {/* Below floor warning */}
      {belowFloor && (
        <div style={{ marginBottom: 8, padding: '6px 10px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', borderRadius: 7, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
          Below 65% floor — manager override required.
        </div>
      )}

      <OutputBar
        items={[
          { label: 'Boat Sqft', value: `${marine.boatSqft}` },
          { label: 'Material', value: fmtC(marine.totalCost) },
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
