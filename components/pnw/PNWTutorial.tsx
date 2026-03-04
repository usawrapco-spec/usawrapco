'use client'
import { useState, useEffect } from 'react'
import { X, ChevronRight, Anchor, Map, Sparkles, Fish, Waves } from 'lucide-react'

const STORAGE_KEY = 'pnw-navigator-tutorial-v1'

interface Step {
  icon: React.ElementType
  color: string
  title: string
  subtitle: string
  body: string
  tip?: string
}

const STEPS: Step[] = [
  {
    icon: Anchor,
    color: '#22d3ee',
    title: 'Welcome to PNW Navigator',
    subtitle: "The Pacific Northwest's Complete Marine App",
    body: 'Your AI-powered companion for Puget Sound boating, fishing, weather, tides, and local exploration. Built for Washington State waters from Gig Harbor to the San Juans.',
    tip: 'Add to your home screen for the best mobile experience',
  },
  {
    icon: Map,
    color: '#4f7fff',
    title: 'Live Interactive Map',
    subtitle: 'Real PNW marine data layers',
    body: 'Toggle layers to see Fish Zones, Depth Charts (NOAA), Fuel Docks, Marinas, Hazards, Wildlife sightings, and Tide Stations. Switch between Dark, Satellite, Terrain, and USGS Topo base maps.',
    tip: 'Fish zones glow when in season — tap any zone for species, depth & techniques',
  },
  {
    icon: Sparkles,
    color: '#22d3ee',
    title: 'AI Concierge',
    subtitle: 'Your expert guide to the PNW',
    body: "Ask anything — what's biting right now, plan a full day trip, get VHF radio help, find waterfront dining, or get a marine weather briefing. The AI knows PNW fishing regs, seasonal patterns, Gig Harbor, the San Juans, and more.",
    tip: 'Try: "Plan a salmon fishing day trip from Gig Harbor with lunch"',
  },
  {
    icon: Fish,
    color: '#f59e0b',
    title: 'Fishing & Marine Tools',
    subtitle: 'Saltwater, freshwater, crabbing & more',
    body: 'Fish zone overlays show where species aggregate by season. Tap any zone for species, depth, techniques, and current regulations. Freshwater zones cover Lake Washington, Green River steelhead, and Skykomish pink salmon.',
    tip: 'Crab and shrimp zones show season dates — Henderson Bay and Carr Inlet are local favorites',
  },
  {
    icon: Waves,
    color: '#22c07a',
    title: "Gig Harbor's Home Marina",
    subtitle: 'Gig Harbor Marina & Boatyard',
    body: "The GIG HBR tab is your complete guide — real info direct from gigharbormarina.com. Full services: 60-ton haul-out, fuel, electrical, engines, propellers. Plus accommodations, events, waterfront dining, and nearby fuel docks.",
    tip: 'Call the marina direct: 253-858-3535',
  },
]

interface PNWTutorialProps {
  onDone: () => void
}

export default function PNWTutorial({ onDone }: PNWTutorialProps) {
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  function finish() {
    setExiting(true)
    localStorage.setItem(STORAGE_KEY, 'done')
    setTimeout(onDone, 400)
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5, 8, 16, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.4s ease',
    }}>
      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(160deg, #0a1628 0%, #071020 100%)',
        border: `1px solid ${current.color}40`,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: `0 0 60px ${current.color}20, 0 24px 64px rgba(0,0,0,0.6)`,
      }}>
        {/* Animated header */}
        <div style={{
          padding: '24px 24px 20px',
          background: `linear-gradient(135deg, ${current.color}18 0%, transparent 60%)`,
          borderBottom: `1px solid ${current.color}20`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle animated aurora lines */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            background: `radial-gradient(ellipse at 20% 50%, ${current.color} 0%, transparent 60%)`,
            animation: 'auroraShift 4s ease-in-out infinite',
          }} />

          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 14,
            background: `${current.color}20`,
            border: `2px solid ${current.color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            boxShadow: `0 0 24px ${current.color}30`,
          }}>
            <Icon size={26} color={current.color} />
          </div>

          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: 0.5, color: '#e8eaed', lineHeight: 1.1, marginBottom: 4, position: 'relative' }}>
            {current.title}
          </div>
          <div style={{ fontSize: 12, color: current.color, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, letterSpacing: 0.5, position: 'relative' }}>
            {current.subtitle}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.7, marginBottom: 16 }}>
            {current.body}
          </div>

          {current.tip && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: `${current.color}10`,
              border: `1px solid ${current.color}25`,
              marginBottom: 20,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                {step === 0 ? '📱' : step === 1 ? '✨' : step === 2 ? '💬' : step === 3 ? '🦀' : '⚓'}
              </div>
              <div style={{ fontSize: 11, color: current.color, lineHeight: 1.5 }}>
                {current.tip}
              </div>
            </div>
          )}

          {/* Progress + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    width: i === step ? 20 : 8, height: 8, borderRadius: 4,
                    background: i === step ? current.color : i < step ? `${current.color}50` : 'rgba(255,255,255,0.1)',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* Skip */}
            <button
              onClick={finish}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', fontSize: 12, padding: '4px 8px', flexShrink: 0 }}
            >
              Skip
            </button>

            {/* Next / Done */}
            <button
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: current.color, border: 'none', borderRadius: 10,
                padding: '10px 18px', cursor: 'pointer', flexShrink: 0,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800,
                letterSpacing: 0.5, color: '#0d0f14',
                boxShadow: `0 4px 16px ${current.color}40`,
              }}
            >
              {isLast ? "Let's go" : 'Next'}
              {!isLast && <ChevronRight size={14} color="#0d0f14" />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes auroraShift {
          0%, 100% { transform: translateX(0) scaleX(1); opacity: 0.15; }
          50% { transform: translateX(30px) scaleX(1.3); opacity: 0.25; }
        }
      `}</style>
    </div>
  )
}

// Hook — use in parent to check if tutorial should show
export function useTutorial() {
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    setShow(!done)
    setChecked(true)
  }, [])

  return { show: checked && show, dismiss: () => setShow(false) }
}
