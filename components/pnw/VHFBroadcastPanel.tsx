'use client'
import { useState, useRef, useEffect } from 'react'
import { Radio, Signal, AlertTriangle, Volume2, ChevronDown, ChevronRight, Play, Square, Loader2, ExternalLink } from 'lucide-react'

// ── NOAA Weather Radio Player ─────────────────────────────────────────────────

function NOAARadioPlayer() {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<string | null>(null)
  const [station, setStation] = useState<'KEC53' | 'KZZ33' | 'KHB35'>('KEC53')
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const STATIONS = [
    { id: 'KEC53' as const, label: 'KEC-53 Seattle', freq: '162.550', coverage: 'Greater Seattle & Puget Sound' },
    { id: 'KZZ33' as const, label: 'KZZ-33 Olympia', freq: '162.400', coverage: 'South Puget Sound & Hood Canal' },
    { id: 'KHB35' as const, label: 'KHB-35 Bellingham', freq: '162.475', coverage: 'North Sound & San Juan Islands' },
  ]

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  async function startBroadcast() {
    if (playing) {
      window.speechSynthesis?.cancel()
      setPlaying(false)
      return
    }

    setLoading(true)
    try {
      // Fetch current marine weather forecast
      const res = await fetch('/api/pnw/weather')
      let text = ''
      if (res.ok) {
        const data = await res.json()
        const current = data.current || (data.periods && data.periods[0])
        const marine = data.marineForecast?.[0]
        const forecast2 = data.marineForecast?.[1]

        text = [
          `This is NOAA Weather Radio. Station ${station}. Puget Sound marine forecast.`,
          current ? `Current conditions: ${current.shortForecast}. Temperature ${current.temperature} degrees. Winds ${current.windSpeed} from the ${current.windDirection}.` : '',
          marine ? `Marine forecast: ${marine.name}. ${marine.detailedForecast}` : '',
          forecast2 ? `${forecast2.name}: ${forecast2.detailedForecast}` : '',
          'End of marine weather broadcast. Stay safe on the water.',
        ].filter(Boolean).join(' ')

        setForecast(marine?.detailedForecast || current?.shortForecast || null)
      } else {
        text = `This is NOAA Weather Radio station ${station}, serving Puget Sound and the Pacific Northwest. The current marine forecast is temporarily unavailable. Check weather dot gov for the latest conditions before departing. Stay safe on the water.`
      }

      const synth = window.speechSynthesis
      if (!synth) {
        alert('Text-to-speech not supported in this browser. Visit weather.gov/sew for the latest forecast.')
        setLoading(false)
        return
      }

      synth.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.85
      utt.pitch = 0.9
      utt.volume = 1

      // Prefer a neutral/robotic voice if available
      const voices = synth.getVoices()
      const preferred = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')))
      if (preferred) utt.voice = preferred

      utt.onend = () => setPlaying(false)
      utt.onerror = () => setPlaying(false)

      synthRef.current = synth
      utteranceRef.current = utt
      synth.speak(utt)
      setPlaying(true)
    } catch { /* ignore */ }
    finally {
      setLoading(false)
    }
  }

  const activeStation = STATIONS.find(s => s.id === station)!

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        background: playing ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${playing ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12, padding: '14px 14px', transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: playing ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${playing ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radio size={15} color={playing ? '#22d3ee' : '#9299b5'} style={playing ? { animation: 'pulse 1s ease-in-out infinite' } : {}} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: '#e8eaed' }}>
              NOAA WEATHER RADIO
            </div>
            <div style={{ fontSize: 9, color: playing ? '#22d3ee' : '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>
              {playing ? '● LIVE BROADCAST' : activeStation.freq + ' MHz — ' + activeStation.label}
            </div>
          </div>
          <button
            onClick={startBroadcast}
            style={{
              width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: playing ? '#f25a5a' : '#22d3ee',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: playing ? '0 4px 12px rgba(242,90,90,0.4)' : '0 4px 12px rgba(34,211,238,0.3)',
              flexShrink: 0,
            }}
          >
            {loading
              ? <Loader2 size={16} color="#0d0f14" style={{ animation: 'spin 1s linear infinite' }} />
              : playing ? <Square size={14} color="white" fill="white" />
              : <Play size={14} color="#0d0f14" fill="#0d0f14" />
            }
          </button>
        </div>

        {/* Waveform when playing */}
        {playing && (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 24, marginBottom: 10 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, background: '#22d3ee', borderRadius: 2,
                animation: `waveBar 0.8s ease-in-out ${(i * 0.04).toFixed(2)}s infinite`,
                opacity: 0.7,
              }} />
            ))}
          </div>
        )}

        {/* Forecast text */}
        {forecast && (
          <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.5, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: '#22d3ee', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>CURRENT MARINE FORECAST</div>
            {forecast.slice(0, 200)}{forecast.length > 200 ? '...' : ''}
          </div>
        )}

        {/* Station picker */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STATIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setStation(s.id); if (playing) { window.speechSynthesis?.cancel(); setPlaying(false) } }}
              style={{
                flex: 1, padding: '4px 4px', borderRadius: 6, border: `1px solid ${station === s.id ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: station === s.id ? 'rgba(34,211,238,0.12)' : 'transparent',
                color: station === s.id ? '#22d3ee' : '#5a6080', fontSize: 8,
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3, textAlign: 'center' as const,
              }}
            >
              <div>{s.label.split(' ')[0]}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8 }}>{s.freq}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
        <a href="https://www.weather.gov/sew/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#5a6080' }}>
          <ExternalLink size={10} />
          weather.gov/sew — Full Forecast
        </a>
        <span style={{ color: '#5a6080', fontSize: 10 }}>·</span>
        <span style={{ fontSize: 10, color: '#5a6080' }}>NWS Seattle Marine Division</span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes waveBar {
          0%,100%{height:4px;opacity:0.4}
          50%{height:18px;opacity:0.9}
        }
      `}</style>
    </div>
  )
}

