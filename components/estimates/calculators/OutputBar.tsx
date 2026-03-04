'use client'

import { useState } from 'react'
import type { OutputBarItem } from './types'
import { gpmColor } from './types'

interface Props {
  items: OutputBarItem[]
  gpm: number
  gp: number
  cogs: number                          // needed to calculate tier prices
  currentPrice?: number                 // to highlight active tier
  onSetPrice: (price: number) => void   // replaces onApplyAutoPrice
  canWrite: boolean
  // Legacy compat — ignored, use onSetPrice instead
  autoPrice?: number
  gpmTarget?: number
  onApplyAutoPrice?: () => void
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const priceAt = (cogs: number, gpmPct: number) => cogs > 0 ? Math.round(cogs / (1 - gpmPct / 100)) : 0

const TIERS = [
  { label: 'Min',      gpm: 65, color: 'var(--red)'   },
  { label: 'Discount', gpm: 70, color: 'var(--amber)'  },
  { label: 'Normal',   gpm: 75, color: 'var(--green)'  },
] as const

export default function OutputBar({
  items, gpm, gp, cogs, currentPrice, onSetPrice, canWrite,
  // legacy compat
  autoPrice, gpmTarget, onApplyAutoPrice,
}: Props) {
  const [sliderGpm, setSliderGpm] = useState(75)

  const sliderPrice = priceAt(cogs, sliderGpm)

  const handleSlider = (val: number) => {
    setSliderGpm(val)
    if (canWrite && cogs > 0) onSetPrice(priceAt(cogs, val))
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 10,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Summary metrics row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {items.map((item, i) => (
          <div key={item.label} style={{
            padding: '6px 10px',
            borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            minWidth: 0,
          }}>
            <div style={{
              fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
              letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 1, whiteSpace: 'nowrap',
            }}>
              {item.label}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
              color: item.color || 'var(--text1)', whiteSpace: 'nowrap',
            }}>
              {item.value}
            </div>
          </div>
        ))}

        {/* GPM — always last */}
        <div style={{ padding: '6px 10px', marginLeft: 'auto' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 1 }}>
            GPM
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 800, color: gpmColor(gpm) }}>
            {gpm.toFixed(1)}% <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>({fmtC(gp)} GP)</span>
          </div>
        </div>
      </div>

      {/* 3 Tier buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {TIERS.map((tier, i) => {
          const tierPrice = priceAt(cogs, tier.gpm)
          const isActive = currentPrice !== undefined && Math.abs(currentPrice - tierPrice) < 2
          return (
            <button
              key={tier.label}
              onClick={() => canWrite && cogs > 0 && onSetPrice(tierPrice)}
              disabled={!canWrite || cogs === 0}
              style={{
                padding: '7px 6px',
                border: 'none',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                background: isActive ? tier.color + '18' : 'transparent',
                cursor: canWrite && cogs > 0 ? 'pointer' : 'not-allowed',
                textAlign: 'center',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif', color: isActive ? tier.color : 'var(--text3)', marginBottom: 1 }}>
                {tier.label} {tier.gpm}%
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: isActive ? tier.color : 'var(--text2)' }}>
                {cogs > 0 ? fmtC(tierPrice) : '—'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Slider */}
      <div style={{ padding: '6px 10px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text3)' }}>
            Price at GPM
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: gpmColor(sliderGpm) }}>
            {sliderGpm}% → {cogs > 0 ? fmtC(sliderPrice) : '—'}
          </span>
        </div>
        <input
          type="range" min={60} max={85} step={1} value={sliderGpm}
          onChange={e => handleSlider(Number(e.target.value))}
          disabled={!canWrite || cogs === 0}
          style={{ width: '100%', cursor: canWrite ? 'pointer' : 'default', accentColor: gpmColor(sliderGpm) }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text3)', marginTop: 1 }}>
          <span style={{ color: 'var(--red)' }}>60% floor</span>
          <span>75% normal</span>
          <span>85% max</span>
        </div>
      </div>
    </div>
  )
}
