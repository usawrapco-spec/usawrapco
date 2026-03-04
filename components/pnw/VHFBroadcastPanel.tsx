'use client'
import { useState } from 'react'
import { Radio, Signal, AlertTriangle, Clock, Volume2, ChevronDown, ChevronRight } from 'lucide-react'

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
