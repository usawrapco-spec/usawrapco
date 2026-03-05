'use client'

import { useState, useMemo } from 'react'
import { X, Layers, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react'
import type { ZoneProposalItem, BundleConfig } from './calculators/BoatDeckingCalc'
import { calcGPMPct, GPM_MIN, gpmColor } from './calculators/types'

const fmtC = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

interface Props {
  zones: ZoneProposalItem[]
  config: BundleConfig
  onConfirm: (zones: ZoneProposalItem[], config: BundleConfig) => void
  onClose: () => void
}

export default function BoatDeckingProposalConfig({ zones: initZones, config: initConfig, onConfirm, onClose }: Props) {
  const [zones, setZones] = useState<ZoneProposalItem[]>(initZones)
  const [config, setConfig] = useState<BundleConfig>(initConfig)
  const [preview, setPreview] = useState(false)

  const totalListPrice = useMemo(() => zones.reduce((s, z) => s + z.sale_price + z.scanning_fee, 0), [zones])
  const totalCogs = useMemo(() => zones.reduce((s, z) => s + z.cogs + z.scanning_fee, 0), [zones])

  const discountAmount = config.discount_type === 'percent'
    ? totalListPrice * (config.discount_value / 100)
    : config.discount_value

  const bundleTotal = totalListPrice - discountAmount
  const bundleGPM = calcGPMPct(bundleTotal, totalCogs)
  const gpmSafe = bundleGPM >= GPM_MIN * 100
  const safeMaxDiscount = config.discount_type === 'percent'
    ? Math.floor((1 - totalCogs / totalListPrice - GPM_MIN) / (1 - GPM_MIN) * 100 * 10) / 10
    : Math.floor(totalListPrice - totalCogs / (1 - GPM_MIN))

  function updateZone(key: string, field: keyof ZoneProposalItem, value: unknown) {
    setZones(prev => prev.map(z => z.zone_key === key ? { ...z, [field]: value } : z))
  }

  const inputStyle: React.CSSProperties = {
    padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none', width: '100%',
    fontFamily: 'JetBrains Mono, monospace',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
    fontFamily: 'Barlow Condensed, sans-serif',
  }
  const pillStyle = (active: boolean, color = 'var(--accent)'): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 14, cursor: 'pointer', fontSize: 10, fontWeight: 700,
    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase',
    border: active ? `1.5px solid ${color}` : '1px solid var(--border)',
    background: active ? color + '22' : 'var(--surface)',
    color: active ? color : 'var(--text2)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em' }}>
              Configure Section Proposal
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPreview(!preview)} style={pillStyle(preview, 'var(--cyan)')}>
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          {preview ? (
            <ProposalPreview zones={zones} config={config} totalListPrice={totalListPrice} />
          ) : (
            <>
              {/* Zone Cards */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 10 }}>
                  Section Pricing
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {zones.map(z => (
                    <div key={z.zone_key} style={{
                      padding: '12px 14px', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 10,
                      display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px', gap: 12, alignItems: 'end',
                    }}>
                      <div>
                        <label style={labelStyle}>{z.zone_label}</label>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {z.sqft} sqft &middot; COGS {fmtC(z.cogs)}
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Sale Price</label>
                        <input
                          type="number"
                          value={z.sale_price || ''}
                          onChange={e => updateZone(z.zone_key, 'sale_price', Number(e.target.value))}
                          style={{ ...inputStyle, textAlign: 'right', borderColor: z.sale_price < z.cogs ? 'var(--red)' : undefined }}
                          min={0}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Scan Fee</label>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            onClick={() => updateZone(z.zone_key, 'scanning_fee', z.scanning_fee > 0 ? 0 : 75)}
                            style={pillStyle(z.scanning_fee > 0, 'var(--amber)')}
                          >
                            {z.scanning_fee > 0 ? 'On' : 'Off'}
                          </button>
                          {z.scanning_fee > 0 && (
                            <input
                              type="number"
                              value={z.scanning_fee}
                              onChange={e => updateZone(z.zone_key, 'scanning_fee', Number(e.target.value))}
                              style={{ ...inputStyle, width: 60, textAlign: 'right' }}
                              min={0} step={25}
                            />
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <label style={labelStyle}>Section Total</label>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {fmtC(z.sale_price + z.scanning_fee)}
                        </div>
                        <div style={{ fontSize: 9, color: calcGPMPct(z.sale_price + z.scanning_fee, z.cogs + z.scanning_fee) >= 65 ? 'var(--green)' : 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {calcGPMPct(z.sale_price + z.scanning_fee, z.cogs + z.scanning_fee).toFixed(1)}% GPM
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bundle Discount */}
              <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12 }}>
                  Bundle Discount
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Discount Type</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setConfig(c => ({ ...c, discount_type: 'percent' }))} style={pillStyle(config.discount_type === 'percent', 'var(--accent)')}>%</button>
                      <button onClick={() => setConfig(c => ({ ...c, discount_type: 'fixed' }))} style={pillStyle(config.discount_type === 'fixed', 'var(--accent)')}>$</button>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{config.discount_type === 'percent' ? 'Discount %' : 'Discount $'}</label>
                    <input
                      type="number"
                      value={config.discount_value || ''}
                      onChange={e => setConfig(c => ({ ...c, discount_value: Number(e.target.value) }))}
                      style={{ ...inputStyle, borderColor: !gpmSafe ? 'var(--red)' : undefined }}
                      min={0} step={config.discount_type === 'percent' ? 1 : 50}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Min Sections to Qualify</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={config.min_zones}
                        onChange={e => setConfig(c => ({ ...c, min_zones: Number(e.target.value) }))}
                        style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: 24 }}
                      >
                        {Array.from({ length: zones.length }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>
                            {n === zones.length ? `All ${n}` : `Any ${n} of ${zones.length}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Bundle Label (shown to customer)</label>
                  <input
                    value={config.discount_label}
                    onChange={e => setConfig(c => ({ ...c, discount_label: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. Full Project Bundle"
                  />
                </div>
              </div>

              {/* GPM Safety */}
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: gpmSafe ? 'rgba(34,192,122,0.06)' : 'rgba(242,90,90,0.08)',
                border: `1px solid ${gpmSafe ? 'rgba(34,192,122,0.2)' : 'rgba(242,90,90,0.3)'}`,
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {gpmSafe
                    ? <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                    : <AlertTriangle size={14} style={{ color: 'var(--red)' }} />
                  }
                  <span style={{ fontSize: 12, fontWeight: 700, color: gpmSafe ? 'var(--green)' : 'var(--red)' }}>
                    {gpmSafe ? 'Discount is safe' : 'Discount erodes margin below floor'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'List Total', value: fmtC(totalListPrice) },
                    { label: 'Bundle Total', value: fmtC(bundleTotal) },
                    { label: 'Discount', value: fmtC(discountAmount) },
                    { label: 'Bundle GPM', value: bundleGPM.toFixed(1) + '%' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: gpmColor(bundleGPM), fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {!gpmSafe && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)' }}>
                    Safe max: {config.discount_type === 'percent' ? safeMaxDiscount.toFixed(1) + '%' : fmtC(safeMaxDiscount)}
                  </div>
                )}
                {/* GPM bar */}
                <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: Math.min(100, Math.max(0, bundleGPM)) + '%',
                    background: gpmColor(bundleGPM),
                    transition: 'width 0.3s, background 0.3s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 8, color: 'var(--text3)' }}>0%</span>
                  <span style={{ fontSize: 8, color: 'var(--amber)' }}>65% floor</span>
                  <span style={{ fontSize: 8, color: 'var(--green)' }}>73% target</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, background: 'var(--surface)',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(zones, { ...config, total_zones: zones.length })}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: gpmSafe ? 'var(--accent)' : 'var(--surface2)',
              color: gpmSafe ? '#fff' : 'var(--text3)',
              fontSize: 13, fontWeight: 700, cursor: gpmSafe ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            disabled={!gpmSafe}
          >
            <Layers size={14} />
            Create Proposal ({zones.length} sections)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Customer preview ──────────────────────────────────────────────────────────

function ProposalPreview({ zones, config, totalListPrice }: { zones: ZoneProposalItem[]; config: BundleConfig; totalListPrice: number }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(zones.map(z => z.zone_key)))

  const selectedZones = zones.filter(z => selected.has(z.zone_key))
  const subtotal = selectedZones.reduce((s, z) => s + z.sale_price + z.scanning_fee, 0)
  const qualifies = selected.size >= config.min_zones

  const discountAmt = qualifies
    ? config.discount_type === 'percent'
      ? subtotal * (config.discount_value / 100)
      : config.discount_value
    : 0
  const total = subtotal - discountAmt
  const needed = Math.max(0, config.min_zones - selected.size)

  const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12 }}>
        Customer View Preview
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {zones.map(z => {
          const active = selected.has(z.zone_key)
          return (
            <div
              key={z.zone_key}
              onClick={() => setSelected(prev => { const n = new Set(prev); active ? n.delete(z.zone_key) : n.add(z.zone_key); return n })}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--text1)' : 'var(--text2)' }}>{z.zone_label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{z.sqft} sqft</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtC(z.sale_price)}</div>
                {z.scanning_fee > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>+{fmtC(z.scanning_fee)} scan</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bundle progress */}
      {config.discount_value > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: qualifies ? 'rgba(34,192,122,0.08)' : 'rgba(79,127,255,0.06)', border: `1px solid ${qualifies ? 'rgba(34,192,122,0.2)' : 'rgba(79,127,255,0.15)'}`, marginBottom: 12 }}>
          {qualifies ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
              <CheckCircle size={14} />
              {config.discount_label} — {config.discount_type === 'percent' ? config.discount_value + '% off' : fmtC(config.discount_value) + ' back'} applied!
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              Add <strong style={{ color: 'var(--accent)' }}>{needed} more section{needed !== 1 ? 's' : ''}</strong> to unlock the {config.discount_label}
              {config.discount_type === 'percent' ? ` (${config.discount_value}% off)` : ` (${fmtC(config.discount_value)} back)`}
            </div>
          )}
          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: 'var(--surface2)' }}>
            <div style={{ height: '100%', borderRadius: 2, width: Math.min(100, (selected.size / config.min_zones) * 100) + '%', background: qualifies ? 'var(--green)' : 'var(--accent)', transition: 'width 0.3s' }} />
          </div>
          <div style={{ marginTop: 3, fontSize: 9, color: 'var(--text3)' }}>{selected.size} of {config.min_zones} sections</div>
        </div>
      )}

      {/* Total */}
      <div style={{ padding: '14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: qualifies ? 6 : 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{selected.size} section{selected.size !== 1 ? 's' : ''} selected</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtC(subtotal)}</span>
        </div>
        {qualifies && discountAmt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--green)' }}>{config.discount_label} discount</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>-{fmtC(discountAmt)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>TOTAL</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: qualifies && discountAmt > 0 ? 'var(--green)' : 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtC(total)}</span>
        </div>
      </div>
    </div>
  )
}
