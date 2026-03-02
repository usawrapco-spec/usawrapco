'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalcType = 'commercial' | 'box_truck' | 'trailer' | 'marine' | 'ppf'

export interface CalcResult {
  salePrice: number
  materialCost: number
  laborCost: number
  gpm: number
  netSqft?: number
  totalSqft?: number
  linearFt?: number
  laborHrs?: number
}

interface CompactCalculatorProps {
  type: CalcType
  targetGpm: number
  onResult?: (result: CalcResult) => void
  initialData?: Partial<CalcResult>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_SELECT = [
  { name: 'Sm Car',   sqft: 180 },
  { name: 'Med Car',  sqft: 220 },
  { name: 'Full Car', sqft: 260 },
  { name: 'Sm Truck', sqft: 200 },
  { name: 'Med Truck',sqft: 250 },
  { name: 'Full Truck',sqft:300 },
  { name: 'Med Van',  sqft: 240 },
  { name: 'Lg Van',   sqft: 310 },
  { name: 'XL Van',   sqft: 360 },
  { name: 'XXL Van',  sqft: 420 },
]

const COVERAGES = [
  { label: 'Full Wrap',    mult: 1.00 },
  { label: '3/4 Wrap',     mult: 0.75 },
  { label: 'Half Wrap',    mult: 0.50 },
  { label: 'Hood Only',    mult: 0.12 },
  { label: 'Roof Only',    mult: 0.10 },
  { label: 'Custom Zones', mult: 0    },
  { label: 'Install Only', mult: 0    },
]

const ZONES = ['Hood', 'Roof', 'Trunk', 'Driver Side', 'Pass Side', 'Front Bumper', 'Rear Bumper', 'Mirrors', 'Pillars']

const ZONE_SQFT: Record<string, number> = {
  'Hood': 28, 'Roof': 35, 'Trunk': 18, 'Driver Side': 65, 'Pass Side': 65,
  'Front Bumper': 15, 'Rear Bumper': 15, 'Mirrors': 6, 'Pillars': 10,
}

const MATERIALS = [
  { label: 'Avery MPI 1105', ppsf: 2.10 },
  { label: 'Avery MPI 1005', ppsf: 1.85 },
  { label: '3M 2080',        ppsf: 2.50 },
  { label: '3M IJ180',       ppsf: 2.30 },
  { label: 'Avery Supreme',  ppsf: 2.75 },
  { label: 'Arlon SLX',      ppsf: 2.20 },
  { label: 'Hexis',          ppsf: 2.00 },
]

const WASTE_OPTIONS = [5, 10, 15, 20]

const PPF_PACKAGES = [
  { name: 'Full Hood',      yds: 4.2, price: 899  },
  { name: 'Partial Hood',   yds: 2.1, price: 549  },
  { name: 'Front Fenders',  yds: 3.5, price: 749  },
  { name: 'Mirrors',        yds: 0.8, price: 249  },
  { name: 'Front Bumper',   yds: 2.8, price: 649  },
  { name: 'Rocker Panels',  yds: 2.4, price: 449  },
  { name: 'A-Pillars',      yds: 0.6, price: 199  },
  { name: 'Full Front',     yds: 9.0, price: 1799 },
]

const LABOR_RATE     = 35    // $/hr
const SQFT_PER_HOUR  = 35.71 // sqft/hr

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gpmColor(gpm: number): string {
  if (gpm >= 75) return 'var(--green)'
  if (gpm >= 65) return '#f59e0b'
  return 'var(--red)'
}

function calcRevFromGpm(cost: number, gpm: number): number {
  if (gpm >= 100) return cost * 10
  return cost / (1 - gpm / 100)
}

function calcGpm(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return Math.round(((revenue - cost) / revenue) * 100 * 10) / 10
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', background: 'var(--bg)',
  border: '1px solid var(--surface2)', borderRadius: 7,
  color: 'var(--text1)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5,
}

function ResultBar({ result }: { result: CalcResult }) {
  const color = gpmColor(result.gpm)
  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
      display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8,
      border: '1px solid var(--surface2)',
    }}>
      <div>
        <div style={labelStyle}>Sale Price</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>
          ${fmt(result.salePrice)}
        </div>
      </div>
      <div>
        <div style={labelStyle}>Material</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(result.materialCost)}</div>
      </div>
      <div>
        <div style={labelStyle}>Labor</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(result.laborCost)}</div>
      </div>
      <div>
        <div style={labelStyle}>GPM</div>
        <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{result.gpm}%</div>
      </div>
    </div>
  )
}

// ─── Commercial Calculator ────────────────────────────────────────────────────

