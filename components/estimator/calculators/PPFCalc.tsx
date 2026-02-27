'use client'

import { Shield, Check } from 'lucide-react'
import type { LineItemState } from '@/lib/estimator/types'
import { PPF_PACKAGES } from '@/lib/estimator/vehicleDb'
import { calcPPFTotal } from '@/lib/estimator/pricing'

interface PPFCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function PPFCalc({ item, onChange }: PPFCalcProps) {
  const selected = item.ppfSelected || []

  function togglePackage(id: string) {
    const isSelected = selected.includes(id)
    const next = isSelected ? selected.filter(s => s !== id) : [...selected, id]
    const ppf = calcPPFTotal(next)
    onChange({
      ppfSelected: next,
      salePrice: ppf.salePrice,
      manualSale: false,
    })
  }

  const totals = calcPPFTotal(selected)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={lbl}>Select PPF Packages</label>

      {/* Package Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {PPF_PACKAGES.map(pkg => {
          const isSelected = selected.includes(pkg.id)
          return (
            <button
              key={pkg.id}
              onClick={() => togglePackage(pkg.id)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                padding: '14px 14px', borderRadius: 10, minHeight: 80,
                border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(34,192,122,0.08)' : 'var(--surface2)',
                cursor: 'pointer', textAlign: 'left', position: 'relative',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--green)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} style={{ color: '#fff' }} />
                </div>
              )}
              <div style={{
                fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--green)' : 'var(--text1)',
                fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase',
              }}>
                {pkg.name}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 800, color: isSelected ? 'var(--green)' : 'var(--text1)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fM(pkg.sale)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                {pkg.yards} yards | Mat: {fM(pkg.matCost)}
              </div>
            </button>
          )
        })}
      </div>

      {/* Totals */}
      {selected.length > 0 && (
        <div style={{
          display: 'flex', gap: 16, padding: '12px 14px', borderRadius: 8,
          background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.15)',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            {selected.length} packages
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Total: <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>{fM(totals.salePrice)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Material: <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{fM(totals.matCost)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            Yards: <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{totals.totalYards}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  fontFamily: "'Barlow Condensed', sans-serif",
}
