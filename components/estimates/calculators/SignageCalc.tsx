'use client'

import { useState, useMemo, useEffect } from 'react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
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

const SIGN_TYPES = [
  { key: 'banner',           label: 'Banner',            matRate: 1.20, installRate: 0    },
  { key: 'yard_sign',        label: 'Yard Sign',         matRate: 2.00, installRate: 5    },
  { key: 'coroplast',        label: 'Coroplast',         matRate: 2.00, installRate: 5    },
  { key: 'aluminum',         label: 'Aluminum Sign',     matRate: 4.50, installRate: 10   },
  { key: 'retractable',      label: 'Retractable Banner',matRate: 3.50, installRate: 25   },
  { key: 'a_frame',          label: 'A-Frame',           matRate: 5.00, installRate: 30   },
  { key: 'window_graphic',   label: 'Window Graphic',    matRate: 2.30, installRate: 0.50 },
  { key: 'floor_graphic',    label: 'Floor Graphic',     matRate: 3.50, installRate: 1.00 },
  { key: 'canvas_print',     label: 'Canvas Print',      matRate: 4.00, installRate: 0    },
  { key: 'foam_board',       label: 'Foam Board',        matRate: 1.50, installRate: 5    },
]

export default function SignageCalc({ specs, onChange, canWrite }: Props) {
  const [signType, setSignType]   = useState((specs.signType as string) || 'banner')
  const [widthIn, setWidthIn]     = useState((specs.signWidthIn as number) || 48)
  const [heightIn, setHeightIn]   = useState((specs.signHeightIn as number) || 24)
  const [quantity, setQuantity]   = useState((specs.signQuantity as number) || 1)
  const [dblSided, setDblSided]   = useState(!!(specs.doubleSided as boolean))
  const [rush, setRush]           = useState(!!(specs.rushOrder as boolean))
  const [designFee, setDesignFee] = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice] = useState((specs.unitPriceSaved as number) || 0)

  const sqftEach = useMemo(() => (widthIn / 12) * (heightIn / 12), [widthIn, heightIn])
  const totalSqft = useMemo(() => sqftEach * quantity * (dblSided ? 2 : 1), [sqftEach, quantity, dblSided])

  const signConfig = SIGN_TYPES.find(s => s.key === signType)
  const matRate = signConfig?.matRate ?? 1.20
  const instRate = signConfig?.installRate ?? 0

  const materialCost = useMemo(() => totalSqft * matRate * (rush ? 1.30 : 1), [totalSqft, matRate, rush])
  const installerPay = useMemo(() => {
    if (instRate === 0) return 0
    return instRate <= 1 ? Math.round(totalSqft * instRate * 35) : Math.round(quantity * instRate)
  }, [totalSqft, quantity, instRate])
  const cogs   = materialCost + installerPay + designFee
  const gpm    = calcGPMPct(salePrice, cogs)
  const gp     = salePrice - cogs
  const auto73 = autoPrice(cogs)

  useEffect(() => {
    const typeName = SIGN_TYPES.find(s => s.key === signType)?.label || signType
    onChange({
      name: `${typeName} — ${Math.round(widthIn)}"×${Math.round(heightIn)}"${quantity > 1 ? ` ×${quantity}` : ''}`,
      unit_price: salePrice,
      specs: {
        signType, signWidthIn: widthIn, signHeightIn: heightIn, signQuantity: quantity,
        doubleSided: dblSided, rushOrder: rush, vinylType: typeName,
        vinylArea: Math.round(totalSqft), materialCost, installerPay,
        estimatedHours: installerPay / 35, designFee,
        productLineType: 'signage', vehicleType: 'custom', unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSqft, materialCost, salePrice, installerPay, designFee,
      signType, widthIn, heightIn, quantity, dblSided, rush])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 10 }}>
        Signage Calculator
      </div>

      {/* Sign Type dropdown */}
      <div style={{ marginBottom: 8 }}>
        <label style={calcFieldLabelCompact}>Sign Type</label>
        <select
          value={signType}
          onChange={e => canWrite && setSignType(e.target.value)}
          disabled={!canWrite}
          style={{ ...calcSelect, fontSize: 12 }}
        >
          {SIGN_TYPES.map(s => (
            <option key={s.key} value={s.key}>{s.label} — ${s.matRate}/sqft</option>
          ))}
        </select>
      </div>

      {/* Dimensions + Options on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Width (in)</label>
          <input type="number" value={widthIn} onChange={e => setWidthIn(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Height (in)</label>
          <input type="number" value={heightIn} onChange={e => setHeightIn(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Quantity</label>
          <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={calcFieldLabelCompact}>Options</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => canWrite && setDblSided(!dblSided)} style={pillBtnCompact(dblSided)}>2x</button>
            <button onClick={() => canWrite && setRush(!rush)} style={pillBtnCompact(rush, 'var(--red)')}>Rush</button>
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
          { label: 'Sqft ea', value: `${sqftEach.toFixed(1)} sqft` },
          { label: 'Total Sqft', value: `${totalSqft.toFixed(1)} sqft${dblSided ? ' ×2' : ''}`, color: 'var(--cyan)' },
          { label: 'Mat Cost', value: fmtC(materialCost) + (rush ? ' +30%' : '') },
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ]}
        gpm={gpm}
        gp={gp}
        autoPrice={Math.round(auto73)}
        onSetPrice={(p) => setSalePrice(p)}
        cogs={cogs}
        currentPrice={salePrice}
        canWrite={canWrite}
      />
    </div>
  )
}
