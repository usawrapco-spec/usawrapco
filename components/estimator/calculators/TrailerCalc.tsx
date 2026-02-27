'use client'

import type { LineItemState } from '@/lib/estimator/types'
import { calcTrailerSqft } from '@/lib/estimator/pricing'

interface TrailerCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

const SIDES = [
  { key: 'left', label: 'Driver' },
  { key: 'right', label: 'Passenger' },
  { key: 'front', label: 'Front Panel' },
  { key: 'rear', label: 'Rear Doors' },
] as const

const FRONT_COVERAGES = [
  { value: 'full', label: 'Full' },
  { value: 'threequarter', label: '3/4' },
  { value: 'half', label: '1/2' },
]

const VNOSE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'half_standard', label: '1/2 Standard' },
  { value: 'custom', label: 'Custom' },
]

export default function TrailerCalc({ item, onChange }: TrailerCalcProps) {
  const sides = item.trSides || { left: true, right: true, front: false, rear: false }
  const length = item.trLength || 0
  const height = item.trHeight || 0
  const frontCoverage = item.trFrontCoverage || 'full'
  const vnose = item.trVnose || 'none'

  function recalc(overrides: Partial<LineItemState>) {
    const s = overrides.trSides ?? sides
    const l = overrides.trLength ?? length
    const h = overrides.trHeight ?? height
    const fc = (overrides.trFrontCoverage ?? frontCoverage) as string
    const vn = (overrides.trVnose ?? vnose) as string
    const vh = overrides.trVnoseH ?? item.trVnoseH ?? 0
    const vl = overrides.trVnoseL ?? item.trVnoseL ?? 0
    const sqft = calcTrailerSqft(l, h, s as typeof sides, fc, vn, vh, vl)
    onChange({ ...overrides, sqft })
  }

  function toggleSide(key: 'left' | 'right' | 'front' | 'rear') {
    recalc({ trSides: { ...sides, [key]: !sides[key] } })
  }

  const computedSqft = calcTrailerSqft(length, height, sides, frontCoverage, vnose, item.trVnoseH || 0, item.trVnoseL || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Length + Height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={lbl}>Length (ft)</label>
          <input
            type="number"
            value={length || ''}
            onChange={e => recalc({ trLength: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 24"
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Height (ft)</label>
          <input
            type="number"
            value={height || ''}
            onChange={e => recalc({ trHeight: parseFloat(e.target.value) || 0 })}
            placeholder="e.g. 8"
            style={inp}
          />
        </div>
      </div>

      {/* Side Chips */}
      <div>
        <label style={lbl}>Sides to Wrap</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {SIDES.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSide(s.key)}
              style={{
                padding: '10px 8px', borderRadius: 8, minHeight: 44,
                border: sides[s.key] ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: sides[s.key] ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                color: sides[s.key] ? 'var(--accent)' : 'var(--text2)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.03em',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Front Panel Coverage (only if front is selected) */}
      {sides.front && (
        <div>
          <label style={lbl}>Front Panel Coverage</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {FRONT_COVERAGES.map(fc => (
              <button
                key={fc.value}
                onClick={() => recalc({ trFrontCoverage: fc.value })}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, minHeight: 38,
                  border: frontCoverage === fc.value ? '2px solid var(--cyan)' : '1px solid var(--border)',
                  background: frontCoverage === fc.value ? 'rgba(34,211,238,0.12)' : 'var(--surface2)',
                  color: frontCoverage === fc.value ? 'var(--cyan)' : 'var(--text2)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                {fc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* V-Nose */}
      <div>
        <label style={lbl}>V-Nose</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {VNOSE_OPTIONS.map(vo => (
            <button
              key={vo.value}
              onClick={() => recalc({ trVnose: vo.value })}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, minHeight: 38,
                border: vnose === vo.value ? '2px solid var(--purple)' : '1px solid var(--border)',
                background: vnose === vo.value ? 'rgba(139,92,246,0.12)' : 'var(--surface2)',
                color: vnose === vo.value ? 'var(--purple)' : 'var(--text2)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              {vo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom V-Nose dimensions */}
      {vnose === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={lbl}>V-Nose Height (ft)</label>
            <input
              type="number"
              value={item.trVnoseH || ''}
              onChange={e => recalc({ trVnoseH: parseFloat(e.target.value) || 0 })}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>V-Nose Length (ft)</label>
            <input
              type="number"
              value={item.trVnoseL || ''}
              onChange={e => recalc({ trVnoseL: parseFloat(e.target.value) || 0 })}
              style={inp}
            />
          </div>
        </div>
      )}

      {/* Sqft Output */}
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
          Total Sqft: <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{computedSqft}</span>
        </span>
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
