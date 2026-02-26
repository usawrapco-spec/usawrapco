'use client'

import { useState, useEffect, useRef } from 'react'
import { Truck, MapPin, CheckCircle, AlertTriangle } from 'lucide-react'

interface Props {
  fleetSize: number
  totalMiles: number
  wrappedCount: number
  unwrappedCount: number
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const start = ref.current
    const diff = target - start
    if (diff === 0) return
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = Math.round(start + diff * eased)
      setValue(current)
      ref.current = current
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

export default function FleetStatsCards({ fleetSize, totalMiles, wrappedCount, unwrappedCount }: Props) {
  const cards = [
    { label: 'Fleet Size', value: useCountUp(fleetSize), icon: Truck, color: 'var(--accent)' },
    { label: 'Total Miles', value: useCountUp(Math.round(totalMiles)), icon: MapPin, color: 'var(--cyan)' },
    { label: 'Wrapped', value: useCountUp(wrappedCount), icon: CheckCircle, color: 'var(--green)' },
    { label: 'Unwrapped Opportunities', value: useCountUp(unwrappedCount), icon: AlertTriangle, color: 'var(--amber)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div key={i} className="stat-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="metric-label">{card.label}</span>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `${card.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} style={{ color: card.color }} />
              </div>
            </div>
            <span style={{
              fontSize: 28, fontWeight: 900, color: 'var(--text1)',
              fontFamily: 'JetBrains Mono, monospace',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {card.value.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
