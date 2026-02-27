'use client'

import { useState } from 'react'
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, Star, Copy,
  Camera, Palette, DollarSign, Percent, SlidersHorizontal, AlertTriangle, RotateCcw,
} from 'lucide-react'
import type { LineItemState, ProductType, InstallRateMode } from '@/lib/estimator/types'
import { calcLineItem } from '@/lib/estimator/pricing'
import { MATERIAL_OPTIONS, STD_INSTALL_RATES, PRODUCT_TYPE_LABELS } from '@/lib/estimator/vehicleDb'
import PricingBreakdown from './PricingBreakdown'
import VehicleCalc from './calculators/VehicleCalc'
import BoxTruckCalc from './calculators/BoxTruckCalc'
import TrailerCalc from './calculators/TrailerCalc'
import MarineCalc from './calculators/MarineCalc'
import PPFCalc from './calculators/PPFCalc'
import CustomCalc from './calculators/CustomCalc'

interface LineItemCardProps {
  item: LineItemState
  index: number
  onChange: (id: string, updates: Partial<LineItemState>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'vehicle', label: 'Commercial Vehicle' },
  { value: 'boxtruck', label: 'Box Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'marine', label: 'Marine' },
  { value: 'ppf', label: 'PPF' },
  { value: 'decking', label: 'Boat Decking' },
  { value: 'wallwrap', label: 'Wall Wrap' },
  { value: 'signage', label: 'Signage' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'print', label: 'Print' },
  { value: 'custom', label: 'Custom' },
]

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fP = (n: number) => Math.round(n) + '%'

function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

export default function LineItemCard({ item, index, onChange, onRemove, onDuplicate }: LineItemCardProps) {
  const [showStdRates, setShowStdRates] = useState(item.showStdRates || false)
  const calc = calcLineItem(item)

  function update(updates: Partial<LineItemState>) {
    onChange(item.id, updates)
  }

  function handleTypeChange(type: ProductType) {
    update({
      type,
      name: PRODUCT_TYPE_LABELS[type] || 'Custom',
      // Reset type-specific fields
      sqft: 0, year: undefined, make: undefined, model: undefined,
      coverage: 'full', vData: undefined, includeRoof: false, roofSqft: 0,
      btLength: undefined, btHeight: undefined, btSides: undefined, btCab: false,
      trLength: undefined, trHeight: undefined, trSides: undefined,
      trFrontCoverage: undefined, trVnose: undefined,
      marHullLength: undefined, marHullHeight: undefined, marPasses: 2, marTransom: false,
      ppfSelected: [],
    })
  }

  function handleSalePriceOverride(val: string) {
    const price = parseFloat(val) || 0
    update({ salePrice: price, manualSale: price > 0 })
  }

  function resetSalePrice() {
    update({ manualSale: false, salePrice: 0 })
  }

  function handleGPMSlider(val: string) {
    update({ targetGPM: parseFloat(val) || 75, manualSale: false })
  }

  const isPPF = item.type === 'ppf'
  const isCollapsed = item.collapsed

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          background: 'var(--surface2)',
          cursor: 'pointer',
        }}
        onClick={() => update({ collapsed: !isCollapsed })}
      >
        <GripVertical size={16} style={{ color: 'var(--text3)', cursor: 'grab', flexShrink: 0 }} />

        <span style={{
          width: 24, height: 24, borderRadius: 6, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent)', color: '#fff',
          fontSize: 11, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
        }}>
          {index + 1}
        </span>

        <span style={{
          flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text1)',
          fontFamily: "'Barlow Condensed', sans-serif",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name || `Item ${index + 1}`}
        </span>

        {item.isOptional && (
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: 'rgba(245,158,11,0.15)', color: 'var(--amber)',
            textTransform: 'uppercase',
          }}>
            Optional
          </span>
        )}

        <span style={{
          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800,
          background: `${gpmColor(calc.gpm)}15`, color: gpmColor(calc.gpm),
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {fP(calc.gpm)}
        </span>

        <span style={{
          fontSize: 16, fontWeight: 800, color: 'var(--text1)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {fM(calc.salePrice)}
        </span>

        {isCollapsed ? <ChevronDown size={18} style={{ color: 'var(--text3)' }} /> : <ChevronUp size={18} style={{ color: 'var(--text3)' }} />}
      </div>

      {/* ─── Body ───────────────────────────────────────────────────────── */}
      {!isCollapsed && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
            {/* ─── LEFT PANEL ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Product Type Chips */}
              <div>
                <label style={lbl}>Product Type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRODUCT_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      onClick={() => handleTypeChange(pt.value)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, minHeight: 32,
                        border: item.type === pt.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: item.type === pt.value ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                        color: item.type === pt.value ? 'var(--accent)' : 'var(--text2)',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                      }}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name + Design Fee */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
                <div>
                  <label style={lbl}>Item Name</label>
                  <input
                    type="text"
                    value={item.name || ''}
                    onChange={e => update({ name: e.target.value })}
                    style={inp}
                    placeholder="e.g. Ford Transit Full Wrap"
                  />
                </div>
                <div>
                  <label style={lbl}>Design Fee</label>
                  <input
                    type="number"
                    value={item.designFee}
                    onChange={e => update({ designFee: parseFloat(e.target.value) || 0 })}
                    style={{ ...inp, fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>

              {/* Install Rate Selector */}
              <div>
                <label style={lbl}>Install Rate</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {/* Mode Toggle */}
                  <div style={{
                    display: 'flex', borderRadius: 8, overflow: 'hidden',
                    border: '1px solid var(--border)', flexShrink: 0,
                  }}>
                    <button
                      onClick={() => update({ installRateMode: 'pct' })}
                      style={{
                        padding: '8px 14px', border: 'none', minHeight: 38,
                        background: item.installRateMode === 'pct' ? 'var(--accent)' : 'var(--surface2)',
                        color: item.installRateMode === 'pct' ? '#fff' : 'var(--text3)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Percent size={12} /> % of Sale
                    </button>
                    <button
                      onClick={() => update({ installRateMode: 'flat' })}
                      style={{
                        padding: '8px 14px', border: 'none', minHeight: 38,
                        background: item.installRateMode === 'flat' ? 'var(--accent)' : 'var(--surface2)',
                        color: item.installRateMode === 'flat' ? '#fff' : 'var(--text3)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <DollarSign size={12} /> Flat $
                    </button>
                  </div>

                  {/* Rate Input */}
                  {item.installRateMode === 'pct' ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        value={item.laborPct}
                        onChange={e => update({ laborPct: parseFloat(e.target.value) || 0 })}
                        style={{ ...inp, flex: 1, fontFamily: "'JetBrains Mono', monospace" }}
                        min={0} max={100} step={0.5}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                        = {fM(calc.labor)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        value={item.laborFlat}
                        onChange={e => update({ laborFlat: parseFloat(e.target.value) || 0 })}
                        style={{ ...inp, flex: 1, fontFamily: "'JetBrains Mono', monospace" }}
                        min={0} step={25}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                        = {fP(calc.effectiveLaborPct)}
                      </span>
                    </div>
                  )}

                  {/* Std Rates Toggle */}
                  <button
                    onClick={() => setShowStdRates(!showStdRates)}
                    style={{
                      padding: '8px 10px', borderRadius: 8, minHeight: 38,
                      border: '1px solid var(--border)',
                      background: showStdRates ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                      color: showStdRates ? 'var(--accent)' : 'var(--text3)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    }}
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                </div>

                {/* Standard Rates Panel */}
                {showStdRates && (
                  <div style={{
                    marginTop: 8, padding: 12, borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6,
                  }}>
                    {STD_INSTALL_RATES.map(rate => (
                      <button
                        key={rate.name}
                        onClick={() => {
                          update({ installRateMode: 'flat', laborFlat: rate.pay })
                          setShowStdRates(false)
                        }}
                        style={{
                          padding: '8px 10px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>{rate.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                          {fM(rate.pay)} <span style={{ fontSize: 9, color: 'var(--text3)' }}>/ {rate.hrs}h</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Type-Specific Calculator */}
              <div>
                {item.type === 'vehicle' && <VehicleCalc item={item} onChange={(u) => update(u)} />}
                {item.type === 'boxtruck' && <BoxTruckCalc item={item} onChange={(u) => update(u)} />}
                {item.type === 'trailer' && <TrailerCalc item={item} onChange={(u) => update(u)} />}
                {item.type === 'marine' && <MarineCalc item={item} onChange={(u) => update(u)} />}
                {item.type === 'ppf' && <PPFCalc item={item} onChange={(u) => update(u)} />}
                {['custom', 'decking', 'wallwrap', 'signage', 'apparel', 'print'].includes(item.type) && (
                  <CustomCalc item={item} onChange={(u) => update(u)} />
                )}
              </div>

              {/* Material Chips (hidden for PPF) */}
              {!isPPF && (
                <div>
                  <label style={lbl}>Material</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {MATERIAL_OPTIONS.map(mat => (
                      <button
                        key={mat.id}
                        onClick={() => update({ matId: mat.id, matRate: mat.rate })}
                        style={{
                          padding: '6px 12px', borderRadius: 6,
                          border: item.matId === mat.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: item.matId === mat.id ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                          color: item.matId === mat.id ? 'var(--accent)' : 'var(--text2)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {mat.name} <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>${mat.rate.toFixed(2)}</span>/sqft
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo Inspector Placeholder */}
              <div>
                <label style={lbl}>Photos</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                }}>
                  <button style={{
                    height: 80, borderRadius: 8, border: '2px dashed var(--border)',
                    background: 'var(--surface2)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    color: 'var(--text3)',
                  }}>
                    <Camera size={18} />
                    <span style={{ fontSize: 9, fontWeight: 600 }}>Add Photos</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─── RIGHT PANEL ────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Sale Price */}
              <div>
                <label style={lbl}>Sale Price</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={item.manualSale ? item.salePrice : calc.salePrice}
                    onChange={e => handleSalePriceOverride(e.target.value)}
                    style={{
                      ...inp,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 22, fontWeight: 800,
                      color: 'var(--green)', textAlign: 'right',
                      padding: '12px 14px',
                    }}
                  />
                  {item.manualSale && (
                    <div style={{
                      position: 'absolute', top: -8, right: 8,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: 'rgba(245,158,11,0.15)', color: 'var(--amber)',
                      }}>
                        <AlertTriangle size={10} />
                        MANUAL
                      </span>
                      <button
                        onClick={resetSalePrice}
                        style={{
                          padding: '2px 6px', borderRadius: 4, border: 'none',
                          background: 'rgba(79,127,255,0.15)', color: 'var(--accent)',
                          cursor: 'pointer', fontSize: 9, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 2,
                        }}
                      >
                        <RotateCcw size={9} />
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <PricingBreakdown
                calc={calc}
                vehicleSize={item.vData?.size}
                showStdComparison={item.type === 'vehicle'}
              />

              {/* GPM Slider (hidden for PPF) */}
              {!isPPF && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={lbl}>Target GPM</label>
                    <span style={{
                      fontSize: 12, fontWeight: 800, color: gpmColor(item.targetGPM),
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {fP(item.targetGPM)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40} max={85} step={1}
                    value={item.targetGPM}
                    onChange={e => handleGPMSlider(e.target.value)}
                    style={{ width: '100%', accentColor: gpmColor(item.targetGPM), cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)' }}>
                    <span>40%</span>
                    <span>85%</span>
                  </div>
                </div>
              )}

              {/* Action Row */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  onClick={() => update({ isOptional: !item.isOptional })}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 6, minHeight: 36,
                    border: item.isOptional ? '1px solid var(--amber)' : '1px solid var(--border)',
                    background: item.isOptional ? 'rgba(245,158,11,0.12)' : 'var(--surface2)',
                    color: item.isOptional ? 'var(--amber)' : 'var(--text3)',
                    cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <Star size={12} />
                  {item.isOptional ? 'Optional' : 'Mark Optional'}
                </button>
                <button
                  onClick={() => onDuplicate(item.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, minHeight: 36,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    color: 'var(--text3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 6, minHeight: 36,
                    border: '1px solid var(--red)', background: 'rgba(242,90,90,0.08)',
                    color: 'var(--red)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Styles ─────────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  fontFamily: "'Barlow Condensed', sans-serif",
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text1)',
  outline: 'none', fontFamily: 'inherit', minHeight: 38,
}