interface VHFChannel {
  ch: string
  freq: string
  name: string
  use: string
  priority?: 'critical' | 'high' | 'normal'
  color?: string
}

const CHANNELS: VHFChannel[] = [
  { ch: '16', freq: '156.800', name: 'DISTRESS / CALLING', use: 'International distress, safety, calling channel. MONITOR AT ALL TIMES underway.', priority: 'critical', color: '#f25a5a' },
  { ch: '22A', freq: '157.100', name: 'USCG WORKING', use: 'US Coast Guard working channel for Puget Sound. USCG broadcasts Notices to Mariners and safety messages here.', priority: 'high', color: '#f59e0b' },
  { ch: '9', freq: '156.450', name: 'BRIDGE-TO-BRIDGE', use: 'Recreational vessel bridge-to-bridge and marina calling. Preferred hailing for recreational boats.', priority: 'high', color: '#4f7fff' },
  { ch: '68', freq: '156.425', name: 'NON-COMMERCIAL', use: 'Recreational and non-commercial working channel. Popular in Puget Sound for vessel-to-vessel communication.', color: '#22c07a' },
  { ch: '69', freq: '156.475', name: 'NON-COMMERCIAL', use: 'Recreational working channel. Used in the San Juan Islands for vessel communication.', color: '#22c07a' },
  { ch: '71', freq: '156.575', name: 'MARINE', use: 'Recreational marina and vessel working channel.', color: '#22c07a' },
  { ch: '72', freq: '156.625', name: 'NON-COMMERCIAL', use: 'Simplex recreational channel. Common in southern Puget Sound.', color: '#22c07a' },
  { ch: '78A', freq: '156.925', name: 'PUGET SOUND FERRIES', use: 'Washington State Ferries operational channel. Monitor near ferry routes.', color: '#8b5cf6' },
  { ch: '14', freq: '156.700', name: 'SEATTLE TRAFFIC', use: 'Vessel Traffic Service Seattle — commercial traffic management for Puget Sound. Monitor in major shipping lanes.', color: '#22d3ee' },
  { ch: '05A', freq: '156.250', name: 'PORT OPERATIONS', use: 'Port of Seattle / Port of Tacoma operational channel.', color: '#22d3ee' },
  { ch: '66A', freq: '156.325', name: 'MARINE OPERATOR', use: 'Public correspondence (phone calls) through marine operators.', color: '#9299b5' },
]

