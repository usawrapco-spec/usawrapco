'use client'

import { useState, useEffect } from 'react'
import { Cloud, CloudRain, Sun, CloudSnow, Wind, AlertTriangle } from 'lucide-react'

interface WeatherData {
  temperature: number
  weatherCode: number
  condition: string
  icon: React.ReactNode
  alert?: string
}

const WEATHER_CODES: Record<number, { condition: string; icon: React.ReactNode }> = {
  0: { condition: 'Clear', icon: <Sun size={24} style={{ color: '#f59e0b' }} /> },
  1: { condition: 'Mostly Clear', icon: <Sun size={24} style={{ color: '#f59e0b' }} /> },
  2: { condition: 'Partly Cloudy', icon: <Cloud size={24} style={{ color: '#9299b5' }} /> },
  3: { condition: 'Overcast', icon: <Cloud size={24} style={{ color: '#5a6080' }} /> },
  45: { condition: 'Foggy', icon: <Cloud size={24} style={{ color: '#5a6080' }} /> },
  48: { condition: 'Foggy', icon: <Cloud size={24} style={{ color: '#5a6080' }} /> },
  51: { condition: 'Light Drizzle', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  53: { condition: 'Drizzle', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  55: { condition: 'Heavy Drizzle', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  61: { condition: 'Light Rain', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  63: { condition: 'Rain', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  65: { condition: 'Heavy Rain', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  71: { condition: 'Light Snow', icon: <CloudSnow size={24} style={{ color: '#22d3ee' }} /> },
  73: { condition: 'Snow', icon: <CloudSnow size={24} style={{ color: '#22d3ee' }} /> },
  75: { condition: 'Heavy Snow', icon: <CloudSnow size={24} style={{ color: '#22d3ee' }} /> },
  80: { condition: 'Rain Showers', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  81: { condition: 'Rain Showers', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  82: { condition: 'Heavy Rain Showers', icon: <CloudRain size={24} style={{ color: '#4f7fff' }} /> },
  95: { condition: 'Thunderstorm', icon: <CloudRain size={24} style={{ color: '#8b5cf6' }} /> },
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchWeather()
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchWeather() {
    try {
      // Gig Harbor WA coordinates
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=47.33&longitude=-122.58&current=temperature_2m,weather_code&temperature_unit=fahrenheit'
      )
      if (!res.ok) throw new Error('Weather fetch failed')

      const data = await res.json()
      const temp = Math.round(data.current.temperature_2m)
      const code = data.current.weather_code
      const weatherInfo = WEATHER_CODES[code] || WEATHER_CODES[0]

      // Smart alert for rain (outdoor install warning)
      const isRaining = code >= 51 && code <= 82
      const alert = isRaining ? 'Rain today — confirm outdoor installs' : undefined

      setWeather({
        temperature: temp,
        weatherCode: code,
        condition: weatherInfo.condition,
        icon: weatherInfo.icon,
        alert,
      })
      setLoading(false)
      setError(false)
    } catch (err) {
      console.error('Weather fetch error:', err)
      setError(true)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: '2px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading weather...</div>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Cloud size={24} style={{ color: 'var(--text3)' }} />
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
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {weather.icon}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 2,
          }}>
            Gig Harbor, WA
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--text1)',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
            marginBottom: 2,
          }}>
            {weather.temperature}°F
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            {weather.condition}
          </div>
        </div>
      </div>

      {weather.alert && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
            {weather.alert}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
