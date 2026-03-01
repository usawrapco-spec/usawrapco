'use client'
import { useState, useEffect } from 'react'
import { Cloud, Wind, Thermometer, Eye, RefreshCw, Droplets } from 'lucide-react'

interface ForecastPeriod {
  name: string
  temperature: number
  temperatureUnit: string
  windSpeed: string
  windDirection: string
  shortForecast: string
  detailedForecast: string
  isDaytime: boolean
  icon: string
}

interface WeatherData {
  periods: ForecastPeriod[]
  updated_at: string
  location: string
}

interface WeatherPanelProps {
  compact?: boolean
}

export default function WeatherPanel({ compact = false }: WeatherPanelProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/pnw/weather')
        if (!res.ok) throw new Error('Failed to load weather')
        const data = await res.json()
        setWeather(data)
      } catch {
        setError('Weather unavailable')
      } finally {
        setLoading(false)
      }
    }
    fetchWeather()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', fontSize: 12 }}>
        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
        Loading weather...
      </div>
    )
  }

  if (error || !weather) {
    return <div style={{ color: 'var(--text3)', fontSize: 12 }}>{error || 'No weather data'}</div>
  }

  const current = weather.periods[0]
  const displayPeriods = compact ? weather.periods.slice(0, 3) : weather.periods.slice(0, 6)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Cloud size={14} color="#9299b5" />
        <span style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14,
          fontWeight: 700, letterSpacing: 1, color: 'var(--text1)'
        }}>
          MARINE WEATHER
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 'auto' }}>
          Gig Harbor
        </span>
      </div>

      {current && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
          borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 28,
              fontWeight: 700, color: 'var(--text1)'
            }}>
              {current.temperature}&deg;{current.temperatureUnit}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{current.shortForecast}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wind size={11} color="var(--text3)" />
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                {current.windSpeed} {current.windDirection}
              </span>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayPeriods.slice(1).map((period, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', width: 70 }}>
                {period.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text1)', flex: 1, textAlign: 'center' }}>
                {period.shortForecast}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wind size={10} color="var(--text3)" />
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{period.windSpeed}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                  fontWeight: 700, color: period.isDaytime ? '#f59e0b' : '#4f7fff'
                }}>
                  {period.temperature}&deg;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 8, textAlign: 'right' }}>
        NWS via weather.gov
      </div>
    </div>
  )
}
