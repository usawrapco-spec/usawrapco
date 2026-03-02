'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Car, Layers, DollarSign, AlertCircle, ArrowRight, Zap, CheckCircle } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface PricingResult {
  vehicleId: string
  make: string
  model: string
  bodyStyle: string
  sqftFull: number
  coverageLevel: string
  coveragePct: number
  coverageLabel: string
  effectiveSqft: number
  difficultyFactor: number
  materialCost: number
  laborCost: number
  designFee: number
  totalPrice: number
  monthlyFinancing: number
  breakdown: {
    sqftBase: number
    sqftWithWaste: number
    materialPerSqft: number
    laborPerSqft: number
    difficultyMultiplier: number
    wasteBuffer: string
  }
}

const COVERAGE_LEVELS = [
  { key: 'full',          label: 'Full Wrap',      pct: '100%', desc: 'Complete bumper-to-bumper coverage', tier: 'Best',   accent: '#22c07a' },
  { key: 'three_quarter', label: '3/4 Wrap',        pct: '75%',  desc: 'Sides, rear, and partial hood',      tier: 'Better', accent: '#4f7fff' },
  { key: 'half',          label: 'Half Wrap',        pct: '60%',  desc: 'Strategic high-visibility panels',   tier: 'Good',   accent: '#f59e0b' },
  { key: 'quarter',       label: 'Quarter Wrap',     pct: '30%',  desc: 'Key branding areas only',            tier: null,     accent: '#9299b5' },
  { key: 'spot',          label: 'Spot Graphics',    pct: '15%',  desc: 'Logo and contact info decals',       tier: null,     accent: '#9299b5' },
]

interface Props {
  onGetStarted?: (data: { coverageLevel: string; totalPrice: number; vehicleInfo: string }) => void
  compact?: boolean
}