const WX_CHANNELS = [
  { ch: 'WX1', freq: '162.550', name: 'KEC-53 SEATTLE', coverage: 'Primary channel — greater Seattle/Puget Sound area. NOAA Weather Radio continuous broadcast.', priority: true },
  { ch: 'WX2', freq: '162.400', name: 'KZZ-33 OLYMPIA', coverage: 'Southern Puget Sound, Olympia area, Hood Canal.', priority: false },
  { ch: 'WX3', freq: '162.475', name: 'KHB-35 BELLINGHAM', coverage: 'Northern Puget Sound, San Juan Islands, Bellingham area.', priority: false },
  { ch: 'WX4', freq: '162.425', name: 'WXJ-72 PORT ANGELES', coverage: 'Strait of Juan de Fuca, Olympic Peninsula north coast.', priority: false },
  { ch: 'WX6', freq: '162.500', name: 'KHB-36 WESTPORT', coverage: 'Pacific coast, Grays Harbor, coastal WA.', priority: false },
]

// USCG Puget Sound broadcast schedule (Pacific time, approximate)
// USCG Sector Puget Sound broadcasts on VHF 22A
function getBroadcastSchedule() {
  const now = new Date()
  const hours = now.getHours()

  // USCG Puget Sound broadcasts ~every 6 hours: 0120, 0720, 1320, 1920 UTC
  // Convert to Pacific (UTC-8 standard, UTC-7 daylight)
  const isDST = now.getMonth() >= 2 && now.getMonth() <= 10
  const offset = isDST ? 7 : 8
  const broadcastsUTC = [120, 720, 1320, 1920] // HHMM in minutes from midnight UTC
  const broadcastsPT = broadcastsUTC.map(t => {
    const h = Math.floor(t / 100)
    const m = t % 100
    const ptH = ((h - offset) + 24) % 24
    return { h: ptH, m, label: `${ptH === 0 ? 12 : ptH > 12 ? ptH - 12 : ptH}:${String(m).padStart(2, '0')} ${ptH < 12 ? 'AM' : 'PM'}` }
  })

  const currentMinutes = hours * 60 + now.getMinutes()
  const nextBroadcast = broadcastsPT.find(b => (b.h * 60 + b.m) > currentMinutes) || broadcastsPT[0]
  const lastBroadcast = broadcastsPT[broadcastsPT.findIndex(b => b === nextBroadcast) - 1] || broadcastsPT[broadcastsPT.length - 1]

  return { broadcasts: broadcastsPT.map(b => b.label), next: nextBroadcast.label, last: lastBroadcast.label }
}