function CommercialCalc({ targetGpm, onResult }: { targetGpm: number; onResult?: (r: CalcResult) => void }) {
  const [baseSqft, setBaseSqft] = useState(0)
  const [coverage, setCoverage] = useState(COVERAGES[0])
  const [zones, setZones] = useState<string[]>([])
  const [matIdx, setMatIdx] = useState(0)
  const [laminate, setLaminate] = useState(false)
  const [waste, setWaste] = useState(10)
  const [result, setResult] = useState<CalcResult | null>(null)
  const [installOnly, setInstallOnly] = useState(false)

  const calculate = useCallback(() => {
    let sqft = 0
    if (coverage.label === 'Custom Zones') {
      sqft = zones.reduce((acc, z) => acc + (ZONE_SQFT[z] || 0), 0)
    } else {
      sqft = baseSqft * coverage.mult
    }
    const netSqft = sqft
    const withWaste = sqft * (1 + waste / 100)
    const linearFt = withWaste / 5
    const matPpsf = MATERIALS[matIdx].ppsf + (laminate ? 0.60 : 0)
    const materialCost = installOnly ? 0 : withWaste * matPpsf
    const laborHrs = netSqft / SQFT_PER_HOUR
    const laborCost = laborHrs * LABOR_RATE
    const totalCost = materialCost + laborCost
    const salePrice = calcRevFromGpm(totalCost, targetGpm)
    const gpm = calcGpm(salePrice, totalCost)
    const r: CalcResult = {
      salePrice: Math.round(salePrice),
      materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost),
      gpm, netSqft: Math.round(netSqft),
      totalSqft: Math.round(withWaste),
      linearFt: Math.round(linearFt),
      laborHrs: Math.round(laborHrs * 10) / 10,
    }
    setResult(r)
    onResult?.(r)
  }, [baseSqft, coverage, zones, matIdx, laminate, waste, installOnly, targetGpm, onResult])

  useEffect(() => { if (baseSqft > 0 || zones.length > 0) calculate() }, [baseSqft, coverage, zones, matIdx, laminate, waste, installOnly, calculate])

  function toggleZone(z: string) {
    setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Quick select */}
      <div>
        <div style={labelStyle}>Quick Select Vehicle</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
          {QUICK_SELECT.map(v => (
            <button
              key={v.name}
              onClick={() => setBaseSqft(v.sqft)}
              style={{
                padding: '6px 4px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${baseSqft === v.sqft ? 'var(--accent)' : 'var(--surface2)'}`,
                background: baseSqft === v.sqft ? '#4f7fff20' : 'transparent',
                color: baseSqft === v.sqft ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              {v.name}<br />
              <span style={{ fontSize: 10, opacity: 0.7 }}>{v.sqft} sf</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sqft manual input */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Base Sqft</div>
          <input
            type="number" min="0" value={baseSqft || ''}
            onChange={e => setBaseSqft(Number(e.target.value))}
            placeholder="Enter sqft"
            style={inputStyle}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 8 }}>
          <input type="checkbox" checked={installOnly} onChange={e => setInstallOnly(e.target.checked)} />
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Install Only</span>
        </label>
      </div>

      {/* Coverage */}
      <div>
        <div style={labelStyle}>Coverage</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {COVERAGES.map(c => (
            <button
              key={c.label}
              onClick={() => setCoverage(c)}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${coverage.label === c.label ? 'var(--accent)' : 'var(--surface2)'}`,
                background: coverage.label === c.label ? '#4f7fff20' : 'transparent',
                color: coverage.label === c.label ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone picker */}
      {coverage.label === 'Custom Zones' && (
        <div>
          <div style={labelStyle}>Zones</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ZONES.map(z => {
              const active = zones.includes(z)
              return (
                <button
                  key={z}
                  onClick={() => toggleZone(z)}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--cyan)' : 'var(--surface2)'}`,
                    background: active ? '#22d3ee20' : 'transparent',
                    color: active ? 'var(--cyan)' : 'var(--text2)',
                  }}
                >
                  {z} <span style={{ fontSize: 10, opacity: 0.7 }}>{ZONE_SQFT[z]}sf</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Material + Laminate + Waste */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 2 }}>
          <div style={labelStyle}>Material</div>
          <select
            value={matIdx}
            onChange={e => setMatIdx(Number(e.target.value))}
            style={{ ...inputStyle, appearance: 'none' as React.CSSProperties['appearance'], cursor: 'pointer' }}
          >
            {MATERIALS.map((m, i) => (
              <option key={m.label} value={i}>{m.label} ${m.ppsf.toFixed(2)}/sf</option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Laminate</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {([false, true] as const).map(v => (
              <button
                key={String(v)}
                onClick={() => setLaminate(v)}
                style={{
                  padding: '7px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${laminate === v ? 'var(--accent)' : 'var(--surface2)'}`,
                  background: laminate === v ? '#4f7fff20' : 'transparent',
                  color: laminate === v ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {v ? '+$0.60/sf' : 'No Lam'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Waste */}
      <div>
        <div style={labelStyle}>Waste Buffer</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {WASTE_OPTIONS.map(w => (
            <button
              key={w}
              onClick={() => setWaste(w)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${waste === w ? 'var(--accent)' : 'var(--surface2)'}`,
                background: waste === w ? '#4f7fff20' : 'transparent',
                color: waste === w ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              {w}%
            </button>
          ))}
        </div>
      </div>

      {result && <ResultBar result={result} />}
    </div>
  )
}

// ─── Box Truck Calculator ─────────────────────────────────────────────────────

function BoxTruckCalc({ targetGpm, onResult }: { targetGpm: number; onResult?: (r: CalcResult) => void }) {
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const [sides, setSides] = useState<string[]>(['left', 'right', 'rear'])
  const [cabAddon, setCabAddon] = useState(false)
  const [matIdx, setMatIdx] = useState(0)
  const [result, setResult] = useState<CalcResult | null>(null)

  const SIDE_SQFT = useCallback(() => {
    const l = parseFloat(length) || 0
    const h = parseFloat(height) || 0
    const map: Record<string, number> = {
      left: l * h, right: l * h, rear: h * 8, front: h * 8,
    }
    return map
  }, [length, height])

  const calculate = useCallback(() => {
    const sqftMap = SIDE_SQFT()
    const netSqft = sides.reduce((acc, s) => acc + (sqftMap[s] || 0), 0)
    if (netSqft === 0) return
    const withWaste = netSqft * 1.10
    const materialCost = withWaste * MATERIALS[matIdx].ppsf
    const laborHrs = netSqft / SQFT_PER_HOUR
    const laborCost = laborHrs * LABOR_RATE
    const totalCost = materialCost + laborCost
    const baseSale = calcRevFromGpm(totalCost, targetGpm)
    const salePrice = baseSale + (cabAddon ? 1950 : 0)
    const gpm = calcGpm(salePrice, totalCost)
    const r: CalcResult = {
      salePrice: Math.round(salePrice), materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost), gpm,
      netSqft: Math.round(netSqft), totalSqft: Math.round(withWaste),
      laborHrs: Math.round(laborHrs * 10) / 10,
    }
    setResult(r)
    onResult?.(r)
  }, [sides, matIdx, cabAddon, targetGpm, onResult, SIDE_SQFT])

  useEffect(() => { calculate() }, [calculate])

  function toggleSide(s: string) {
    setSides(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Length (ft)</div>
          <input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="20" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Height (ft)</div>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="7.5" style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={labelStyle}>Sides</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['left', 'right', 'rear', 'front'].map(s => {
            const active = sides.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleSide(s)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                  textTransform: 'capitalize',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                  background: active ? '#4f7fff20' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 2 }}>
          <div style={labelStyle}>Material</div>
          <select
            value={matIdx}
            onChange={e => setMatIdx(Number(e.target.value))}
            style={{ ...inputStyle, appearance: 'none' as React.CSSProperties['appearance'] }}
          >
            {MATERIALS.map((m, i) => <option key={m.label} value={i}>{m.label} ${m.ppsf.toFixed(2)}/sf</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 8, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={cabAddon} onChange={e => setCabAddon(e.target.checked)} />
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Cab +$1,950</span>
        </label>
      </div>

      {result && <ResultBar result={result} />}
    </div>
  )
}

// ─── Trailer Calculator ───────────────────────────────────────────────────────

function TrailerCalc({ targetGpm, onResult }: { targetGpm: number; onResult?: (r: CalcResult) => void }) {
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const [sides, setSides] = useState<string[]>(['left', 'right'])
  const [frontCov, setFrontCov] = useState<'full' | '3-4' | 'half'>('full')
  const [vnose, setVnose] = useState<'none' | 'half' | 'custom'>('none')
  const [vnoseH, setVnoseH] = useState('')
  const [vnoseL, setVnoseL] = useState('')
  const [matIdx, setMatIdx] = useState(0)
  const [result, setResult] = useState<CalcResult | null>(null)

  const calculate = useCallback(() => {
    const l = parseFloat(length) || 0
    const h = parseFloat(height) || 0
    if (!l || !h) return
    const sideArea = l * h
    let netSqft = sides.length * sideArea
    const frontMults: Record<string, number> = { full: 1, '3-4': 0.75, half: 0.5 }
    netSqft += (h * 8) * (frontMults[frontCov] || 1)
    if (vnose === 'half') netSqft += (h * 4) * 0.5
    if (vnose === 'custom') {
      const vh = parseFloat(vnoseH) || 0
      const vl = parseFloat(vnoseL) || 0
      netSqft += vh * vl
    }
    const withWaste = netSqft * 1.10
    const materialCost = withWaste * MATERIALS[matIdx].ppsf
    const laborHrs = netSqft / SQFT_PER_HOUR
    const laborCost = laborHrs * LABOR_RATE
    const totalCost = materialCost + laborCost
    const salePrice = calcRevFromGpm(totalCost, targetGpm)
    const gpm = calcGpm(salePrice, totalCost)
    const r: CalcResult = {
      salePrice: Math.round(salePrice), materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost), gpm,
      netSqft: Math.round(netSqft), totalSqft: Math.round(withWaste),
      laborHrs: Math.round(laborHrs * 10) / 10,
    }
    setResult(r)
    onResult?.(r)
  }, [length, height, sides, frontCov, vnose, vnoseH, vnoseL, matIdx, targetGpm, onResult])

  useEffect(() => { calculate() }, [calculate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Length (ft)</div>
          <input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="53" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Height (ft)</div>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="13.5" style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={labelStyle}>Sides</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['left', 'right'].map(s => {
            const active = sides.includes(s)
            return (
              <button
                key={s}
                onClick={() => setSides(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                  textTransform: 'capitalize',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                  background: active ? '#4f7fff20' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div style={labelStyle}>Front Coverage</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['full', '3-4', 'half'] as const).map(c => (
            <button
              key={c}
              onClick={() => setFrontCov(c)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${frontCov === c ? 'var(--accent)' : 'var(--surface2)'}`,
                background: frontCov === c ? '#4f7fff20' : 'transparent',
                color: frontCov === c ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              {c === '3-4' ? '3/4' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={labelStyle}>V-Nose</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['none', 'half', 'custom'] as const).map(c => (
            <button
              key={c}
              onClick={() => setVnose(c)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, cursor: 'pointer',
                textTransform: 'capitalize',
                border: `1px solid ${vnose === c ? 'var(--purple)' : 'var(--surface2)'}`,
                background: vnose === c ? '#8b5cf620' : 'transparent',
                color: vnose === c ? 'var(--purple)' : 'var(--text2)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
        {vnose === 'custom' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>V-Nose Height (ft)</div>
              <input type="number" value={vnoseH} onChange={e => setVnoseH(e.target.value)} placeholder="4" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>V-Nose Length (ft)</div>
              <input type="number" value={vnoseL} onChange={e => setVnoseL(e.target.value)} placeholder="6" style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={labelStyle}>Material</div>
        <select
          value={matIdx}
          onChange={e => setMatIdx(Number(e.target.value))}
          style={{ ...inputStyle, appearance: 'none' as React.CSSProperties['appearance'] }}
        >
          {MATERIALS.map((m, i) => <option key={m.label} value={i}>{m.label} ${m.ppsf.toFixed(2)}/sf</option>)}
        </select>
      </div>

      {result && <ResultBar result={result} />}
    </div>
  )
}

// ─── Marine Calculator ────────────────────────────────────────────────────────

function MarineCalc({ targetGpm, onResult }: { targetGpm: number; onResult?: (r: CalcResult) => void }) {
  const [hullLength, setHullLength] = useState('')
  const [hullHeight, setHullHeight] = useState('')
  const [passes, setPasses] = useState(1)
  const [transom, setTransom] = useState(false)
  const [prepHrs, setPrepHrs] = useState('')
  const [matIdx, setMatIdx] = useState(0)
  const [result, setResult] = useState<CalcResult | null>(null)

  const calculate = useCallback(() => {
    const l = parseFloat(hullLength) || 0
    const h = parseFloat(hullHeight) || 0
    if (!l || !h) return
    let netSqft = l * h * passes * 2 // both sides
    if (transom) netSqft += h * 8
    const withWaste = netSqft * 1.20
    const materialCost = withWaste * MATERIALS[matIdx].ppsf
    const wrapHrs = netSqft / SQFT_PER_HOUR
    const pHrs = parseFloat(prepHrs) || 0
    const laborHrs = wrapHrs + pHrs
    const laborCost = laborHrs * LABOR_RATE
    const totalCost = materialCost + laborCost
    const salePrice = calcRevFromGpm(totalCost, targetGpm)
    const gpm = calcGpm(salePrice, totalCost)
    const r: CalcResult = {
      salePrice: Math.round(salePrice), materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost), gpm,
      netSqft: Math.round(netSqft), totalSqft: Math.round(withWaste),
      laborHrs: Math.round(laborHrs * 10) / 10,
    }
    setResult(r)
    onResult?.(r)
  }, [hullLength, hullHeight, passes, transom, prepHrs, matIdx, targetGpm, onResult])

  useEffect(() => { calculate() }, [calculate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Hull Length (ft)</div>
          <input type="number" value={hullLength} onChange={e => setHullLength(e.target.value)} placeholder="24" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Hull Height (ft)</div>
          <input type="number" value={hullHeight} onChange={e => setHullHeight(e.target.value)} placeholder="3.5" style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={labelStyle}>Passes</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3].map(p => (
            <button
              key={p}
              onClick={() => setPasses(p)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${passes === p ? 'var(--cyan)' : 'var(--surface2)'}`,
                background: passes === p ? '#22d3ee20' : 'transparent',
                color: passes === p ? 'var(--cyan)' : 'var(--text2)',
              }}
            >
              {p}x
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 2 }}>
          <div style={labelStyle}>Material</div>
          <select
            value={matIdx}
            onChange={e => setMatIdx(Number(e.target.value))}
            style={{ ...inputStyle, appearance: 'none' as React.CSSProperties['appearance'] }}
          >
            {MATERIALS.map((m, i) => <option key={m.label} value={i}>{m.label} ${m.ppsf.toFixed(2)}/sf</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Prep Hours</div>
          <input type="number" value={prepHrs} onChange={e => setPrepHrs(e.target.value)} placeholder="0" style={inputStyle} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={transom} onChange={e => setTransom(e.target.checked)} />
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Include Transom</span>
      </label>

      <div style={{ fontSize: 11, color: 'var(--text3)' }}>20% waste allowance applied automatically</div>

      {result && <ResultBar result={result} />}
    </div>
  )
}

// ─── PPF Calculator ───────────────────────────────────────────────────────────

function PPFCalc({ onResult }: { onResult?: (r: CalcResult) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [result, setResult] = useState<CalcResult | null>(null)

  const calculate = useCallback(() => {
    const pkgs = PPF_PACKAGES.filter(p => selected.includes(p.name))
    if (pkgs.length === 0) return
    const totalYds = pkgs.reduce((acc, p) => acc + p.yds, 0)
    const salePrice = pkgs.reduce((acc, p) => acc + p.price, 0)
    const materialCost = totalYds * 9 * 2.80 // yd→sqft * cost
    const laborHrs = totalYds * 9 / SQFT_PER_HOUR
    const laborCost = laborHrs * LABOR_RATE
    const totalCost = materialCost + laborCost
    const gpm = calcGpm(salePrice, totalCost)
    const r: CalcResult = {
      salePrice, materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost), gpm,
      totalSqft: Math.round(totalYds * 9),
    }
    setResult(r)
    onResult?.(r)
  }, [selected, onResult])

  useEffect(() => { calculate() }, [calculate])

  function toggle(name: string) {
    setSelected(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {PPF_PACKAGES.map(pkg => {
          const active = selected.includes(pkg.name)
          return (
            <button
              key={pkg.name}
              onClick={() => toggle(pkg.name)}
              style={{
                padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                background: active ? '#4f7fff15' : 'var(--bg)',
                position: 'relative',
              }}
            >
              {active && (
                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                  <Check size={12} color="var(--accent)" />
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text1)', marginBottom: 2 }}>
                {pkg.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{pkg.yds} yds</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text2)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                ${pkg.price.toLocaleString()}
              </div>
            </button>
          )
        })}
      </div>
      {result && <ResultBar result={result} />}
    </div>
  )
}

// ─── CompactCalculator (main export) ─────────────────────────────────────────

export function CompactCalculator({ type, targetGpm, onResult }: CompactCalculatorProps) {
  switch (type) {
    case 'commercial': return <CommercialCalc targetGpm={targetGpm} onResult={onResult} />
    case 'box_truck':  return <BoxTruckCalc   targetGpm={targetGpm} onResult={onResult} />
    case 'trailer':    return <TrailerCalc    targetGpm={targetGpm} onResult={onResult} />
    case 'marine':     return <MarineCalc     targetGpm={targetGpm} onResult={onResult} />
    case 'ppf':        return <PPFCalc        onResult={onResult} />
    default:           return null
  }
}
