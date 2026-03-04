'use client'

import { Anchor } from 'lucide-react'
import type { LineItemState } from '@/lib/estimator/types'
import { calcMarineSqft } from '@/lib/estimator/pricing'

interface MarineCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

type WrapType = 'printed' | 'color_change'

export default function MarineCalc({ item, onChange }: MarineCalcProps) {
  const hullLength = item.marHullLength || 0
  const hullHeight = item.marHullHeight || 24  // inches, default 24"
  const wrapType: WrapType = item.marWrapType || 'printed'
  const transom = item.marTransom || false
  const transomWidth = item.marTransomWidth || 72
  const transomHeight = item.marTransomHeight || 24

  const marine = calcMarineSqft(
    hullLength, hullHeight, wrapType, transom,
    transomWidth, transomHeight, item.matRate || 2.10
  )

  function update(overrides: Partial<LineItemState>) {
    const l = overrides.marHullLength ?? hullLength
    const h = overrides.marHullHeight ?? hullHeight
    const wt: WrapType = (overrides.marWrapType as WrapType) ?? wrapType
    const t = overrides.marTransom ?? transom
    const tw = overrides.marTransomWidth ?? transomWidth
    const th = overrides.marTransomHeight ?? transomHeight
    const calc = calcMarineSqft(l, h, wt, t, tw, th, item.matRate || 2.10)
    onChange({ ...overrides, sqft: calc.boatSqft })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Wrap Type */}
      <div>
        <label style={lbl}>Wrap Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['printed', 'Printed (54")'], ['color_change', 'Color Change (60")']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => update({ marWrapType: k })}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, minHeight: 44,
                border: wrapType === k ? '2px solid var(--cyan)' : '1px solid var(--border)',
                background: wrapType === k ? 'rgba(34,211,238,0.12)' : 'var(--surface2)',
                color: wrapType === k ? 'var(--cyan)' : 'var(--text2)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          Max height/panel: {marine.maxHeightIn}&quot; ({marine.rollWidthIn}&quot; roll)
        </div>
      </div>

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
          <label style={lbl}>Hull Height (inches)</label>
          <input
            type="number"
            value={hullHeight || ''}
            onChange={e => update({ marHullHeight: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 24"
            style={inp}
          />
          {hullHeight > marine.maxHeightIn && (
            <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 3 }}>
              Over {marine.maxHeightIn}&quot; — 2 panels per side
            </div>
          )}
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

      {/* Transom Dimensions */}
      {transom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={lbl}>Transom Width (in)</label>
            <input
              type="number"
              value={transomWidth || ''}
              onChange={e => update({ marTransomWidth: parseFloat(e.target.value) || 0 })}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Transom Height (in)</label>
            <input
              type="number"
              value={transomHeight || ''}
              onChange={e => update({ marTransomHeight: parseFloat(e.target.value) || 0 })}
              style={inp}
            />
          </div>
        </div>
      )}

      {/* Marine calculation breakdown */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px 14px', borderRadius: 8,
        background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Boat Sqft</span>
          <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.boatSqft}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Panels per Side</span>
          <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.panels}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Linear ft to order</span>
          <span style={{ color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{marine.totalLinearFt}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Total material sqft</span>
          <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.totalMaterialSqft}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Waste sqft</span>
          <span style={{ color: 'var(--amber)', fontFamily: "'JetBrains Mono', monospace" }}>{marine.wasteSqft}</span>
        </div>
        {transom && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Transom sqft</span>
            <span style={{ color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>+{marine.transomSqft}</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(34,211,238,0.15)', paddingTop: 6, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>
            {marine.rollWidthIn}&quot; roll — {marine.maxHeightIn}&quot; max height/panel — waste charged at 2× rate
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
