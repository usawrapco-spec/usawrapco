'use client'

import { Briefcase, FileText } from 'lucide-react'
import type { LineItemState, LineItemCalc } from '@/lib/estimator/types'
import { calcLineItem, calcTotals } from '@/lib/estimator/pricing'
import { PRODUCT_TYPE_LABELS } from '@/lib/estimator/vehicleDb'

interface TotalsSidebarProps {
  items: LineItemState[]
  onConvertToJob: () => void
  onBuildProposal: () => void
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fP = (n: number) => Math.round(n) + '%'

function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

function Pill({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
      background: `${color}15`, color, fontFamily: "'JetBrains Mono', monospace",
    }}>
      {label} {fP(pct)}
    </span>
  )
}

export default function TotalsSidebar({ items, onConvertToJob, onBuildProposal }: TotalsSidebarProps) {
  const totals = calcTotals(items)
  const nonOptional = items.filter(i => !i.isOptional)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      padding: 16, borderRadius: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        fontSize: 11, fontWeight: 800, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        Order Summary
      </div>

      {/* Per-item rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => {
          const calc = item._calc || calcLineItem(item)
          const matPct = calc.salePrice > 0 ? (calc.matCost / calc.salePrice) * 100 : 0
          const desPct = calc.salePrice > 0 ? (calc.design / calc.salePrice) * 100 : 0
          return (
            <div
              key={item.id}
              style={{
                padding: '10px 12px', borderRadius: 8,
                background: item.isOptional ? 'rgba(245,158,11,0.06)' : 'var(--surface2)',
                border: item.isOptional ? '1px dashed var(--amber)' : '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: item.isOptional ? 'var(--amber)' : 'var(--text1)',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {item.isOptional && '* '}{item.name || `Item ${i + 1}`}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: 'var(--text1)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {fM(calc.salePrice)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Pill label="Mat" pct={matPct} color="var(--amber)" />
                <Pill label="Labor" pct={calc.effectiveLaborPct} color="var(--cyan)" />
                <Pill label="Design" pct={desPct} color="var(--purple)" />
                <Pill label="GPM" pct={calc.gpm} color={gpmColor(calc.gpm)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Aggregate Section */}
      {nonOptional.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 0,
          borderTop: '2px solid var(--border)', paddingTop: 12,
        }}>
          {[
            { label: 'Total Revenue', value: totals.totalRevenue, pct: 100, color: 'var(--text1)', bold: true },
            { label: 'Material', value: totals.totalMaterial, pct: totals.totalRevenue > 0 ? (totals.totalMaterial / totals.totalRevenue) * 100 : 0, color: 'var(--amber)' },
            { label: 'Labor', value: totals.totalLabor, pct: totals.totalRevenue > 0 ? (totals.totalLabor / totals.totalRevenue) * 100 : 0, color: 'var(--cyan)' },
            { label: 'Design', value: totals.totalDesign, pct: totals.totalRevenue > 0 ? (totals.totalDesign / totals.totalRevenue) * 100 : 0, color: 'var(--purple)' },
            { label: 'COGS', value: totals.totalCogs, pct: totals.totalRevenue > 0 ? (totals.totalCogs / totals.totalRevenue) * 100 : 0, color: 'var(--text2)', bold: true },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 40px 70px',
                padding: '6px 0',
                borderBottom: row.bold ? '1px solid var(--border)' : undefined,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 11, color: row.bold ? 'var(--text1)' : 'var(--text3)', fontWeight: row.bold ? 700 : 600 }}>
                {row.label}
              </span>
              <span style={{
                fontSize: 10, color: row.color, fontWeight: 700, textAlign: 'right',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fP(row.pct)}
              </span>
              <span style={{
                fontSize: 12, color: row.bold ? 'var(--text1)' : 'var(--text2)', fontWeight: 600, textAlign: 'right',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fM(row.value)}
              </span>
            </div>
          ))}

          {/* Gross Profit */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 40px 70px',
            padding: '10px 0', marginTop: 4, alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: gpmColor(totals.blendedGPM), fontWeight: 800, textTransform: 'uppercase' }}>
              Gross Profit
            </span>
            <span style={{
              fontSize: 11, color: gpmColor(totals.blendedGPM), fontWeight: 800, textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fP(totals.blendedGPM)}
            </span>
            <span style={{
              fontSize: 14, color: gpmColor(totals.blendedGPM), fontWeight: 800, textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fM(totals.totalProfit)}
            </span>
          </div>

          {/* Blended GPM */}
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '8px 0',
          }}>
            <span style={{
              padding: '6px 16px', borderRadius: 20,
              background: gpmColor(totals.blendedGPM) === 'var(--green)' ? 'rgba(34,192,122,0.15)'
                : gpmColor(totals.blendedGPM) === 'var(--amber)' ? 'rgba(245,158,11,0.15)'
                : 'rgba(242,90,90,0.15)',
              color: gpmColor(totals.blendedGPM),
              fontSize: 14, fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Blended GPM: {fP(totals.blendedGPM)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onConvertToJob}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'var(--accent)', border: 'none', color: '#fff',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.06em',
            minHeight: 44,
          }}
        >
          <Briefcase size={16} />
          Convert to Job
        </button>
        <button
          onClick={onBuildProposal}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.06em',
            minHeight: 44,
          }}
        >
          <FileText size={16} />
          Build Proposal
        </button>
      </div>
    </div>
  )
}
