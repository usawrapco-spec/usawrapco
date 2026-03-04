'use client'

import { useState, useMemo, useEffect } from 'react'
import { Anchor } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import { calcMarineSqft } from '@/lib/estimator/pricing'
import {
  CalcOutput, VINYL_MATERIALS, DESIGN_FEE_DEFAULT,
  calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'
import { calculateMarineInstallPay } from '@/lib/estimator/vehicleDb'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
type WrapType = 'printed' | 'color_change'

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
  const [installerPay, setInstallerPay]   = useState((specs.installerPay as number) || 0)
  const [installOverride, setInstallOverride] = useState(!!(specs.installOverride as boolean))
  const [designFee, setDesignFee]         = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]         = useState((specs.unitPriceSaved as number) || 0)

  const isCustom = material === 'custom'
  const matRate  = isCustom ? customRate : (VINYL_MATERIALS.find(m => m.key === material)?.rate ?? 2.10)
  const matLabel = isCustom ? 'Custom' : (VINYL_MATERIALS.find(m => m.key === material)?.label ?? material)

  const marine = useMemo(() => calcMarineSqft(
    hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight, matRate
  ), [hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight, matRate])

  // Install: marine = half of commercial formula
  const marineInstall = useMemo(() => calculateMarineInstallPay(marine.boatSqft), [marine.boatSqft])
  const effectiveInstallPay = installOverride ? installerPay : marineInstall.pay
  const installHours = marineInstall.hours
  const prepCost     = prepWork ? Math.round(prepHours * (marineInstall.hourlyRate || 17)) : 0

  // Auto-set install pay when formula changes (and not overridden)
  useEffect(() => {
    if (!installOverride && marineInstall.pay > 0) setInstallerPay(marineInstall.pay)
  }, [installOverride, marineInstall.pay])

  // COGS = materials (coverage + waste) + install + design
  const cogs         = marine.totalCost + effectiveInstallPay + prepCost + designFee
  const gpm          = calcGPMPct(salePrice, cogs)
  const gp           = salePrice - cogs
  const belowFloor   = salePrice > 0 && gpm < 65

  useEffect(() => {
    onChange({
      name: `Marine Hull Wrap — ${hullLength}ft ${wrapType === 'printed' ? 'Printed' : 'Color Change'}`,
      unit_price: salePrice,
      specs: {
        hullLength, hullHeight, wrapType, includeTransom: transom,
        transomWidth, transomHeight,
        prepWork, prepHours, installOverride,
        vinylType: matLabel, vinylMaterial: material, vinylArea: marine.boatSqft,
        materialCost: marine.totalCost, installerPay: effectiveInstallPay,
        estimatedHours: installHours + (prepWork ? prepHours : 0),
        designFee, productLineType: 'marine', vehicleType: 'marine', unitPriceSaved: salePrice,
        panels: marine.panels, totalLinearFt: marine.totalLinearFt,
        wasteSqft: marine.wasteSqft, wasteCost: marine.wasteCost,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marine.boatSqft, marine.totalCost, salePrice, effectiveInstallPay, designFee,
      hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight,
      prepWork, prepHours, material, customRate, installOverride])

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

      {/* Install Pay — formula (half commercial) or override */}
      <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--surface)' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Install Pay (½ commercial)
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={() => { if (canWrite) { setInstallOverride(false); setInstallerPay(marineInstall.pay) } }}
              style={pillBtnCompact(!installOverride, 'var(--cyan)')}>Formula</button>
            <button onClick={() => canWrite && setInstallOverride(true)}
              style={pillBtnCompact(installOverride, 'var(--amber)')}>Override</button>
          </div>
        </div>
        <div style={{ padding: '6px 10px', background: 'var(--bg)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>
            {installHours}h × ${marineInstall.hourlyRate}/hr
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: installOverride ? 'var(--amber)' : 'var(--cyan)' }}>
            = {fmtC(effectiveInstallPay)}
          </span>
          {installOverride && (
            <input type="number" value={installerPay || ''} onChange={e => setInstallerPay(Number(e.target.value))}
              style={{ ...calcInputCompact, width: 90, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', borderColor: 'var(--amber)' }}
              disabled={!canWrite} />
          )}
        </div>
      </div>

      {/* Sale Price + Design Fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
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


      {/* Below floor warning */}
      {belowFloor && (
        <div style={{ marginBottom: 8, padding: '6px 10px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', borderRadius: 7, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
          Below 65% floor — manager override required.
        </div>
      )}

      <OutputBar
        items={[
          { label: 'Material', value: fmtC(marine.totalCost) },
          { label: 'Install', value: `${fmtC(effectiveInstallPay)} (${installHours}h)`, color: 'var(--cyan)' },
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
