'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Layers, Cloud, Waves, Radio, Sparkles, RefreshCw,
  TrendingUp, TrendingDown, Wind, Eye, Thermometer,
  X, Fish, Anchor, AlertTriangle, MapPin, Fuel, Map,
  Navigation, Zap, Mountain, Users,
} from 'lucide-react'

const AIChat = dynamic(() => import('./AIChat'), { ssr: false })
const VHFBroadcastPanel = dynamic(() => import('./VHFBroadcastPanel'), { ssr: false })
const GigHarborMarina = dynamic(() => import('./GigHarborMarina'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────────

interface LayerDef {
  key: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  category: 'navigation' | 'fishing' | 'conditions' | 'overlay'
}

interface ForecastPeriod {
  name: string
  temperature: number
  temperatureUnit: string
  windSpeed: string
  windDirection: string
  shortForecast: string
  isDaytime: boolean
}

interface WeatherData {
  current?: ForecastPeriod
  forecast?: ForecastPeriod[]
  marineForecast?: Array<{ name: string; detailedForecast: string }>
  updated_at?: string
}

interface TidePrediction {
  time: string
  type: 'H' | 'L'
  height_ft: number
}

interface TideData {
  station?: string
  predictions?: TidePrediction[]
  current_height?: number
  trend?: 'rising' | 'falling'
  updated_at?: string
}

interface PNWSidebarProps {
  activeLayers: Set<string>
  onLayerToggle: (key: string) => void
  onClose?: () => void
  isMobile?: boolean
}

type SidebarTab = 'layers' | 'weather' | 'tides' | 'vhf' | 'ai' | 'harbor'

// ── Layer Definitions ─────────────────────────────────────────────────────────

const LAYER_GROUPS: { label: string; category: LayerDef['category']; layers: LayerDef[] }[] = [
  {
    label: 'FISHING & MARINE',
    category: 'fishing',
    layers: [
      { key: 'fish-zones', label: 'Fish Zones', description: 'Seasonal fishing hotspots with species info', icon: Fish, color: '#22d3ee', category: 'fishing' },
      { key: 'fishing', label: 'Fishing Spots', description: 'Known spots from the PNW database', icon: MapPin, color: '#4f7fff', category: 'fishing' },
      { key: 'depth', label: 'Depth Chart', description: 'NOAA nautical chart overlay with depths', icon: Mountain, color: '#22d3ee', category: 'fishing' },
      { key: 'wildlife', label: 'Wildlife', description: 'Orca, seal, eagle sighting reports', icon: Eye, color: '#22c07a', category: 'fishing' },
    ],
  },
  {
    label: 'NAVIGATION',
    category: 'navigation',
    layers: [
      { key: 'marinas', label: 'Marinas', description: 'Marinas, docks, and yacht clubs', icon: Anchor, color: '#22d3ee', category: 'navigation' },
      { key: 'launches', label: 'Boat Launches', description: 'Public boat ramps and launches', icon: Navigation, color: '#22c07a', category: 'navigation' },
      { key: 'fuel', label: 'Fuel Docks', description: 'Marine fuel docks and gas stations', icon: Fuel, color: '#f59e0b', category: 'navigation' },
      { key: 'hazards', label: 'Hazards', description: 'Rocks, shoals, and navigation hazards', icon: AlertTriangle, color: '#f25a5a', category: 'navigation' },
    ],
  },
  {
    label: 'CONDITIONS',
    category: 'conditions',
    layers: [
      { key: 'tides', label: 'Tide Stations', description: 'Tide station markers with predictions', icon: Waves, color: '#4f7fff', category: 'conditions' },
      { key: 'weather', label: 'Weather', description: 'Live weather conditions overlay', icon: Cloud, color: '#9299b5', category: 'conditions' },
      { key: 'traffic', label: 'Road Traffic', description: 'Live traffic on SR-16 and Highway 3', icon: Zap, color: '#f59e0b', category: 'conditions' },
    ],
  },
]

// ── Sidebar Tabs ───────────────────────────────────────────────────────────────

const TABS: { id: SidebarTab; label: string; icon: React.ElementType }[] = [
  { id: 'layers', label: 'LAYERS', icon: Layers },
  { id: 'harbor', label: 'GIG HBR', icon: Anchor },
  { id: 'weather', label: 'WEATHER', icon: Cloud },
  { id: 'tides', label: 'TIDES', icon: Waves },
  { id: 'vhf', label: 'VHF', icon: Radio },
  { id: 'ai', label: 'AI', icon: Sparkles },
]

// ── Weather Panel ──────────────────────────────────────────────────────────────

function WeatherContent() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/pnw/weather')
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div style={{ padding: '20px 0', textAlign: 'center', color: '#5a6080', fontSize: 12 }}>
      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
      Loading weather...
    </div>
  )

  if (!data?.current) return (
    <div style={{ padding: '20px 0', textAlign: 'center', color: '#5a6080', fontSize: 12 }}>
      Weather data unavailable. Check marine.weather.gov
    </div>
  )

  const windNum = parseInt(data.current.windSpeed?.match(/\d+/)?.[0] || '0', 10)
  const isSmallCraft = windNum >= 21
  const isStorm = windNum >= 34

  return (
    <div>
      {/* Alert */}
      {isSmallCraft && (
        <div style={{
          marginBottom: 12, padding: '8px 12px',
          background: isStorm ? 'rgba(242,90,90,0.12)' : 'rgba(245,158,11,0.12)',
          border: `1px solid ${isStorm ? 'rgba(242,90,90,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} color={isStorm ? '#f25a5a' : '#f59e0b'} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: isStorm ? '#f25a5a' : '#f59e0b', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.5 }}>
              {isStorm ? 'STORM WARNING ACTIVE' : 'SMALL CRAFT ADVISORY'}
            </div>
            <div style={{ fontSize: 10, color: '#9299b5' }}>Winds {data.current.windSpeed}</div>
          </div>
        </div>
      )}

      {/* Current conditions */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: '16px 14px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 42, fontWeight: 700, color: '#e8eaed', lineHeight: 1 }}>
              {data.current.temperature}&deg;
            </div>
            <div style={{ fontSize: 11, color: '#9299b5', marginTop: 4 }}>{data.current.shortForecast}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 4 }}>
              <Wind size={12} color="#9299b5" />
              <span style={{ fontSize: 12, color: '#e8eaed', fontFamily: 'JetBrains Mono, monospace' }}>{data.current.windSpeed}</span>
            </div>
            <div style={{ fontSize: 11, color: '#5a6080' }}>{data.current.windDirection}</div>
            <button
              onClick={() => load(true)}
              style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 0 }}
            >
              <RefreshCw size={11} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
          </div>
        </div>
      </div>

      {/* Marine forecast */}
      {data.marineForecast && data.marineForecast.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#5a6080', marginBottom: 6 }}>
            MARINE FORECAST — PUGET SOUND
          </div>
          {data.marineForecast.slice(0, 2).map((m, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 8,
              padding: '10px 12px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#22d3ee', letterSpacing: 0.5, marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ fontSize: 11, color: '#9299b5', lineHeight: 1.5 }}>{m.detailedForecast}</div>
            </div>
          ))}
        </div>
      )}

      {/* 5-day forecast */}
      {data.forecast && data.forecast.length > 0 && (
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#5a6080', marginBottom: 8 }}>
            EXTENDED FORECAST
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.forecast.slice(0, 6).map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', background: 'rgba(255,255,255,0.03)',
                borderRadius: 7, border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 11, color: '#9299b5', width: 72, flexShrink: 0 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: '#e8eaed', flex: 1, textAlign: 'center', padding: '0 8px' }}>{p.shortForecast}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Wind size={9} color="#5a6080" />
                  <span style={{ fontSize: 10, color: '#5a6080' }}>{p.windSpeed?.split(' ')[0]}</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                    color: p.isDaytime ? '#f59e0b' : '#4f7fff', minWidth: 30, textAlign: 'right',
                  }}>{p.temperature}&deg;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.updated_at && (
        <div style={{ marginTop: 8, fontSize: 9, color: '#5a6080', textAlign: 'right' }}>
          Updated {new Date(data.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} · NWS via weather.gov
        </div>
      )}
    </div>
  )
}

// ── Tides Panel ────────────────────────────────────────────────────────────────

function TidesContent() {
  const [data, setData] = useState<TideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState('gig_harbor')

  const STATIONS = [
    { id: 'gig_harbor', label: 'Gig Harbor' },
    { id: 'tacoma', label: 'Tacoma' },
    { id: 'seattle', label: 'Seattle' },
    { id: 'olympia', label: 'Olympia' },
  ]

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pnw/tides?station=${selectedStation}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedStation])

  return (
    <div>
      {/* Station selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {STATIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStation(s.id)}
            style={{
              padding: '4px 10px', borderRadius: 20, border: `1px solid ${selectedStation === s.id ? '#4f7fff' : 'rgba(255,255,255,0.1)'}`,
              background: selectedStation === s.id ? 'rgba(79,127,255,0.15)' : 'transparent',
              color: selectedStation === s.id ? '#4f7fff' : '#9299b5',
              fontSize: 11, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#5a6080', fontSize: 12 }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
          Loading tide data...
        </div>
      )}

      {!loading && data && (
        <>
          {/* Current status */}
          <div style={{
            background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(79,127,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {data.trend === 'rising'
                ? <TrendingUp size={18} color="#4f7fff" />
                : <TrendingDown size={18} color="#22d3ee" />
              }
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 700, color: '#e8eaed', lineHeight: 1 }}>
                {typeof data.current_height === 'number' ? `${data.current_height.toFixed(1)} ft` : '—'}
              </div>
              <div style={{ fontSize: 11, color: data.trend === 'rising' ? '#4f7fff' : '#22d3ee', marginTop: 2, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5 }}>
                {data.trend === 'rising' ? 'RISING TIDE' : 'FALLING TIDE'}
              </div>
            </div>
          </div>

          {/* Visual bar chart */}
          {data.predictions && data.predictions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#5a6080', marginBottom: 8 }}>
                NEXT 6 PREDICTIONS
              </div>

              {/* Simple bar chart */}
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60, marginBottom: 8, padding: '0 4px' }}>
                {data.predictions.slice(0, 8).map((pred, i) => {
                  const maxH = Math.max(...(data.predictions?.slice(0, 8).map(p => p.height_ft) || [12]))
                  const minH = Math.min(...(data.predictions?.slice(0, 8).map(p => p.height_ft) || [0]))
                  const range = maxH - minH || 1
                  const pct = Math.max(0.05, (pred.height_ft - minH) / range)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{
                        width: '100%', background: pred.type === 'H' ? '#4f7fff' : '#22d3ee',
                        borderRadius: '3px 3px 0 0', height: `${pct * 52}px`,
                        opacity: 0.8,
                      }} />
                      <div style={{ fontSize: 8, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
                        {pred.type === 'H' ? 'H' : 'L'}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.predictions.slice(0, 6).map((pred, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', borderRadius: 7,
                    background: pred.type === 'H' ? 'rgba(79,127,255,0.07)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${pred.type === 'H' ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5,
                      color: pred.type === 'H' ? '#4f7fff' : '#22d3ee',
                      background: pred.type === 'H' ? 'rgba(79,127,255,0.1)' : 'rgba(34,211,238,0.1)',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {pred.type === 'H' ? 'HIGH' : 'LOW'}
                    </span>
                    <span style={{ fontSize: 11, color: '#9299b5', fontFamily: 'JetBrains Mono, monospace' }}>
                      {new Date(pred.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                    <span style={{ fontSize: 13, color: '#e8eaed', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, minWidth: 48, textAlign: 'right' }}>
                      {pred.height_ft.toFixed(1)} ft
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fishing tip */}
          <div style={{
            padding: '10px 12px', background: 'rgba(34,211,238,0.06)',
            border: '1px solid rgba(34,211,238,0.15)', borderRadius: 8,
          }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#22d3ee', marginBottom: 4 }}>
              FISHING TIDE TIP
            </div>
            <div style={{ fontSize: 11, color: '#9299b5', lineHeight: 1.4 }}>
              {data.trend === 'rising'
                ? 'Rising tide pushes baitfish into shallows. Work the edges of kelp beds and structure. Good time for salmon near creek mouths.'
                : 'Ebb tide concentrates baitfish at current lines and points. Tidal rips near Tacoma Narrows and Deception Pass are productive for salmon and lingcod.'}
            </div>
          </div>

          {data.updated_at && (
            <div style={{ marginTop: 8, fontSize: 9, color: '#5a6080', textAlign: 'right' }}>
              Updated {new Date(data.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} · NOAA
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#5a6080', fontSize: 12 }}>
          Tide data unavailable for this station.
        </div>
      )}
    </div>
  )
}

// ── Layers Panel ───────────────────────────────────────────────────────────────

function LayersContent({ activeLayers, onLayerToggle }: { activeLayers: Set<string>; onLayerToggle: (k: string) => void }) {
  return (
    <div>
      {LAYER_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#5a6080', marginBottom: 10 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.layers.map(layer => {
              const active = activeLayers.has(layer.key)
              const Icon = layer.icon
              return (
                <button
                  key={layer.key}
                  onClick={() => onLayerToggle(layer.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 10, border: `1px solid ${active ? layer.color + '40' : 'rgba(255,255,255,0.07)'}`,
                    background: active ? `${layer.color}12` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: active ? `${layer.color}20` : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} color={active ? layer.color : '#5a6080'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? layer.color : '#9299b5', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.3 }}>
                      {layer.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#5a6080', lineHeight: 1.3, marginTop: 1 }}>{layer.description}</div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    background: active ? layer.color : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${active ? layer.color : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#0d0f14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {activeLayers.size > 0 && (
        <div style={{
          padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 10, color: '#5a6080' }}>
            {activeLayers.size} layer{activeLayers.size !== 1 ? 's' : ''} active
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Sidebar ───────────────────────────────────────────────────────────────

export default function PNWSidebar({ activeLayers, onLayerToggle, onClose, isMobile }: PNWSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0e1117', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Sidebar header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(13,15,20,0.8)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Anchor size={16} color="#22d3ee" />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: 2, color: '#e8eaed' }}>
            PNW NAVIGATOR
          </span>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 4 }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tab strip */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0, background: 'rgba(13,15,20,0.6)',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '9px 4px', border: 'none', cursor: 'pointer', background: 'none',
                borderBottom: active ? '2px solid #22d3ee' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} color={active ? '#22d3ee' : '#5a6080'} />
              <span style={{
                fontSize: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                letterSpacing: 0.5, color: active ? '#22d3ee' : '#5a6080',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div style={{
        flex: 1, overflowY: 'auto', scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        ...(activeTab === 'ai' ? {} : { padding: '14px 14px' }),
      }}>
        {activeTab === 'layers' && <LayersContent activeLayers={activeLayers} onLayerToggle={onLayerToggle} />}
        {activeTab === 'harbor' && <GigHarborMarina />}
        {activeTab === 'weather' && <WeatherContent />}
        {activeTab === 'tides' && <TidesContent />}
        {activeTab === 'vhf' && <VHFBroadcastPanel />}
        {activeTab === 'ai' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <AIChat compact={true} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
