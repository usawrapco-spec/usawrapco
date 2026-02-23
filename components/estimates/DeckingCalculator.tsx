'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Ship, Plus, Trash2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'

// ─── Fonts ──────────────────────────────────────────────────────────────────────
const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface DeckingCalculatorProps {
  specs: Record<string, unknown>
  updateSpec: (key: string, value: unknown) => void
  onPriceUpdate: (totalPrice: number, materialCost: number, laborCost: number, totalSqft: number) => void
  canWrite: boolean
}

interface DeckingZone {
  id: string
  name: string
  enabled: boolean
  irregular: boolean
  length: number
  width: number
  manualSqft: number
  count: number      // for rod holder pads, hatch covers, etc
  customName: string // for custom zone
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const HULL_TYPES = [
  'Center Console', 'Pontoon', 'Bowrider', 'Cuddy Cabin',
  'Deck Boat', 'Jon Boat', 'Custom',
]

const DEFAULT_ZONES: Omit<DeckingZone, 'id'>[] = [
  { name: 'Cockpit Floor', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 1, customName: '' },
  { name: 'Bow Deck', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 1, customName: '' },
  { name: 'Helm Station Pad', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 1, customName: '' },
  { name: 'Swim Platform', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 1, customName: '' },
  { name: 'Gunnel Pads', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 2, customName: '' },
  { name: 'Ladder Pad', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 1, customName: '' },
  { name: 'Rod Holder Pads', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 4, customName: '' },
  { name: 'Hatch Covers', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 2, customName: '' },
  { name: 'Custom Zone', enabled: false, irregular: false, length: 0, width: 0, manualSqft: 0, count: 1, customName: '' },
]

const MATERIALS = [
  { label: 'SeaDek 6mm Standard', costPerSqft: 8.50 },
  { label: 'SeaDek 10mm Premium', costPerSqft: 11.00 },
  { label: 'Hydro-Turf', costPerSqft: 7.50 },
  { label: 'MarineMat', costPerSqft: 9.00 },
  { label: 'Custom/Generic Non-Slip', costPerSqft: 6.00 },
]

const COLORS = ['Slate Gray', 'Charcoal', 'Black', 'Navy', 'Tan', 'Custom']
const PATTERNS = ['Smooth', 'Diamond', 'Brushed', 'Carbon Fiber', 'Custom']

const DEFAULT_CUTTING_RATE = 3.50
const DEFAULT_LABOR_RATE = 45
const SQFT_PER_HOUR = 15

// ─── Styles ─────────────────────────────────────────────────────────────────────

const sectionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px',
  background: 'var(--surface2)', borderRadius: 8, marginBottom: 8, userSelect: 'none',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase',
  letterSpacing: '0.08em', fontFamily: headingFont, flex: 1,
}

const label: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont,
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border, #2a2d3a)',
  borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text1)', outline: 'none',
}

const sel: React.CSSProperties = {
  ...inp,
  appearance: 'none' as const, WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299b5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28,
}

const mono: React.CSSProperties = { fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtNumber(n: number, d = 1): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
}

