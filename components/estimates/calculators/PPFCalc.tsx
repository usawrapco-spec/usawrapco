'use client'

import { useState, useMemo, useEffect } from 'react'
import { Shield } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput,
  autoPrice, calcGPMPct,
  calcFieldLabelCompact, calcInputCompact,
} from './types'
import OutputBar from './OutputBar'

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

const PPF_RATE_PER_YARD = 45

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
  const installerPay = Math.round(totalYards * 35)
  const cogs         = materialCost + installerPay + designFee
  const effectivePrice = salePrice > 0 ? salePrice : packageRevenue
  const gpm          = calcGPMPct(effectivePrice, cogs)
  const gp           = effectivePrice - cogs
  const auto73       = autoPrice(cogs)
  const pkgNames     = PPF_PACKAGES.filter(p => selectedPkgs.has(p.key)).map(p => p.label).join(' + ')

  useEffect(() => {
    if (selectedPkgs.size === 0) return
    const finalPrice = salePrice > 0 ? salePrice : packageRevenue
    onChange({
      name: pkgNames ? `PPF — ${pkgNames}` : 'PPF Package',
      unit_price: finalPrice,
      specs: {
        ppfPackages: [...selectedPkgs], vinylType: 'PPF Film',
        vinylArea: Math.round(totalYards * 9),
        materialCost, installerPay, estimatedHours: totalYards * 1.2,
        designFee, productLineType: 'ppf', vehicleType: 'ppf',
        unitPriceSaved: salePrice, totalYards,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPkgs, materialCost, salePrice, installerPay, designFee])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Shield size={12} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          PPF Calculator
        </span>
        {selectedPkgs.size > 0 && (
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(34,211,238,0.15)', color: 'var(--cyan)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {totalYards} yds · {fmtC(packageRevenue)}
          </span>
        )}
      </div>

      {/* Package grid — tighter cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 4, marginBottom: 8 }}>
        {PPF_PACKAGES.map(pkg => {
          const sel = selectedPkgs.has(pkg.key)
          return (
            <button key={pkg.key} onClick={() => togglePkg(pkg.key)}
              style={{
                padding: '5px 8px', borderRadius: 7, cursor: canWrite ? 'pointer' : 'default', textAlign: 'left' as const,
                border: sel ? '1.5px solid var(--cyan)' : '1px solid var(--border)',
                background: sel ? 'rgba(34,211,238,0.08)' : 'var(--surface)',
              }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: sel ? 'var(--cyan)' : 'var(--text1)', textTransform: 'uppercase' as const, fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1.2 }}>
                {pkg.label}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{pkg.yards} yds</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: sel ? 'var(--cyan)' : 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>${pkg.price}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Price row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Sale Price (0 = pkg total)</label>
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
          { label: 'Pkgs', value: `${selectedPkgs.size}` },
          { label: 'Yards', value: `${totalYards} yds`, color: 'var(--cyan)' },
          { label: 'Pkg Rev', value: fmtC(packageRevenue), color: 'var(--accent)' },
          { label: 'Mat Cost', value: fmtC(materialCost) },
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