export default function PricingCalculator({ onGetStarted, compact }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedCoverage, setSelectedCoverage] = useState('full')
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMakes, setLoadingMakes] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load makes on mount
  useEffect(() => {
    fetch('/api/pricing/calculate?action=makes')
      .then(r => r.json())
      .then(d => { setMakes(d.makes || []); setLoadingMakes(false) })
      .catch(() => { setLoadingMakes(false); setError('Failed to load vehicle data') })
  }, [])

  // Load models when make changes
  useEffect(() => {
    if (!selectedMake) { setModels([]); return }
    setLoadingModels(true)
    setSelectedModel('')
    setVehicleId(null)
    fetch(`/api/pricing/calculate?action=models&make=${encodeURIComponent(selectedMake)}`)
      .then(r => r.json())
      .then(d => { setModels(d.models || []); setLoadingModels(false) })
      .catch(() => setLoadingModels(false))
  }, [selectedMake])

  // Fetch vehicle ID when model selected
  useEffect(() => {
    if (!selectedMake || !selectedModel) return
    fetch(`/api/pricing/calculate?action=vehicle&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}`)
      .then(r => r.json())
      .then(d => { if (d.vehicle) setVehicleId(d.vehicle.id) })
      .catch(() => {})
  }, [selectedMake, selectedModel])

  const calculatePrice = useCallback(async () => {
    if (!selectedMake || !selectedModel) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          coverageLevel: selectedCoverage,
          make: selectedMake,
          model: selectedModel,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Calculation failed')
      setPricingResult(data)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate price')
    } finally {
      setLoading(false)
    }
  }, [vehicleId, selectedCoverage, selectedMake, selectedModel])

  const fmt = (n: number) => `$${n.toLocaleString()}`

  const s: React.CSSProperties = {
    fontFamily: 'inherit',
  }

  return (
    <div style={{ ...s, maxWidth: compact ? '100%' : 720, margin: '0 auto' }}>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'rgba(242,90,90,0.12)', border: '1px solid rgba(242,90,90,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, color: '#f25a5a',
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 14 }}>{error}</span>
        </div>
      )}

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        {[
          { n: 1, label: 'Your Vehicle', icon: Car },
          { n: 2, label: 'Coverage',     icon: Layers },
          { n: 3, label: 'Your Price',   icon: DollarSign },
        ].map(({ n, label, icon: Icon }, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div
              onClick={() => { if (n < step) setStep(n as 1|2|3) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: n < step ? 'pointer' : 'default',
                padding: '8px 12px', borderRadius: 8, flex: 1,
                background: step === n ? 'rgba(245,158,11,0.15)' : step > n ? 'rgba(34,192,122,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${step === n ? 'rgba(245,158,11,0.4)' : step > n ? 'rgba(34,192,122,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: step === n ? '#f59e0b' : step > n ? '#22c07a' : 'rgba(255,255,255,0.08)',
                fontSize: 12, fontWeight: 700, color: step >= n ? '#000' : 'var(--text3)',
              }}>
                {step > n ? <CheckCircle size={14} /> : n}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: step === n ? '#f59e0b' : step > n ? '#22c07a' : 'var(--text3)' }}>
                {label}
              </span>
            </div>
            {i < 2 && <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Vehicle selector */}
      {step === 1 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={18} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>What vehicle are you wrapping?</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>We'll look up exact square footage for your vehicle</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Make */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Make
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMake}
                  onChange={e => setSelectedMake(e.target.value)}
                  disabled={loadingMakes}
                  style={{
                    width: '100%', padding: '12px 36px 12px 14px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: selectedMake ? 'var(--text1)' : 'var(--text3)',
                    fontSize: 14, appearance: 'none', cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">{loadingMakes ? 'Loading...' : 'Select make'}</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Model */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Model
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  disabled={!selectedMake || loadingModels}
                  style={{
                    width: '100%', padding: '12px 36px 12px 14px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: selectedModel ? 'var(--text1)' : 'var(--text3)',
                    fontSize: 14, appearance: 'none',
                    cursor: selectedMake ? 'pointer' : 'not-allowed',
                    opacity: !selectedMake ? 0.5 : 1,
                    outline: 'none',
                  }}
                >
                  <option value="">{loadingModels ? 'Loading...' : !selectedMake ? 'Select make first' : 'Select model'}</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedMake || !selectedModel}
            style={{
              marginTop: 20, width: '100%', padding: '14px 20px', borderRadius: 10,
              background: selectedMake && selectedModel ? '#f59e0b' : 'rgba(255,255,255,0.06)',
              color: selectedMake && selectedModel ? '#000' : 'var(--text3)',
              border: 'none', fontSize: 15, fontWeight: 700, cursor: selectedMake && selectedModel ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            Next: Choose Coverage
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Coverage level */}
      {step === 2 && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>How much coverage?</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                {selectedMake} {selectedModel} — more coverage = more impact
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {COVERAGE_LEVELS.map(level => (
              <div
                key={level.key}
                onClick={() => setSelectedCoverage(level.key)}
                style={{
                  padding: '16px 18px', borderRadius: 10, cursor: 'pointer',
                  background: selectedCoverage === level.key ? 'rgba(245,158,11,0.1)' : 'var(--surface2)',
                  border: `2px solid ${selectedCoverage === level.key ? '#f59e0b' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all 0.15s',
                }}
              >
                {/* Coverage bar visualization */}
                <div style={{ width: 80, flexShrink: 0 }}>
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: level.pct,
                      background: selectedCoverage === level.key ? '#f59e0b' : level.accent,
                      transition: 'all 0.2s',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textAlign: 'center' }}>{level.pct}</div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: selectedCoverage === level.key ? '#f59e0b' : 'var(--text1)' }}>
                      {level.label}
                    </span>
                    {level.tier && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: level.tier === 'Best' ? 'rgba(34,192,122,0.15)' : level.tier === 'Better' ? 'rgba(79,127,255,0.15)' : 'rgba(245,158,11,0.15)',
                        color: level.tier === 'Best' ? '#22c07a' : level.tier === 'Better' ? '#4f7fff' : '#f59e0b',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {level.tier}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3 }}>{level.desc}</div>
                </div>

                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selectedCoverage === level.key ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                  background: selectedCoverage === level.key ? '#f59e0b' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selectedCoverage === level.key && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={calculatePrice}
            disabled={loading}
            style={{
              marginTop: 20, width: '100%', padding: '14px 20px', borderRadius: 10,
              background: '#f59e0b', color: '#000',
              border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Calculating...
              </>
            ) : (
              <>
                <Zap size={16} />
                Get Instant Price
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Price display */}
      {step === 3 && pricingResult && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {pricingResult.make} {pricingResult.model} — {pricingResult.coverageLabel}
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
              {fmt(pricingResult.totalPrice)}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 10 }}>
              Or as low as{' '}
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{fmt(pricingResult.monthlyFinancing)}/mo</span>
              {' '}with financing
            </div>
          </div>

          {/* Breakdown cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Materials',   value: fmt(pricingResult.materialCost), sub: `${pricingResult.effectiveSqft} sq ft` },
              { label: 'Labor',       value: fmt(pricingResult.laborCost),    sub: 'Install included' },
              { label: 'Design Fee',  value: fmt(pricingResult.designFee),    sub: 'Custom artwork' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--surface2)', borderRadius: 10, padding: 14,
                border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)' }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 20, border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Price Details</div>
            {[
              { label: 'Coverage area',         value: `${pricingResult.breakdown.sqftBase} sq ft` },
              { label: 'With 10% waste buffer',  value: `${pricingResult.effectiveSqft} sq ft` },
              { label: 'Material rate',          value: `$${pricingResult.breakdown.materialPerSqft}/sq ft` },
              { label: 'Labor rate',             value: `$${pricingResult.breakdown.laborPerSqft}/sq ft` },
              ...(pricingResult.difficultyFactor !== 1 ? [{ label: 'Difficulty multiplier', value: `${pricingResult.difficultyFactor}x` }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{row.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => onGetStarted?.({
                coverageLevel: pricingResult.coverageLevel,
                totalPrice: pricingResult.totalPrice,
                vehicleInfo: `${pricingResult.make} ${pricingResult.model}`,
              })}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 10,
                background: '#f59e0b', color: '#000',
                border: 'none', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              See AI Wrap Designs
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => { setStep(1); setPricingResult(null) }}
              style={{
                width: '100%', padding: '12px 20px', borderRadius: 10,
                background: 'transparent', color: 'var(--text2)',
                border: '1px solid rgba(255,255,255,0.1)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Recalculate
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
