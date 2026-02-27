'use client'

import { Truck } from 'lucide-react'
import type { LineItemState } from '@/lib/estimator/types'
import { calcBoxTruckSqft } from '@/lib/estimator/pricing'

interface BoxTruckCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

const SIDES = [
  { key: 'left', label: 'Driver Side' },
  { key: 'right', label: 'Passenger Side' },
  { key: 'rear', label: 'Rear Door' },
] as const

export default function BoxTruckCalc({ item, onChange }: BoxTruckCalcProps) {
  const sides = item.btSides || { left: true, right: true, rear: false }
  const length = item.btLength || 0
  const height = item.btHeight || 96

  const computedSqft = calcBoxTruckSqft(length, height, sides)

  function toggleSide(key: 'left' | 'right' | 'rear') {
    const updated = { ...sides, [key]: !sides[key] }
    const newSqft = calcBoxTruckSqft(length, height, updated)
    onChange({ btSides: updated, sqft: newSqft })
  }

  function handleLength(val: string) {
    const l = parseFloat(val) || 0
    const newSqft = calcBoxTruckSqft(l, height, sides)
    onChange({ btLength: l, sqft: newSqft })
  }

  function handleHeight(val: string) {
    const h = parseFloat(val) || 0
    const newSqft = calcBoxTruckSqft(length, h, sides)
    onChange({ btHeight: h, sqft: newSqft })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Length + Height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={lbl}>Box Length (ft)</label>
          <input
            type="number"
            value={length || ''}
            onChange={e => handleLength(e.target.value)}
            placeholder="e.g. 16"
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Box Height (inches)</label>
          <input
            type="number"
            value={height || ''}
            onChange={e => handleHeight(e.target.value)}
            placeholder="e.g. 96"
            style={inp}
          />
        </div>
      </div>

      {/* Side Selector Chips */}
      <div>
        <label style={lbl}>Sides to Wrap</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {SIDES.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSide(s.key)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, minHeight: 44,
                border: sides[s.key] ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: sides[s.key] ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                color: sides[s.key] ? 'var(--accent)' : 'var(--text2)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cab Add-On */}
      <button
        onClick={() => onChange({ btCab: !item.btCab })}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8, minHeight: 44,
          border: item.btCab ? '2px solid var(--green)' : '1px solid var(--border)',
          background: item.btCab ? 'rgba(34,192,122,0.12)' : 'var(--surface2)',
          color: item.btCab ? 'var(--green)' : 'var(--text2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase',
        }}
      >
        <Truck size={16} />
        Cab Add-On (+$1,950)
      </button>

      {/* Sqft Output */}
      <div style={{
        display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 8,
        background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
          Total Sqft: <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{computedSqft}</span>
        </span>
        {item.btCab && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>|</span>
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>+Cab $1,950</span>
          </>
        )}
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
