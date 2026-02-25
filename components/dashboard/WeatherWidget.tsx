'use client'

import { useState, useEffect } from 'react'
import { CloudRain, Cloud, Sun, CloudSnow, Zap, Wind, Droplets } from 'lucide-react'

interface DayForecast {
  date: string
  dayName: string
  dayNum: number
  code: number
  high: number
  low: number
  precip: number
  wind: number
  precipProb: number
  severity: 'good' | 'caution' | 'bad' | 'danger'
}

function weatherCodeInfo(code: number): { label: string; severity: 'good' | 'caution' | 'bad' | 'danger' } {
  if (code === 0) return { label: 'Clear', severity: 'good' }
  if (code <= 3) return { label: 'Partly Cloudy', severity: 'good' }
  if (code <= 48) return { label: 'Foggy', severity: 'caution' }
  if (code <= 57) return { label: 'Drizzle', severity: 'caution' }
  if (code <= 67) return { label: 'Rain', severity: 'bad' }
  if (code <= 77) return { label: 'Snow', severity: 'bad' }
  if (code <= 82) return { label: 'Rain Showers', severity: 'bad' }
  if (code <= 86) return { label: 'Snow Showers', severity: 'bad' }
  if (code <= 99) return { label: 'Thunderstorm', severity: 'danger' }
  return { label: 'Unknown', severity: 'good' }
}

function installSeverity(code: number, minTemp: number, maxTemp: number, precip: number, precipProb: number, wind: number): 'good' | 'caution' | 'bad' | 'danger' {
  if (code >= 95) return 'danger'
  if (precipProb > 40 || precip > 0.1) return 'bad'
  if (minTemp < 50 || maxTemp > 95) return 'bad'
  if (wind > 20) return 'bad'
  if (precipProb > 20 || minTemp < 55) return 'caution'
  return 'good'
}

function WeatherIcon({ code, size = 20 }: { code: number; size?: number }) {
  const color =
    code >= 95 ? '#8b5cf6' :
    code >= 51 ? '#4f7fff' :
    code >= 45 ? '#9299b5' :
    code >= 1 ? '#9299b5' : '#f59e0b'

  if (code >= 95) return <Zap size={size} style={{ color }} />
  if (code >= 51 && code <= 82) return <CloudRain size={size} style={{ color }} />
  if (code >= 71 && code <= 77) return <CloudSnow size={size} style={{ color: '#22d3ee' }} />
  if (code >= 45) return <Cloud size={size} style={{ color }} />
  if (code >= 1) return <Cloud size={size} style={{ color }} />
  return <Sun size={size} style={{ color }} />
}

const SEVERITY_COLORS = {
  good:    { border: '#22c07a', bg: 'rgba(34,192,122,0.08)', label: '#22c07a' },
  caution: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: '#f59e0b' },
  bad:     { border: '#f25a5a', bg: 'rgba(242,90,90,0.08)',   label: '#f25a5a' },
  danger:  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  label: '#8b5cf6' },
}

export default function WeatherWidget() {
  const [forecast, setForecast] = useState<DayForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchForecast()
    const interval = setInterval(fetchForecast, 60 * 60 * 1000) // refresh hourly
    return () => clearInterval(interval)
  }, [])

  async function fetchForecast() {
    try {
      const res = await fetch('/api/weather?lat=47.3318&lng=-122.5793')
      if (!res.ok) throw new Error('Weather failed')
      const data = await res.json()

      if (!data.daily?.time) throw new Error('No daily data')

      const days: DayForecast[] = data.daily.time.map((dateStr: string, i: number) => {
        const date = new Date(dateStr + 'T12:00:00') // noon to avoid TZ issues
        const code: number = data.daily.weathercode[i]
        const high: number = Math.round(data.daily.temperature_2m_max[i])
        const low: number = Math.round(data.daily.temperature_2m_min[i])
        const precip: number = data.daily.precipitation_sum[i]
        const wind: number = Math.round(data.daily.windspeed_10m_max[i])
        const precipProb: number = data.daily.precipitation_probability_max[i]
        const sev = installSeverity(code, low, high, precip, precipProb, wind)
        return {
          date: dateStr,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: date.getDate(),
          code, high, low, precip, wind, precipProb,
          severity: sev,
        }
      })

      setForecast(days)
      setLoading(false)
      setError(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 20px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          7-Day Forecast — Gig Harbor, WA
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 80, background: 'var(--surface2)', borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || forecast.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Cloud size={20} style={{ color: 'var(--text3)' }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Gig Harbor, WA
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Weather unavailable</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        7-Day Forecast — Gig Harbor, WA
      </div>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
        {forecast.map((day) => {
          const isToday = day.date === today
          const colors = SEVERITY_COLORS[day.severity]
          return (
            <div
              key={day.date}
              style={{
                flex: '1 0 64px', minWidth: 56, textAlign: 'center',
                padding: '8px 4px', borderRadius: 8,
                background: isToday ? colors.bg : 'var(--surface2)',
                border: `1px solid ${isToday ? colors.border : day.severity !== 'good' ? colors.border + '55' : 'var(--border)'}`,
                boxShadow: isToday ? `0 0 0 1px ${colors.border}40` : 'none',
              }}
              title={`Install weather: ${day.severity}`}
            >
              <div style={{
                fontSize: 9, fontWeight: 800, color: isToday ? colors.label : 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
              }}>
                {isToday ? 'Today' : day.dayName}
              </div>
              <WeatherIcon code={day.code} size={18} />
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: 'var(--text1)',
                fontFamily: 'JetBrains Mono, monospace',
                marginTop: 4, lineHeight: 1.2,
              }}>
                {day.high}°
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text3)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {day.low}°
              </div>
              {day.precipProb > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  fontSize: 9, color: day.precipProb > 40 ? '#f25a5a' : 'var(--text3)',
                  marginTop: 2, fontWeight: 600,
                }}>
                  <Droplets size={8} />
                  {day.precipProb}%
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(['good', 'caution', 'bad', 'danger'] as const).map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: SEVERITY_COLORS[s].border }} />
            <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'capitalize' }}>
              {s === 'good' ? 'Good install' : s === 'caution' ? 'Caution' : s === 'bad' ? 'Bad for vinyl' : 'Danger'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
