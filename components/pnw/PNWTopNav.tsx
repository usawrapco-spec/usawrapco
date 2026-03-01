'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Map, Fish, Waves, Cloud, Navigation, BookOpen, Users, Route,
  Layers, Anchor, ChevronDown, ChevronUp
} from 'lucide-react'

interface PNWTopNavProps {
  activeLayers: Set<string>
  onLayerToggle: (key: string) => void
  onTabChange: (tab: string) => void
  activeTab: string
}

interface LayerDef {
  key: string
  label: string
  color: string
}

const TABS = [
  { id: 'map', label: 'LIVE MAP', icon: Map },
  { id: 'fishing', label: 'FISHING', icon: Fish },
  { id: 'trip-planner', label: 'TRIP PLANNER', icon: Route },
  { id: 'trip-tracker', label: 'GPS TRACKER', icon: Navigation },
  { id: 'heritage', label: 'HERITAGE', icon: BookOpen },
  { id: 'feed', label: 'COMMUNITY', icon: Users },
]

const LAYERS: LayerDef[] = [
  { key: 'satellite', label: 'Satellite', color: '#4f7fff' },
  { key: 'depth', label: 'Depth Chart', color: '#22d3ee' },
  { key: 'marinas', label: 'Marinas', color: '#22c07a' },
  { key: 'hazards', label: 'Hazards', color: '#f25a5a' },
  { key: 'launches', label: 'Boat Launches', color: '#f59e0b' },
  { key: 'fuel', label: 'Fuel Docks', color: '#8b5cf6' },
  { key: 'tides', label: 'Tides', color: '#22d3ee' },
  { key: 'weather', label: 'Weather', color: '#9299b5' },
  { key: 'wildlife', label: 'Wildlife', color: '#22c07a' },
  { key: 'traffic', label: 'Traffic', color: '#f59e0b' },
]

export default function PNWTopNav({ activeLayers, onLayerToggle, onTabChange, activeTab }: PNWTopNavProps) {
  const [showLayers, setShowLayers] = useState(false)

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      zIndex: 2000,
      position: 'relative'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', gap: 12
      }}>
        <Link href="/pnw" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Anchor size={18} color="#22d3ee" />
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18,
              fontWeight: 800, letterSpacing: 2, color: 'var(--text1)'
            }}>
              PNW NAVIGATOR
            </span>
          </div>
        </Link>

        <button
          onClick={() => setShowLayers(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: showLayers ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${showLayers ? '#4f7fff' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            color: showLayers ? '#4f7fff' : 'var(--text2)', fontSize: 12,
            fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 1, fontWeight: 600
          }}
        >
          <Layers size={14} />
          LAYERS ({activeLayers.size})
          {showLayers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showLayers && (
        <div style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexWrap: 'wrap', gap: 8
        }}>
          {LAYERS.map(layer => {
            const active = activeLayers.has(layer.key)
            return (
              <button
                key={layer.key}
                onClick={() => onLayerToggle(layer.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: `1px solid ${active ? layer.color : 'rgba(255,255,255,0.12)'}`,
                  background: active ? `${layer.color}22` : 'transparent',
                  color: active ? layer.color : 'var(--text2)',
                  fontSize: 11, cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: 0.5, fontWeight: active ? 700 : 400,
                  transition: 'all 0.15s'
                }}
              >
                {layer.label}
              </button>
            )
          })}
        </div>
      )}

      <div style={{
        display: 'flex', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)',
        scrollbarWidth: 'none'
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', whiteSpace: 'nowrap',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: active ? '2px solid #22d3ee' : '2px solid transparent',
                color: active ? '#22d3ee' : 'var(--text2)',
                fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: 1, fontWeight: active ? 700 : 500,
                transition: 'all 0.15s'
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
