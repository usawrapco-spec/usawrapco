'use client'
import { useState, useEffect } from 'react'
import { Waves, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

interface TidePrediction {
  time: string
  type: 'H' | 'L'
  height_ft: number
}

interface TideData {
  station: string
  predictions: TidePrediction[]
  current_height: number
  trend: 'rising' | 'falling'
  updated_at: string
}

interface TidePanelProps {
  station?: string
  compact?: boolean
}

export default function TidePanel({ station = 'gig_harbor', compact = true }: TidePanelProps) {
  const [tideData, setTideData] = useState<TideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTides = async () => {
      try {
        const res = await fetch(`/api/pnw/tides?station=${station}`)
        if (!res.ok) throw new Error('Failed to load tide data')
        const data = await res.json()
        setTideData(data)
      } catch (e) {
        setError('Tide data unavailable')
      } finally {
        setLoading(false)
      }
    }
    fetchTides()
  }, [station])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', fontSize: 12 }}>
        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
        Loading tides...
      </div>
    )
  }

  if (error || !tideData) {
    return <div style={{ color: 'var(--text3)', fontSize: 12 }}>{error || 'No tide data'}</div>
  }

  const TrendIcon = tideData.trend === 'rising' ? TrendingUp : TrendingDown
  const trendColor = tideData.trend === 'rising' ? '#22c07a' : '#f59e0b'
  const nextTides = tideData.predictions.slice(0, compact ? 2 : 4)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Waves size={14} color="#22d3ee" />
        <span style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14,
          fontWeight: 700, letterSpacing: 1, color: 'var(--text1)'
        }}>
          TIDES
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 'auto' }}>
          Gig Harbor
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 24,
            fontWeight: 700, color: 'var(--text1)'
          }}>
            {tideData.current_height.toFixed(1)}&apos;
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>current height</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendIcon size={16} color={trendColor} />
          <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>
            {tideData.trend === 'rising' ? 'Rising' : 'Falling'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {nextTides.map((t, i) => {
          const date = new Date(t.time)
          const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px', borderRadius: 6,
              background: t.type === 'H' ? 'rgba(34,208,122,0.08)' : 'rgba(242,90,90,0.08)'
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                color: t.type === 'H' ? '#22c07a' : '#f25a5a',
                fontFamily: 'Barlow Condensed, sans-serif'
              }}>
                {t.type === 'H' ? 'HIGH' : 'LOW'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{timeStr}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                fontWeight: 700, color: 'var(--text1)'
              }}>
                {t.height_ft.toFixed(1)}&apos;
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 8, textAlign: 'right' }}>
        NOAA Station 9446484
      </div>
    </div>
  )
}
