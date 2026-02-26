'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useCallback } from 'react'
import type { Profile } from '@/types'
import type { Prospect } from './ProspectorApp'
import {
  X, Bot, MapPin, Loader2, Check, Search, Crosshair,
} from 'lucide-react'

const BUSINESS_TILES = [
  { label: 'Food Trucks', key: 'food trucks' },
  { label: 'Restaurants', key: 'restaurants' },
  { label: 'Delivery Companies', key: 'delivery companies' },
  { label: 'Construction', key: 'construction companies' },
  { label: 'Landscaping', key: 'landscaping companies' },
  { label: 'Contractors', key: 'contractors' },
  { label: 'Medical Transport', key: 'medical transport' },
  { label: 'Auto Dealers', key: 'car dealerships' },
  { label: 'Real Estate', key: 'real estate companies' },
  { label: 'Breweries', key: 'breweries' },
  { label: 'Moving Companies', key: 'moving companies' },
  { label: 'Plumbing/HVAC', key: 'plumbing HVAC' },
  { label: 'Electricians', key: 'electricians' },
  { label: 'Towing', key: 'towing companies' },
  { label: 'Event Companies', key: 'event companies' },
  { label: 'Retail', key: 'retail businesses' },
]

interface Props {
  profile: Profile
  onClose: () => void
  onResults: (prospects: Prospect[]) => void
  settings: {
    defaultRadius: number
    minScore: number
    targetTypes: string[]
    maxPerRun: number
  }
}

type ProgressStep = { label: string; done: boolean }

