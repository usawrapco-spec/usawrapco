'use client'

import type { LineItemState } from '@/lib/estimator/types'
import { PRODUCT_TYPE_LABELS } from '@/lib/estimator/vehicleDb'

interface CustomCalcProps {
  item: LineItemState
  onChange: (updates: Partial<LineItemState>) => void
}

export default function CustomCalc({ item, onChange }: CustomCalcProps) {
  const typeLabel = PRODUCT_TYPE_LABELS[item.type] || 'Custom'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={lbl}>Square Footage</label>
        <input
          type="number"
          value={item.sqft || ''}
          onChange={e => onChange({ sqft: parseFloat(e.target.value) || 0 })}
          placeholder={`Enter total sqft for ${typeLabel.toLowerCase()}`}
          style={inp}
        />
      </div>

      {item.sqft > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
            {typeLabel} | Sqft:{' '}
            <span style={{ color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>
              {item.sqft}
            </span>
          </span>
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

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text1)',
  outline: 'none', fontFamily: "'JetBrains Mono', monospace", minHeight: 38,
}