export default function VHFBroadcastPanel() {
  const [expandedCh, setExpandedCh] = useState<string | null>(null)
  const [showWX, setShowWX] = useState(false)
  const schedule = getBroadcastSchedule()

  return (
    <div style={{ padding: '0 0 16px' }}>
      {/* NOAA Weather Radio Player */}
      <NOAARadioPlayer />

      {/* USCG Broadcast Status */}
      <div style={{
        margin: '0 0 16px',
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 10, padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Signal size={14} color="#f59e0b" />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: '#f59e0b' }}>
            USCG PUGET SOUND — VHF 22A
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#9299b5', marginBottom: 8, lineHeight: 1.4 }}>
          Coast Guard Sector Puget Sound broadcasts weather, Notices to Mariners, and safety information approximately every 6 hours.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#5a6080', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.5, marginBottom: 2 }}>LAST BROADCAST</div>
            <div style={{ fontSize: 13, color: '#e8eaed', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{schedule.last}</div>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.5, marginBottom: 2 }}>NEXT BROADCAST</div>
            <div style={{ fontSize: 13, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{schedule.next}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 9, color: '#5a6080' }}>
          Daily broadcasts: {schedule.broadcasts.join(' · ')} Pacific Time
        </div>
      </div>

      {/* NOAA WX Channels */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowWX(s => !s)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.15)',
            borderRadius: 8, padding: '10px 12px', cursor: 'pointer', marginBottom: showWX ? 8 : 0,
          }}
        >
          <Volume2 size={13} color="#22d3ee" />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: '#22d3ee' }}>
            NOAA WEATHER RADIO — WX CHANNELS
          </span>
          {showWX ? <ChevronDown size={12} color="#9299b5" style={{ marginLeft: 'auto' }} /> : <ChevronRight size={12} color="#9299b5" style={{ marginLeft: 'auto' }} />}
        </button>
        {showWX && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {WX_CHANNELS.map(wx => (
              <div key={wx.ch} style={{
                background: wx.priority ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${wx.priority ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 800,
                    color: wx.priority ? '#22d3ee' : '#9299b5',
                    background: wx.priority ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.06)',
                    padding: '2px 8px', borderRadius: 4,
                  }}>{wx.ch}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5a6080' }}>{wx.freq} MHz</span>
                  {wx.priority && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: '#22d3ee', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5 }}>PRIMARY</span>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', marginBottom: 2 }}>{wx.name}</div>
                <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.4 }}>{wx.coverage}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marine Channels */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#5a6080', marginBottom: 10 }}>
          MARINE VHF CHANNELS — PUGET SOUND
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CHANNELS.map(ch => {
            const isExpanded = expandedCh === ch.ch
            const color = ch.color || '#9299b5'
            return (
              <button
                key={ch.ch}
                onClick={() => setExpandedCh(isExpanded ? null : ch.ch)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: ch.priority === 'critical' ? 'rgba(242,90,90,0.07)'
                    : ch.priority === 'high' ? 'rgba(245,158,11,0.07)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${ch.priority === 'critical' ? 'rgba(242,90,90,0.2)'
                    : ch.priority === 'high' ? 'rgba(245,158,11,0.15)'
                    : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 8, padding: '10px 12px',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800,
                    color, background: `${color}18`, padding: '2px 10px',
                    borderRadius: 4, minWidth: 42, textAlign: 'center',
                  }}>
                    {ch.ch}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5, color }}>
                      {ch.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>{ch.freq} MHz</div>
                  </div>
                  {ch.priority === 'critical' && (
                    <AlertTriangle size={12} color="#f25a5a" style={{ flexShrink: 0 }} />
                  )}
                  {isExpanded ? <ChevronDown size={12} color="#5a6080" style={{ flexShrink: 0 }} /> : <ChevronRight size={12} color="#5a6080" style={{ flexShrink: 0 }} />}
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#9299b5', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
                    {ch.use}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Protocol reminder */}
      <div style={{
        marginTop: 12, padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#5a6080', marginBottom: 6 }}>VHF PROTOCOL</div>
        <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.6 }}>
          1. Hail on CH 16 or 9 (recreational). When answered, switch to a working channel.<br />
          2. Monitor CH 16 at all times while underway — it is the international distress channel.<br />
          3. In emergency: MAYDAY MAYDAY MAYDAY on CH 16. State vessel name, position, nature of distress, number of people, vessel description.<br />
          4. VHF range: 5–30 nautical miles, terrain and antenna height dependent.
        </div>
      </div>
    </div>
  )
}