export function AIProspectModal({ profile, onClose, onResults, settings }: Props) {
  const [useCurrentLocation, setUseCurrentLocation] = useState(true)
  const [searchAddress, setSearchAddress] = useState('')
  const [radius, setRadius] = useState(settings.defaultRadius)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [customType, setCustomType] = useState('')
  const [guidance, setGuidance] = useState('')
  const [fleetImportance, setFleetImportance] = useState(7)
  const [visibilityImportance, setVisibilityImportance] = useState(5)
  const [revenueImportance, setRevenueImportance] = useState(4)
  const [maxResults, setMaxResults] = useState(25)
  const [excludeExisting, setExcludeExisting] = useState(true)

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressStep[]>([])
  const [error, setError] = useState('')

  const toggleType = useCallback((key: string) => {
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }, [])

  const run = useCallback(async () => {
    setIsRunning(true)
    setError('')
    setProgress([
      { label: 'Getting your location...', done: false },
      { label: 'Searching Google Places...', done: false },
      { label: 'Scoring businesses with AI...', done: false },
      { label: 'Building prospect profiles...', done: false },
      { label: 'Saving new prospects...', done: false },
    ])

    try {
      // Step 1: Get location
      let lat = 47.6062, lng = -122.3321 // default Seattle
      if (useCurrentLocation && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch { /* use default */ }
      }
      setProgress(prev => prev.map((s, i) => i === 0 ? { ...s, done: true } : s))

      // Step 2: Call API
      setProgress(prev => prev.map((s, i) => i === 1 ? { ...s, label: 'Searching Google Places...' } : s))

      const types = [...selectedTypes]
      if (customType) types.push(customType)

      const res = await fetch('/api/prospector/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          address: useCurrentLocation ? null : searchAddress,
          radius,
          businessTypes: types.length > 0 ? types : ['businesses with vehicles'],
          guidance,
          fleetImportance,
          visibilityImportance,
          revenueImportance,
          maxResults,
          excludeExisting,
          minScore: settings.minScore,
          orgId: profile.org_id || ORG_ID,
        }),
      })

      setProgress(prev => prev.map((s, i) => i <= 1 ? { ...s, done: true } : s))

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Search failed')
      }

      setProgress(prev => prev.map((s, i) => i <= 2 ? { ...s, done: true } : s))

      const data = await res.json()

      setProgress(prev => prev.map((s, i) => i <= 3 ? { ...s, done: true } : s))

      // Step 5: Done
      setProgress(prev => prev.map(s => ({ ...s, done: true })))

      if (data.prospects && data.prospects.length > 0) {
        onResults(data.prospects)
        setTimeout(() => onClose(), 1500)
      } else {
        setError(`No new prospects found. ${data.found || 0} businesses searched, ${data.saved || 0} new saved.`)
        setIsRunning(false)
      }
    } catch (err: any) {
      setError(err.message || 'AI prospecting failed')
      setIsRunning(false)
    }
  }, [useCurrentLocation, searchAddress, radius, selectedTypes, customType, guidance, fleetImportance, visibilityImportance, revenueImportance, maxResults, excludeExisting, settings.minScore, profile.org_id, onResults, onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 560, maxHeight: '90vh', borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={22} style={{ color: 'var(--accent)' }} />
              AI Prospector
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              Tell the AI what to look for and it will find and score businesses for you
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {isRunning ? (
            /* Progress overlay */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <Bot size={28} style={{ color: '#fff' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text1)', marginBottom: 20 }}>
                AI is searching for businesses...
              </div>
              <div style={{ maxWidth: 300, margin: '0 auto' }}>
                {progress.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                    color: step.done ? '#22c07a' : 'var(--text3)',
                  }}>
                    {step.done ? (
                      <Check size={16} style={{ color: '#22c07a', flexShrink: 0 }} />
                    ) : (
                      <Loader2 size={16} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                    )}
                    <span style={{ fontSize: 13 }}>{step.label}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, background: 'rgba(242,90,90,0.1)', color: '#f25a5a', fontSize: 12 }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 1. Search Area */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', display: 'block', marginBottom: 8 }}>
                  Search Area
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => setUseCurrentLocation(true)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    background: useCurrentLocation ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                    color: useCurrentLocation ? 'var(--accent)' : 'var(--text3)',
                    border: useCurrentLocation ? '1px solid rgba(79,127,255,0.3)' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <Crosshair size={14} /> My Location
                  </button>
                  <button onClick={() => setUseCurrentLocation(false)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    background: !useCurrentLocation ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                    color: !useCurrentLocation ? 'var(--accent)' : 'var(--text3)',
                    border: !useCurrentLocation ? '1px solid rgba(79,127,255,0.3)' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <MapPin size={14} /> Enter Address
                  </button>
                </div>
                {!useCurrentLocation && (
                  <input value={searchAddress} onChange={e => setSearchAddress(e.target.value)}
                    placeholder="Enter city, zip, or address..."
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 13, outline: 'none', marginBottom: 8,
                    }} />
                )}
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                  Radius: {radius} miles
                </label>
                <input type="range" min={1} max={50} value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>

              {/* 2. Business Types */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', display: 'block', marginBottom: 8 }}>
                  Business Types to Target
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {BUSINESS_TILES.map(t => (
                    <button key={t.key} onClick={() => toggleType(t.key)} style={{
                      padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                      background: selectedTypes.includes(t.key) ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                      color: selectedTypes.includes(t.key) ? 'var(--accent)' : 'var(--text2)',
                      border: selectedTypes.includes(t.key) ? '1px solid rgba(79,127,255,0.3)' : '1px solid var(--border)',
                    }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <input value={customType} onChange={e => setCustomType(e.target.value)}
                  placeholder="Custom type..."
                  style={{
                    marginTop: 8, width: '100%', padding: '8px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                    color: 'var(--text1)', fontSize: 12, outline: 'none',
                  }} />
              </div>

              {/* 3. AI Guidance */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', display: 'block', marginBottom: 8 }}>
                  What to Look For (AI Guidance)
                </label>
                <textarea value={guidance} onChange={e => setGuidance(e.target.value)}
                  placeholder="e.g. I want businesses with fleets of 3+ vehicles. Focus on companies that would benefit from branded vehicle wraps for advertising."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    color: 'var(--text1)', fontSize: 12, outline: 'none', resize: 'vertical', lineHeight: 1.5,
                  }} />
              </div>

              {/* 4. Scoring Criteria */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', display: 'block', marginBottom: 8 }}>
                  AI Scoring Criteria
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SliderRow label="Fleet size importance" value={fleetImportance} onChange={setFleetImportance} />
                  <SliderRow label="Business visibility importance" value={visibilityImportance} onChange={setVisibilityImportance} />
                  <SliderRow label="Revenue estimate importance" value={revenueImportance} onChange={setRevenueImportance} />
                </div>
              </div>

              {/* 5. Max results */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Max Results</label>
                  <input type="number" min={5} max={100} value={maxResults}
                    onChange={e => setMaxResults(Number(e.target.value))}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 13, outline: 'none',
                    }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={() => setExcludeExisting(!excludeExisting)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    background: excludeExisting ? 'rgba(34,192,122,0.1)' : 'rgba(255,255,255,0.04)',
                    color: excludeExisting ? '#22c07a' : 'var(--text3)',
                    border: excludeExisting ? '1px solid rgba(34,192,122,0.2)' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {excludeExisting ? <Check size={12} /> : null} Exclude existing
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, background: 'rgba(242,90,90,0.1)', color: '#f25a5a', fontSize: 12 }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isRunning && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            <button onClick={run} style={{
              width: '100%', padding: '14px', borderRadius: 10,
              background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(79,127,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Search size={18} /> Start AI Prospecting
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.7 } }
      `}</style>
    </div>
  )
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--text2)', width: 180, flexShrink: 0 }}>{label}</span>
      <input type="range" min={0} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', width: 20, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
