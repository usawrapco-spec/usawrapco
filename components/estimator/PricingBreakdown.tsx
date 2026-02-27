'use client'

import type { LineItemCalc } from '@/lib/estimator/types'
import { STD_INSTALL_RATES } from '@/lib/estimator/vehicleDb'

interface PricingBreakdownProps {
  calc: LineItemCalc
  vehicleSize?: string
  showStdComparison?: boolean
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fP = (n: number) => Math.round(n) + '%'

function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

export default function PricingBreakdown({ calc, vehicleSize, showStdComparison }: PricingBreakdownProps) {
  const rows = [
    { label: 'Material Cost', pct: calc.salePrice > 0 ? (calc.matCost / calc.salePrice) * 100 : 0, value: calc.matCost, color: 'var(--amber)' },
    { label: 'Labor', pct: calc.effectiveLaborPct, value: calc.labor, color: 'var(--cyan)' },
    { label: 'Design Fee', pct: calc.salePrice > 0 ? (calc.design / calc.salePrice) * 100 : 0, value: calc.design, color: 'var(--purple)' },
  ]

  // Find standard rate for comparison
  const stdRate = vehicleSize && showStdComparison
    ? STD_INSTALL_RATES.find(r => r.name.toLowerCase().includes(vehicleSize.toLowerCase()))
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Cost rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'grid', gridTemplateColumns: '1fr 48px 80px',
            padding: '7px 0', borderBottom: '1px solid rgba(42,47,61,0.4)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{row.label}</span>
          <span style={{
            fontSize: 11, color: row.color, fontWeight: 700, textAlign: 'right',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fP(row.pct)}
          </span>
          <span style={{
            fontSize: 12, color: 'var(--text1)', fontWeight: 600, textAlign: 'right',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fM(row.value)}
          </span>
        </div>
      ))}

      {/* COGS line */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 48px 80px',
        padding: '8px 0', borderTop: '2px solid var(--border)',
        marginTop: 2, alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase' }}>COGS</span>
        <span style={{
          fontSize: 11, color: 'var(--text2)', fontWeight: 700, textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {fP(calc.salePrice > 0 ? (calc.cogs / calc.salePrice) * 100 : 0)}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--text1)', fontWeight: 700, textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {fM(calc.cogs)}
        </span>
      </div>

      {/* Gross Profit */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 48px 80px',
        padding: '8px 0', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: gpmColor(calc.gpm), fontWeight: 800, textTransform: 'uppercase' }}>
          Gross Profit
        </span>
        <span style={{
          fontSize: 12, color: gpmColor(calc.gpm), fontWeight: 800, textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {fP(calc.gpm)}
        </span>
        <span style={{
          fontSize: 13, color: gpmColor(calc.gpm), fontWeight: 800, textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {fM(calc.profit)}
        </span>
      </div>

      {/* GPM badge */}
      <div style={{
        display: 'flex', justifyContent: 'center', marginTop: 4,
      }}>
        <span style={{
          padding: '4px 12px', borderRadius: 20,
          background: gpmColor(calc.gpm) === 'var(--green)' ? 'rgba(34,192,122,0.12)'
            : gpmColor(calc.gpm) === 'var(--amber)' ? 'rgba(245,158,11,0.12)'
            : 'rgba(242,90,90,0.12)',
          color: gpmColor(calc.gpm),
          fontSize: 12, fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          GPM {fP(calc.gpm)}
        </span>
      </div>

      {/* Standard Rate Comparison (for commercial vehicles) */}
      {stdRate && (
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 8,
          background: 'var(--surface2)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>
            vs Standard Flat Rate
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text3)' }}>Standard ({stdRate.name})</span>
              <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{fM(stdRate.pay)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text3)' }}>Your Labor</span>
              <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{fM(calc.labor)}</span>
            </div>
            {(() => {
              const diff = calc.labor - stdRate.pay
              const color = diff >= 0 ? 'var(--green)' : 'var(--red)'
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingTop: 3, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color, fontWeight: 700 }}>Difference</span>
                  <span style={{ color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                    {diff >= 0 ? '+' : ''}{fM(diff)}
                  </span>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
