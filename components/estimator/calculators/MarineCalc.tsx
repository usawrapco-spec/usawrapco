'use client'

import { Anchor } from 'lucide-react'
import type { LineItemState } from '@/lib/estimator/types'
import { calcMarineSqft } from '@/lib/estimator/pricing'

interface MarineCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

const PASS_OPTIONS = [1, 2, 3]

export default function MarineCalc({ item, onChange }: MarineCalcProps) {
  const hullLength = item.marHullLength || 0
  const hullHeight = item.marHullHeight || 0
  const passes = item.marPasses || 2
  const transom = item.marTransom || false

  const marine = calcMarineSqft(hullLength, hullHeight, passes, transom)

  function update(overrides: Partial<LineItemState>) {
    const l = overrides.marHullLength ?? hullLength
    const h = overrides.marHullHeight ?? hullHeight
    const p = overrides.marPasses ?? passes
    const t = overrides.marTransom ?? transom
    const calc = calcMarineSqft(l, h, p, t)
    onChange({ ...overrides, sqft: calc.withWaste + calc.transomSqft })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hull Length + Height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={lbl}>Hull Length (ft)</label>
          <input
            type="number"
            value={hullLength || ''}
            onChange={e => update({ marHullLength: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 24"
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Hull Height (ft)</label>
          <input
            type="number"
            value={hullHeight || ''}
            onChange={e => update({ marHullHeight: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 4"
            style={inp}
          />
        </div>
      </div>

      {/* Passes */}
      <div>
        <label style={lbl}>Passes</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PASS_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => update({ marPasses: p })}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, minHeight: 44,
                border: passes === p ? '2px solid var(--cyan)' : '1px solid var(--border)',
                background: passes === p ? 'rgba(34,211,238,0.12)' : 'var(--surface2)',
                color: passes === p ? 'var(--cyan)' : 'var(--text2)',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Transom */}
      <button
        onClick={() => update({ marTransom: !transom })}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8, minHeight: 44,
          border: transom ? '2px solid var(--green)' : '1px solid var(--border)',
          background: transom ? 'rgba(34,192,122,0.12)' : 'var(--surface2)',
          color: transom ? 'var(--green)' : 'var(--text2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase',
        }}
      >
        <Anchor size={16} />
        Include Transom
      </button>

      {/* Marine calculation breakdown */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px 14px', borderRadius: 8,
        background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Net Sqft (both sides)</span>
          <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.netSqft}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>+20% waste buffer</span>
          <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.withWaste}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Linear ft/side ({passes} pass)</span>
          <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.linearFtPerSide}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Total to order (ft)</span>
          <span style={{ color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{marine.totalToOrder}</span>
        </div>
        {transom && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Transom sqft</span>
            <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>+{marine.transomSqft}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(34,211,238,0.15)', paddingTop: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>
            54" wide (4.5ft) material. No rivets/screws.
          </span>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  fontFamily: "'Barlow Condensed', sans-serif",
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text1)',
  outline: 'none', fontFamily: "'JetBrains Mono', monospace", minHeight: 38,
}
