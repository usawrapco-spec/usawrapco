'use client'

import { useState } from 'react'
import { Waves, ChevronDown, ChevronUp } from 'lucide-react'

interface TidePrediction {
  time: string
  height: number
  type: 'H' | 'L'
}

interface TideEntry {
  id: string
  station_name: string
  prediction_date: string
  predictions: TidePrediction[] | unknown
}

interface Props {
  tides: TideEntry[]
  today: string
}

function parsePredictions(raw: unknown): TidePrediction[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (p): p is TidePrediction =>
      typeof p === 'object' &&
      p !== null &&
      'time' in p &&
      'height' in p &&
      'type' in p
  )
}

function formatTime(t: string): string {
  // Expects HH:MM or HH:MM:SS
  const parts = t.split(':')
  const h = parseInt(parts[0])
  const m = parts[1] ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDate(d: string): string {
  const date = new Date(d + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function TidePredictionRow({ pred }: { pred: TidePrediction }) {
  const isHigh = pred.type === 'H'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--surface2)' }}>
      <div style={{ width: 28, textAlign: 'center' }}>
        {isHigh ? (
          <ChevronUp size={16} color="var(--cyan)" />
        ) : (
          <ChevronDown size={16} color="var(--text2)" />
        )}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text2)', width: 80 }}>{formatTime(pred.time)}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: isHigh ? 'var(--cyan)' : 'var(--text2)', width: 70 }}>
        {pred.height > 0 ? '+' : ''}{pred.height.toFixed(1)} ft
      </span>
      <span style={{ fontSize: 11, color: isHigh ? 'var(--cyan)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {isHigh ? 'High' : 'Low'}
      </span>
    </div>
  )
}

export function TidePredictionsClient({ tides, today }: Props) {
  const [filterStation, setFilterStation] = useState('')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([today]))

  const stations = [...new Set(tides.map(t => t.station_name).filter(Boolean))]

  const filtered = tides.filter(t => {
    if (filterStation && t.station_name !== filterStation) return false
    return true
  })

  // Group by date
  const byDate = filtered.reduce<Record<string, TideEntry[]>>((acc, t) => {
    if (!acc[t.prediction_date]) acc[t.prediction_date] = []
    acc[t.prediction_date].push(t)
    return acc
  }, {})

  // Sort dates
  const sortedDates = Object.keys(byDate).sort()

  // Today's tides
  const todayEntries = byDate[today] ?? []

  function toggleDay(d: string) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const iStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid #2a2d3e',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Waves size={24} color="var(--cyan)" />
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Tide Predictions
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>Next 14 days</p>
          </div>
        </div>

        {stations.length > 1 && (
          <div>
            <select
              value={filterStation}
              onChange={e => setFilterStation(e.target.value)}
              style={iStyle}
            >
              <option value="">All stations</option>
              {stations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Today's Section — Prominent */}
      {todayEntries.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Waves size={16} color="var(--cyan)" />
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Today &mdash; {formatDate(today)}
            </h2>
          </div>
          {todayEntries.map(entry => {
            const preds = parsePredictions(entry.predictions)
            return (
              <div
                key={entry.id}
                style={{ background: 'var(--surface)', border: '2px solid rgba(34,211,238,0.3)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15, marginBottom: 10 }}>{entry.station_name}</div>
                {preds.length === 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: 13 }}>No predictions available</p>
                ) : (
                  <div>
                    {preds.map((p, i) => <TidePredictionRow key={i} pred={p} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar-style list for remaining days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedDates
          .filter(d => d !== today)
          .map(date => {
            const entries = byDate[date]
            const expanded = expandedDays.has(date)
            return (
              <div
                key={date}
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, overflow: 'hidden' }}
              >
                <button
                  onClick={() => toggleDay(date)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text1)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{formatDate(date)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{date}</span>
                    {entries.length > 0 && (() => {
                      const allPreds = entries.flatMap(e => parsePredictions(e.predictions))
                      const highs = allPreds.filter(p => p.type === 'H')
                      const lows = allPreds.filter(p => p.type === 'L')
                      const maxHigh = highs.length ? Math.max(...highs.map(p => p.height)) : null
                      const minLow = lows.length ? Math.min(...lows.map(p => p.height)) : null
                      return (
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {maxHigh != null && <span style={{ color: 'var(--cyan)' }}>H: {maxHigh.toFixed(1)} ft</span>}
                          {maxHigh != null && minLow != null && <span style={{ color: 'var(--text3)', margin: '0 6px' }}>/</span>}
                          {minLow != null && <span style={{ color: 'var(--text2)' }}>L: {minLow.toFixed(1)} ft</span>}
                        </span>
                      )
                    })()}
                  </div>
                  {expanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                </button>

                {expanded && (
                  <div style={{ padding: '0 16px 12px' }}>
                    {entries.map(entry => {
                      const preds = parsePredictions(entry.predictions)
                      return (
                        <div key={entry.id} style={{ marginBottom: 8 }}>
                          {entries.length > 1 && (
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>{entry.station_name}</div>
                          )}
                          {preds.length === 0 ? (
                            <p style={{ color: 'var(--text3)', fontSize: 12 }}>No predictions</p>
                          ) : (
                            preds.map((p, i) => <TidePredictionRow key={i} pred={p} />)
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {tides.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <Waves size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p>No tide predictions available.</p>
        </div>
      )}
    </div>
  )
}
