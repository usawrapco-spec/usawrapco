'use client'

import { Zap } from 'lucide-react'
import type { OutputBarItem } from './types'
import { gpmColor } from './types'

interface Props {
  items: OutputBarItem[]
  gpm: number
  gp: number
  autoPrice: number
  gpmTarget?: number
  onApplyAutoPrice: () => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function OutputBar({ items, gpm, gp, autoPrice, gpmTarget = 73, onApplyAutoPrice, canWrite }: Props) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 10,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Summary metrics row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0,
        borderBottom: '1px solid var(--border)',
      }}>
        {items.map((item, i) => (
          <div key={item.label} style={{
            padding: '6px 10px',
            borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            minWidth: 0,
          }}>
            <div style={{
              fontSize: 8,
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'Barlow Condensed, sans-serif',
              marginBottom: 1,
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              fontWeight: 700,
              color: item.color || 'var(--text1)',
              whiteSpace: 'nowrap',
            }}>
              {item.value}
            </div>
          </div>
        ))}

        {/* GPM — always last */}
        <div style={{ padding: '6px 10px', marginLeft: 'auto' }}>
          <div style={{
            fontSize: 8,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 1,
          }}>
            GPM
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            fontWeight: 800,
            color: gpmColor(gpm),
          }}>
            {gpm.toFixed(1)}% <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>({fmtC(gp)} GP)</span>
          </div>
        </div>
      </div>

      {/* Auto-price button */}
      <button
        onClick={() => canWrite && autoPrice > 0 && onApplyAutoPrice()}
        disabled={!canWrite || autoPrice === 0}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(34,192,122,0.10) 0%, rgba(79,127,255,0.10) 100%)',
          border: 'none',
          cursor: canWrite && autoPrice > 0 ? 'pointer' : 'not-allowed',
          color: autoPrice > 0 ? 'var(--green)' : 'var(--text3)',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'Barlow Condensed, sans-serif',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          opacity: autoPrice === 0 ? 0.5 : 1,
        }}
      >
        <Zap size={10} />
        Hit {gpmTarget}% GPM — Set Price to {fmtC(autoPrice)}
      </button>
    </div>
  )
}
