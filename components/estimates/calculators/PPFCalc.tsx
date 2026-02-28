'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap, Shield } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, outputRow, outputVal,
} from './types'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const PPF_PACKAGES = [
  { key: 'full_hood',      label: 'Full Hood',         yards: 3,   price: 450  },
  { key: 'partial_hood',   label: 'Partial Hood',      yards: 1.5, price: 250  },
  { key: 'front_fenders',  label: 'Front Fenders',     yards: 2,   price: 300  },
  { key: 'mirrors',        label: 'Mirrors',           yards: 0.5, price: 95   },
  { key: 'front_bumper',   label: 'Front Bumper',      yards: 1.5, price: 225  },
  { key: 'rocker_panels',  label: 'Rocker Panels',     yards: 2,   price: 280  },
  { key: 'a_pillars',      label: 'A-Pillars',         yards: 0.5, price: 120  },
  { key: 'full_front',     label: 'Full Front Package', yards: 8,  price: 1200 },
]

const PPF_RATE_PER_YARD = 45  // material cost per yard

export default function PPFCalc({ specs, onChange, canWrite }: Props) {
  const [selectedPkgs, setSelectedPkgs] = useState<Set<string>>(
    new Set((specs.ppfPackages as string[]) || [])
  )
  const [designFee, setDesignFee] = useState((specs.designFee as number) ?? 0)
  const [salePrice, setSalePrice] = useState((specs.unitPriceSaved as number) || 0)

  const togglePkg = (key: string) => {
    if (!canWrite) return
    setSelectedPkgs(prev => {
      const next = new Set(prev)
      // Full Front Package is exclusive — deselect individual if selecting full front
      if (key === 'full_front') {
        if (next.has(key)) { next.delete(key) }
        else { next.clear(); next.add(key) }
      } else {
        if (next.has('full_front')) next.delete('full_front')
        if (next.has(key)) next.delete(key); else next.add(key)
      }
      return next
    })
  }

  const totalYards = useMemo(() =>
    PPF_PACKAGES.filter(p => selectedPkgs.has(p.key)).reduce((s, p) => s + p.yards, 0),
  [selectedPkgs])

  const packageRevenue = useMemo(() =>
    PPF_PACKAGES.filter(p => selectedPkgs.has(p.key)).reduce((s, p) => s + p.price, 0),
  [selectedPkgs])

  const materialCost = totalYards * PPF_RATE_PER_YARD
  const installerPay = Math.round(totalYards * 35)  // ~$35/yd labor
  const cogs         = materialCost + installerPay + designFee
  const gpm          = calcGPMPct(salePrice > 0 ? salePrice : packageRevenue, cogs)
  const gp           = (salePrice > 0 ? salePrice : packageRevenue) - cogs
  const auto73       = autoPrice(cogs)

  const packages = PPF_PACKAGES.filter(p => selectedPkgs.has(p.key))
  const pkgNames = packages.map(p => p.label).join(' + ')

  useEffect(() => {
    if (selectedPkgs.size === 0) return
    const finalPrice = salePrice > 0 ? salePrice : packageRevenue
    onChange({
      name: pkgNames ? `PPF — ${pkgNames}` : 'PPF Package',
      unit_price: finalPrice,
      specs: {
        ppfPackages: [...selectedPkgs], vinylType: 'PPF Film',
        vinylArea: Math.round(totalYards * 9),  // approx sqft from yards
        materialCost, installerPay, estimatedHours: totalYards * 1.2,
        designFee, productLineType: 'ppf', vehicleType: 'ppf',
        unitPriceSaved: salePrice, totalYards,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPkgs, materialCost, salePrice, installerPay, designFee])

  const gadget: React.CSSProperties = {
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Shield size={13} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          PPF Calculator
        </span>
      </div>

      {/* Package Selection */}
      <div style={{ marginBottom: 14 }}>
        <label style={calcFieldLabel}>Select Packages (multi-select)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
          {PPF_PACKAGES.map(pkg => {
            const sel = selectedPkgs.has(pkg.key)
            return (
              <button key={pkg.key} onClick={() => togglePkg(pkg.key)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default', textAlign: 'left',
                  border: sel ? '2px solid var(--cyan)' : '1px solid var(--border)',
                  background: sel ? 'rgba(34,211,238,0.08)' : 'var(--surface)',
                }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: sel ? 'var(--cyan)' : 'var(--text1)', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {pkg.label}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{pkg.yards} yds</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sel ? 'var(--cyan)' : 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>${pkg.price}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Manual Price Override */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div>
          <label style={calcFieldLabel}>Sale Price (0 = use package total)</label>
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
          ['Packages Selected', `${selectedPkgs.size}`],
          ['Total Yards', `${totalYards} yds`],
          ['Package Revenue', fmtC(packageRevenue)],
          ['Material Cost', fmtC(materialCost) + ` ($${PPF_RATE_PER_YARD}/yd)`],
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
