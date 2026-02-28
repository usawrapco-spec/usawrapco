'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, calcSelect, pillBtn, outputRow, outputVal,
} from './types'

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
    // install rate per sqft or per unit (≤1 means per sqft, >1 means per unit)
    return instRate <= 1 ? Math.round(totalSqft * instRate * 35) : Math.round(quantity * instRate)
  }, [totalSqft, quantity, instRate])
  const cogs     = materialCost + installerPay + designFee
  const gpm      = calcGPMPct(salePrice, cogs)
  const gp       = salePrice - cogs
  const auto73   = autoPrice(cogs)

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
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 14 }}>
        Signage Calculator
      </div>

      {/* Sign Type */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Sign Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 5 }}>
          {SIGN_TYPES.map(s => (
            <button key={s.key} onClick={() => canWrite && setSignType(s.key)}
              style={{ ...pillBtn(signType === s.key, 'var(--amber)'), textAlign: 'left', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
              <div>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, marginTop: 2, color: signType === s.key ? 'var(--amber)' : 'var(--text3)' }}>${s.matRate}/sqft</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={calcFieldLabel}>Width (in)</label>
          <input type="number" value={widthIn} onChange={e => setWidthIn(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabel}>Height (in)</label>
          <input type="number" value={heightIn} onChange={e => setHeightIn(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
        <div>
          <label style={calcFieldLabel}>Quantity</label>
          <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} min={1} />
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => canWrite && setDblSided(!dblSided)} style={pillBtn(dblSided)}>
          Double Sided
        </button>
        <button onClick={() => canWrite && setRush(!rush)} style={pillBtn(rush, 'var(--red)')}>
          Rush (+30%)
        </button>
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
          ['Sqft per piece', `${sqftEach.toFixed(1)} sqft`],
          ['Total Sqft', `${totalSqft.toFixed(1)} sqft${dblSided ? ' (dbl-sided)' : ''}`],
          ['Material Cost', fmtC(materialCost) + (rush ? ' (rush +30%)' : '')],
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
