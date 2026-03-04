'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Layers, ChevronLeft, ChevronRight, Anchor, Sparkles,
  X, Map, Cloud, Waves, Radio,
} from 'lucide-react'

const PNWSidebar = dynamic(() => import('@/components/pnw/PNWSidebar'), { ssr: false })
const PNWMapEngine = dynamic(() => import('@/components/pnw/PNWMapEngine'), { ssr: false })
const EmergencyAlertBanner = dynamic(() => import('@/components/pnw/EmergencyAlertBanner'), { ssr: false })
const AIChat = dynamic(() => import('@/components/pnw/AIChat'), { ssr: false })

type MobilePanel = 'map' | 'weather' | 'tides' | 'vhf' | 'ai' | null

const MOBILE_TABS = [
  { id: 'map' as const, label: 'MAP', icon: Map },
  { id: 'weather' as const, label: 'WEATHER', icon: Cloud },
  { id: 'tides' as const, label: 'TIDES', icon: Waves },
  { id: 'vhf' as const, label: 'VHF', icon: Radio },
  { id: 'ai' as const, label: 'AI', icon: Sparkles },
]

export default function PNWPageClient() {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['fish-zones']))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobilePanel>('map')
  const [isDesktop, setIsDesktop] = useState(false)
  const [aiFloating, setAiFloating] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Check URL param for initial panel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const panel = params.get('panel')
    if (panel && ['weather', 'tides', 'vhf', 'ai'].includes(panel)) {
      if (!isDesktop) {
        setMobileTab(panel as MobilePanel)
        setMobilePanelOpen(true)
      }
    }
  }, [isDesktop])

  const handleLayerToggle = useCallback((key: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  function handleMobileTab(tab: MobilePanel) {
    if (tab === 'map') {
      setMobileTab('map')
      setMobilePanelOpen(false)
      setAiFloating(false)
    } else if (tab === 'ai') {
      setMobileTab('ai')
      setAiFloating(true)
      setMobilePanelOpen(false)
    } else {
      setMobileTab(tab)
      setMobilePanelOpen(true)
      setAiFloating(false)
    }
  }

  // Desktop layout
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0f14', overflow: 'hidden' }}>
        <EmergencyAlertBanner />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Sidebar */}
          <div style={{
            width: sidebarCollapsed ? 0 : 320,
            minWidth: sidebarCollapsed ? 0 : 320,
            overflow: 'hidden',
            transition: 'all 0.25s ease',
            position: 'relative',
            zIndex: 10,
          }}>
            {!sidebarCollapsed && (
              <PNWSidebar
                activeLayers={activeLayers}
                onLayerToggle={handleLayerToggle}
              />
            )}
          </div>

          {/* Sidebar collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(s => !s)}
            style={{
              position: 'absolute',
              left: sidebarCollapsed ? 0 : 320,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              width: 20,
              height: 48,
              background: '#1a1d27',
              border: '1px solid rgba(255,255,255,0.1)',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5a6080',
              transition: 'left 0.25s ease',
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          {/* Map area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <PNWMapEngine
              activeLayers={activeLayers}
              onLayerToggle={handleLayerToggle}
              height="100%"
            />

            {/* Floating AI button on map */}
            <button
              onClick={() => {
                setSidebarCollapsed(false)
              }}
              style={{
                position: 'absolute', bottom: 80, right: 60, zIndex: 1000,
                background: 'linear-gradient(135deg, rgba(34,211,238,0.9), rgba(79,127,255,0.9))',
                border: 'none', borderRadius: 12, padding: '10px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(34,211,238,0.3)',
              }}
            >
              <Sparkles size={15} color="#0d0f14" />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: 1, color: '#0d0f14' }}>
                ASK PNW AI
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mobile layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0f14', overflow: 'hidden' }}>
      <EmergencyAlertBanner />

      {/* Map (always underneath) */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <PNWMapEngine
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
          height="100%"
        />

        {/* Floating map header */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500,
          padding: '8px 12px',
          background: 'linear-gradient(to bottom, rgba(13,15,20,0.92) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Anchor size={16} color="#22d3ee" />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: 2, color: '#e8eaed', flex: 1 }}>
            PNW NAVIGATOR
          </span>
          <button
            onClick={() => { setMobileTab('ai'); setAiFloating(true); setMobilePanelOpen(false) }}
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.9), rgba(79,127,255,0.9))',
              border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Sparkles size={13} color="#0d0f14" />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: '#0d0f14' }}>AI</span>
          </button>
          <button
            onClick={() => { setMobileTab('map'); setMobilePanelOpen(true); setAiFloating(false) }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Layers size={13} color="#9299b5" />
            {activeLayers.size > 0 && (
              <span style={{ fontSize: 11, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                {activeLayers.size}
              </span>
            )}
          </button>
        </div>

        {/* Mobile panel overlay (weather/tides/vhf) */}
        {mobilePanelOpen && mobileTab !== 'map' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 600,
            background: '#0e1117',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px 16px 0 0',
            maxHeight: '70vh',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 10px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: '#e8eaed', flex: 1 }}>
                {mobileTab === 'weather' ? 'MARINE WEATHER' : mobileTab === 'tides' ? 'TIDE CHART' : mobileTab === 'vhf' ? 'VHF CHANNELS' : ''}
              </span>
              <button
                onClick={() => setMobilePanelOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            {/* Panel content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', scrollbarWidth: 'none' }}>
              <PNWSidebar
                activeLayers={activeLayers}
                onLayerToggle={handleLayerToggle}
                isMobile={true}
                onClose={() => setMobilePanelOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Layers quick panel (when layers tab on mobile) */}
        {mobilePanelOpen && mobileTab === 'map' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 600,
            background: '#0e1117',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px 16px 0 0',
            maxHeight: '50vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 10px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: '#e8eaed', flex: 1 }}>MAP LAYERS</span>
              <button onClick={() => setMobilePanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              {[
                { key: 'fish-zones', label: 'Fish Zones', color: '#22d3ee' },
                { key: 'fishing', label: 'Fishing Spots', color: '#4f7fff' },
                { key: 'depth', label: 'Depth Chart', color: '#22d3ee' },
                { key: 'marinas', label: 'Marinas', color: '#22c07a' },
                { key: 'hazards', label: 'Hazards', color: '#f25a5a' },
                { key: 'launches', label: 'Boat Launches', color: '#22c07a' },
                { key: 'fuel', label: 'Fuel Docks', color: '#f59e0b' },
                { key: 'wildlife', label: 'Wildlife', color: '#22c07a' },
                { key: 'weather', label: 'Weather', color: '#9299b5' },
                { key: 'tides', label: 'Tide Stations', color: '#4f7fff' },
                { key: 'traffic', label: 'Road Traffic', color: '#f59e0b' },
              ].map(layer => {
                const active = activeLayers.has(layer.key)
                return (
                  <button
                    key={layer.key}
                    onClick={() => handleLayerToggle(layer.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: active ? layer.color : 'rgba(255,255,255,0.15)',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, color: active ? '#e8eaed' : '#9299b5', flex: 1, textAlign: 'left' }}>{layer.label}</span>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
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
        )}
      </div>

      {/* Mobile AI full-screen overlay */}
      {aiFloating && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 900,
          background: '#0d0f14', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
          }}>
            <Sparkles size={16} color="#22d3ee" />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: 1.5, color: '#e8eaed', flex: 1 }}>
              PNW AI CONCIERGE
            </span>
            <button
              onClick={() => { setAiFloating(false); setMobileTab('map') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChat />
          </div>
        </div>
      )}

      {/* Mobile bottom tab nav */}
      <div style={{
        display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)',
        background: '#0e1117', flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {MOBILE_TABS.map(tab => {
          const Icon = tab.icon
          const active = mobileTab === tab.id && (tab.id === 'map' ? !mobilePanelOpen && !aiFloating : tab.id === 'ai' ? aiFloating : mobilePanelOpen)
          return (
            <button
              key={tab.id}
              onClick={() => handleMobileTab(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer',
                borderTop: active ? '2px solid #22d3ee' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={18} color={active ? '#22d3ee' : '#5a6080'} />
              <span style={{
                fontSize: 9, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                letterSpacing: 0.5, color: active ? '#22d3ee' : '#5a6080',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