function zoneSqft(z: DeckingZone): number {
  if (!z.enabled) return 0
  if (z.irregular) return z.manualSqft * z.count
  return z.length * z.width * z.count
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function DeckingCalculator({ specs, updateSpec, onPriceUpdate, canWrite }: DeckingCalculatorProps) {
  // ─── Section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    boatInfo: true, zones: true, material: true, colorStyle: false, pricing: true,
  })
  const toggleSection = (s: string) => setOpenSections(p => ({ ...p, [s]: !p[s] }))

  // ─── Boat info
  const boatYear = (specs.boatYear as string) || ''
  const boatMake = (specs.boatMake as string) || ''
  const boatModel = (specs.boatModel as string) || ''
  const boatLength = (specs.boatLength as number) || 0
  const beamWidth = (specs.beamWidth as number) || 0
  const hullType = (specs.hullType as string) || ''
  const hin = (specs.hin as string) || ''

  // ─── Zones (stored as JSON in specs.deckingZones)
  const [zones, setZones] = useState<DeckingZone[]>(() => {
    const saved = specs.deckingZones as DeckingZone[] | undefined
    if (saved && Array.isArray(saved) && saved.length > 0) return saved
    return DEFAULT_ZONES.map((z, i) => ({ ...z, id: `zone-${i}` }))
  })

  // ─── Material
  const materialChoice = (specs.deckingMaterial as string) || MATERIALS[0].label
  const materialCostPerSqft = (specs.deckingMaterialCostPerSqft as number) ??
    (MATERIALS.find(m => m.label === materialChoice)?.costPerSqft ?? MATERIALS[0].costPerSqft)

  // ─── Color & Pattern
  const deckingColor = (specs.deckingColor as string) || ''
  const deckingPattern = (specs.deckingPattern as string) || ''

  // ─── Pricing overrides
  const cuttingRate = (specs.deckingCuttingRate as number) ?? DEFAULT_CUTTING_RATE
  const laborRate = (specs.deckingLaborRate as number) ?? DEFAULT_LABOR_RATE
  const templateFee = (specs.deckingTemplateFee as number) ?? 0

  // ─── Computed values
  const totalSqft = zones.reduce((sum, z) => sum + zoneSqft(z), 0)
  const materialCost = totalSqft * materialCostPerSqft
  const cuttingCost = totalSqft * cuttingRate
  const laborHours = totalSqft > 0 ? Math.max(1, totalSqft / SQFT_PER_HOUR) : 0
  const laborCost = laborHours * laborRate
  const cogs = materialCost + cuttingCost + laborCost + templateFee
  const salePrice = (specs.deckingSalePrice as number) ?? (cogs > 0 ? Math.ceil(cogs * 1.45 / 5) * 5 : 0)
  const gp = salePrice - cogs
  const gpm = salePrice > 0 ? (gp / salePrice) * 100 : 0

  // Ref to prevent infinite loop in effect
  const prevPriceRef = useRef<string>('')

  // ─── Sync zones to specs
  const syncZones = useCallback((newZones: DeckingZone[]) => {
    setZones(newZones)
    updateSpec('deckingZones', newZones)
  }, [updateSpec])

  // ─── Fire onPriceUpdate when pricing changes
  useEffect(() => {
    const key = `${salePrice}-${materialCost}-${laborCost}-${totalSqft}`
    if (key !== prevPriceRef.current) {
      prevPriceRef.current = key
      onPriceUpdate(salePrice, materialCost, laborCost, totalSqft)
    }
  }, [salePrice, materialCost, laborCost, totalSqft, onPriceUpdate])

  // ─── Zone helpers
  function toggleZone(id: string) {
    if (!canWrite) return
    syncZones(zones.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z))
  }

  function updateZone(id: string, field: keyof DeckingZone, value: unknown) {
    if (!canWrite) return
    syncZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z))
  }

  function addCustomZone() {
    if (!canWrite) return
    const newZone: DeckingZone = {
      id: `zone-${Date.now()}`, name: 'Custom Zone', enabled: true, irregular: false,
      length: 0, width: 0, manualSqft: 0, count: 1, customName: '',
    }
    syncZones([...zones, newZone])
  }

  function removeZone(id: string) {
    if (!canWrite) return
    syncZones(zones.filter(z => z.id !== id))
  }

  // ─── Material selection handler
  function handleMaterialChange(label: string) {
    if (!canWrite) return
    const mat = MATERIALS.find(m => m.label === label)
    updateSpec('deckingMaterial', label)
    updateSpec('deckingMaterialCostPerSqft', mat?.costPerSqft ?? materialCostPerSqft)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const disabledProps = !canWrite ? { disabled: true, style: { ...inp, opacity: 0.6, cursor: 'not-allowed' } } : {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── BOAT INFO ──────────────────────────────────────────────────────── */}
      <div>
        <div style={sectionHeader} onClick={() => toggleSection('boatInfo')}>
          {openSections.boatInfo ? <ChevronDown size={13} style={{ color: 'var(--accent)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text3)' }} />}
          <Ship size={13} style={{ color: 'var(--cyan)' }} />
          <span style={sectionTitle}>Boat Info</span>
        </div>
        {openSections.boatInfo && (
          <div style={{ padding: '0 4px' }}>
            {/* Row 1: Year, Make, Model */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <span style={label}>Year</span>
                <input value={boatYear} onChange={e => updateSpec('boatYear', e.target.value)}
                  placeholder="2024" style={inp} maxLength={4} {...(canWrite ? {} : { disabled: true })} />
              </div>
              <div>
                <span style={label}>Make</span>
                <input value={boatMake} onChange={e => updateSpec('boatMake', e.target.value)}
                  placeholder="Boston Whaler" style={inp} {...(canWrite ? {} : { disabled: true })} />
              </div>
              <div>
                <span style={label}>Model</span>
                <input value={boatModel} onChange={e => updateSpec('boatModel', e.target.value)}
                  placeholder="Montauk 210" style={inp} {...(canWrite ? {} : { disabled: true })} />
              </div>
            </div>

            {/* Row 2: Length, Beam Width, Hull Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <span style={label}>Length (ft)</span>
                <input type="number" value={boatLength || ''} onChange={e => updateSpec('boatLength', Number(e.target.value))}
                  style={{ ...inp, ...mono }} min={0} step={0.5} {...(canWrite ? {} : { disabled: true })} />
              </div>
              <div>
                <span style={label}>Beam Width (ft)</span>
                <input type="number" value={beamWidth || ''} onChange={e => updateSpec('beamWidth', Number(e.target.value))}
                  style={{ ...inp, ...mono }} min={0} step={0.5} {...(canWrite ? {} : { disabled: true })} />
              </div>
              <div>
                <span style={label}>Hull Type</span>
                <select value={hullType} onChange={e => updateSpec('hullType', e.target.value)}
                  style={sel} {...(canWrite ? {} : { disabled: true })}>
                  <option value="">Select hull type...</option>
                  {HULL_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: HIN */}
            <div style={{ marginBottom: 4 }}>
              <span style={label}>HIN (Hull Identification Number)</span>
              <input value={hin} onChange={e => updateSpec('hin', e.target.value.toUpperCase())}
                placeholder="ABC12345D607" style={{ ...inp, ...mono, letterSpacing: '0.12em', textTransform: 'uppercase' }}
                maxLength={12} {...(canWrite ? {} : { disabled: true })} />
              <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, display: 'block' }}>
                12 characters - like VIN for boats
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── ZONE SELECTOR ──────────────────────────────────────────────────── */}
      <div>
        <div style={sectionHeader} onClick={() => toggleSection('zones')}>
          {openSections.zones ? <ChevronDown size={13} style={{ color: 'var(--accent)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text3)' }} />}
          <span style={sectionTitle}>Zone Selector</span>
          <span style={{ ...mono, fontSize: 13, fontWeight: 800, color: totalSqft > 0 ? 'var(--green)' : 'var(--text3)' }}>
            {fmtNumber(totalSqft, 1)} sqft
          </span>
        </div>
        {openSections.zones && (
          <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zones.map(zone => (
              <div key={zone.id} style={{
                background: zone.enabled ? 'var(--surface)' : 'transparent',
                border: `1px solid ${zone.enabled ? 'var(--border, #2a2d3a)' : 'rgba(42,45,58,0.4)'}`,
                borderRadius: 8, overflow: 'hidden', transition: 'all 0.15s',
              }}>
                {/* Zone toggle row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  cursor: canWrite ? 'pointer' : 'default',
                }} onClick={() => toggleZone(zone.id)}>
                  {zone.enabled
                    ? <ToggleRight size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    : <ToggleLeft size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  }
                  {zone.name === 'Custom Zone' && zone.enabled ? (
                    <input
                      value={zone.customName}
                      onChange={e => { e.stopPropagation(); updateZone(zone.id, 'customName', e.target.value) }}
                      onClick={e => e.stopPropagation()}
                      placeholder="Custom zone name"
                      style={{ ...inp, fontSize: 12, padding: '4px 8px', flex: 1 }}
                    />
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: zone.enabled ? 'var(--text1)' : 'var(--text3)', flex: 1, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {zone.name}
                    </span>
                  )}
                  {zone.enabled && (
                    <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>
                      {fmtNumber(zoneSqft(zone), 1)} sqft
                    </span>
                  )}
                  {/* Allow removing extra custom zones */}
                  {zone.name === 'Custom Zone' && zones.filter(z => z.name === 'Custom Zone').length > 1 && canWrite && (
                    <button onClick={e => { e.stopPropagation(); removeZone(zone.id) }} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2,
                      display: 'flex', alignItems: 'center',
                    }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Zone dimensions (visible when enabled) */}
                {zone.enabled && (
                  <div style={{ padding: '6px 12px 10px', borderTop: '1px solid rgba(42,45,58,0.5)' }}>
                    {/* Irregular toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <button onClick={() => updateZone(zone.id, 'irregular', !zone.irregular)} style={{
                        padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        cursor: canWrite ? 'pointer' : 'default', fontFamily: headingFont,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: zone.irregular ? 'rgba(245,158,11,0.15)' : 'rgba(79,127,255,0.1)',
                        border: `1px solid ${zone.irregular ? 'rgba(245,158,11,0.3)' : 'rgba(79,127,255,0.2)'}`,
                        color: zone.irregular ? 'var(--amber)' : 'var(--accent)',
                      }} disabled={!canWrite}>
                        {zone.irregular ? 'Irregular (Manual Sqft)' : 'Standard (L x W)'}
                      </button>
                    </div>

                    {zone.irregular ? (
                      /* Manual sqft input */
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'end' }}>
                        {(zone.name === 'Rod Holder Pads' || zone.name === 'Hatch Covers' || zone.name === 'Gunnel Pads') && (
                          <div>
                            <span style={label}>Count</span>
                            <input type="number" value={zone.count || ''} onChange={e => updateZone(zone.id, 'count', Math.max(1, Number(e.target.value)))}
                              style={{ ...inp, ...mono, textAlign: 'center' }} min={1} disabled={!canWrite} />
                          </div>
                        )}
                        <div style={{ gridColumn: (zone.name === 'Rod Holder Pads' || zone.name === 'Hatch Covers' || zone.name === 'Gunnel Pads') ? undefined : '1 / -1' }}>
                          <span style={label}>Sqft {zone.count > 1 ? '(each)' : ''}</span>
                          <input type="number" value={zone.manualSqft || ''} onChange={e => updateZone(zone.id, 'manualSqft', Number(e.target.value))}
                            style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={0.5} disabled={!canWrite} />
                        </div>
                      </div>
                    ) : (
                      /* Standard L x W */
                      <div style={{ display: 'grid', gridTemplateColumns: (zone.name === 'Rod Holder Pads' || zone.name === 'Hatch Covers' || zone.name === 'Gunnel Pads') ? '60px 1fr 1fr' : '1fr 1fr', gap: 8, alignItems: 'end' }}>
                        {(zone.name === 'Rod Holder Pads' || zone.name === 'Hatch Covers' || zone.name === 'Gunnel Pads') && (
                          <div>
                            <span style={label}>Count</span>
                            <input type="number" value={zone.count || ''} onChange={e => updateZone(zone.id, 'count', Math.max(1, Number(e.target.value)))}
                              style={{ ...inp, ...mono, textAlign: 'center' }} min={1} disabled={!canWrite} />
                          </div>
                        )}
                        <div>
                          <span style={label}>Length (ft)</span>
                          <input type="number" value={zone.length || ''} onChange={e => updateZone(zone.id, 'length', Number(e.target.value))}
                            style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={0.25} disabled={!canWrite} />
                        </div>
                        <div>
                          <span style={label}>Width (ft)</span>
                          <input type="number" value={zone.width || ''} onChange={e => updateZone(zone.id, 'width', Number(e.target.value))}
                            style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={0.25} disabled={!canWrite} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Custom Zone button */}
            {canWrite && (
              <button onClick={addCustomZone} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: '1px dashed rgba(34,192,122,0.3)',
                background: 'rgba(34,192,122,0.05)', color: 'var(--green)',
                fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <Plus size={12} /> Add Custom Zone
              </button>
            )}

            {/* Running total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: 'var(--bg)', borderRadius: 8,
              border: '1px solid var(--border, #2a2d3a)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Coverage
              </span>
              <span style={{ ...mono, fontSize: 20, fontWeight: 800, color: totalSqft > 0 ? 'var(--green)' : 'var(--text3)' }}>
                {fmtNumber(totalSqft, 1)} sqft
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── MATERIAL SELECTOR ──────────────────────────────────────────────── */}
      <div>
        <div style={sectionHeader} onClick={() => toggleSection('material')}>
          {openSections.material ? <ChevronDown size={13} style={{ color: 'var(--accent)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text3)' }} />}
          <span style={sectionTitle}>Material</span>
          <span style={{ ...mono, fontSize: 11, color: 'var(--text2)' }}>
            {fmtCurrency(materialCostPerSqft)}/sqft
          </span>
        </div>
        {openSections.material && (
          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginBottom: 8 }}>
              <div>
                <span style={label}>Material Type</span>
                <select value={materialChoice} onChange={e => handleMaterialChange(e.target.value)}
                  style={sel} disabled={!canWrite}>
                  {MATERIALS.map(m => (
                    <option key={m.label} value={m.label}>{m.label} - {fmtCurrency(m.costPerSqft)}/sqft</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={label}>$/sqft Override</span>
                <input type="number" value={materialCostPerSqft}
                  onChange={e => updateSpec('deckingMaterialCostPerSqft', Number(e.target.value))}
                  style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={0.25} disabled={!canWrite} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── COLOR & STYLE ──────────────────────────────────────────────────── */}
      <div>
        <div style={sectionHeader} onClick={() => toggleSection('colorStyle')}>
          {openSections.colorStyle ? <ChevronDown size={13} style={{ color: 'var(--accent)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text3)' }} />}
          <span style={sectionTitle}>Color & Style</span>
          {deckingColor && (
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              {deckingColor}{deckingPattern ? ` / ${deckingPattern}` : ''}
            </span>
          )}
        </div>
        {openSections.colorStyle && (
          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <span style={label}>Color</span>
                <select value={deckingColor} onChange={e => updateSpec('deckingColor', e.target.value)}
                  style={sel} disabled={!canWrite}>
                  <option value="">Select color...</option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <span style={label}>Pattern</span>
                <select value={deckingPattern} onChange={e => updateSpec('deckingPattern', e.target.value)}
                  style={sel} disabled={!canWrite}>
                  <option value="">Select pattern...</option>
                  {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── PRICING ENGINE ─────────────────────────────────────────────────── */}
      <div>
        <div style={sectionHeader} onClick={() => toggleSection('pricing')}>
          {openSections.pricing ? <ChevronDown size={13} style={{ color: 'var(--accent)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text3)' }} />}
          <span style={sectionTitle}>Pricing</span>
          {salePrice > 0 && (
            <span style={{ ...mono, fontSize: 13, fontWeight: 800, color: gpm >= 50 ? 'var(--green)' : gpm >= 30 ? 'var(--amber)' : 'var(--red)' }}>
              {fmtNumber(gpm, 1)}% GPM
            </span>
          )}
        </div>
        {openSections.pricing && (
          <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Editable rates row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <span style={label}>Cutting $/sqft</span>
                <input type="number" value={cuttingRate}
                  onChange={e => updateSpec('deckingCuttingRate', Number(e.target.value))}
                  style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={0.25} disabled={!canWrite} />
              </div>
              <div>
                <span style={label}>Labor $/hr</span>
                <input type="number" value={laborRate}
                  onChange={e => updateSpec('deckingLaborRate', Number(e.target.value))}
                  style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={1} disabled={!canWrite} />
              </div>
              <div>
                <span style={label}>Template Fee</span>
                <input type="number" value={templateFee}
                  onChange={e => updateSpec('deckingTemplateFee', Number(e.target.value))}
                  style={{ ...inp, ...mono, textAlign: 'center' }} min={0} step={5} disabled={!canWrite} />
              </div>
            </div>

            {/* Sale Price override */}
            <div>
              <span style={label}>Sale Price (override)</span>
              <input type="number" value={salePrice}
                onChange={e => updateSpec('deckingSalePrice', Number(e.target.value))}
                style={{ ...inp, ...mono, fontSize: 16, fontWeight: 800, textAlign: 'center' }} min={0} step={25} disabled={!canWrite} />
            </div>

            {/* Breakdown */}
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border, #2a2d3a)', borderRadius: 10, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <PricingRow label="Material" sublabel={`${fmtNumber(totalSqft, 1)} sqft x ${fmtCurrency(materialCostPerSqft)}`} value={materialCost} color="var(--text1)" />
              <PricingRow label="Cutting/Fabrication" sublabel={`${fmtNumber(totalSqft, 1)} sqft x ${fmtCurrency(cuttingRate)}`} value={cuttingCost} color="var(--text1)" />
              <PricingRow label="Installation Labor" sublabel={`${fmtNumber(laborHours, 1)} hrs x ${fmtCurrency(laborRate)}`} value={laborCost} color="var(--text1)" />
              {templateFee > 0 && (
                <PricingRow label="Template Fee" value={templateFee} color="var(--text1)" />
              )}

              <div style={{ borderTop: '1px solid var(--border, #2a2d3a)', margin: '4px 0' }} />

              <PricingRow label="COGS" value={cogs} color="var(--text2)" bold />
              <PricingRow label="Sale Price" value={salePrice} color="var(--text1)" bold large />

              <div style={{ borderTop: '2px solid var(--border, #2a2d3a)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Gross Profit
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...mono, fontSize: 16, fontWeight: 800, color: gp >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtCurrency(gp)}
                  </span>
                  <span style={{
                    ...mono, fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                    background: gpm >= 50 ? 'rgba(34,192,122,0.15)' : gpm >= 30 ? 'rgba(245,158,11,0.15)' : 'rgba(242,90,90,0.15)',
                    color: gpm >= 50 ? 'var(--green)' : gpm >= 30 ? 'var(--amber)' : 'var(--red)',
                  }}>
                    {fmtNumber(gpm, 1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function PricingRow({ label: rowLabel, sublabel, value, color, bold, large }: {
  label: string; sublabel?: string; value: number; color: string; bold?: boolean; large?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <span style={{ fontSize: large ? 13 : 12, fontWeight: bold ? 800 : 500, color, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {rowLabel}
        </span>
        {sublabel && (
          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
            {sublabel}
          </span>
        )}
      </div>
      <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: large ? 15 : 13, fontWeight: bold ? 800 : 600, color }}>
        {fmtCurrency(value)}
      </span>
    </div>
  )
}
