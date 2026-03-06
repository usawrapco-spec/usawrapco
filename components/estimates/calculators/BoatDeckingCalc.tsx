'use client'

import { useState, useMemo, useEffect } from 'react'
import { Anchor, Plus, Trash2, Layers, AlertTriangle, Ship } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput,
  calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'
import { calculateDeckingInstallPay } from '@/lib/estimator/vehicleDb'
import {
  BOAT_CATEGORIES, QUICK_ADD_PARTS, BOAT_TYPE_DATABASE,
  findBoatType, getBoatTypesForCategory,
  type BoatCategory, type BoatPartDefinition,
} from '@/lib/estimator/boatDeckingDb'

export interface ZoneProposalItem {
  zone_key: string
  zone_label: string
  sqft: number
  material_cost: number
  installer_pay: number
  scanning_fee: number
  design_fee: number
  cogs: number
  sale_price: number
}

export interface BundleConfig {
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_zones: number
  total_zones: number
  discount_label: string
}

// DEKWAVE only — 29 sqft/pad, $350/pad
const PAD_SQFT        = 29
const PAD_COST        = 350
const LASER_PER_PAD   = 50
const SCAN_DEFAULT    = 350

const DEKWAVE_PRODUCTS = [
  { key: '6mm', label: '6mm Dual Color', padCost: PAD_COST },
  { key: '9mm', label: '9mm Tri Color',  padCost: PAD_COST },
] as const

type DekwaveKey = typeof DEKWAVE_PRODUCTS[number]['key']
type ShapeType  = 'rectangle' | 'triangle' | 'manual'

interface DeckSection {
  id: string; name: string; length: number; width: number
  shape: ShapeType; manualSqft: number
}

// Dimensions are now in INCHES — divide by 144 to get sqft
function sectionSqft(s: DeckSection): number {
  if (s.shape === 'manual')   return s.manualSqft
  const sqIn = s.length * s.width
  if (s.shape === 'triangle') return Math.round(sqIn * 0.5 / 144 * 10) / 10
  return Math.round(sqIn / 144 * 10) / 10
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtN = (n: number, d = 1) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
const newSec = (): DeckSection => ({ id: 's-' + Date.now() + '-' + Math.random(), name: '', length: 0, width: 0, shape: 'rectangle', manualSqft: 0 })

function partToSection(part: BoatPartDefinition): DeckSection {
  return {
    id: 's-' + Date.now() + '-' + Math.random(),
    name: part.label,
    length: part.defaultLengthIn,
    width: part.defaultWidthIn,
    shape: part.defaultShape,
    manualSqft: 0,
  }
}

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
  onCreateProposal?: (zones: ZoneProposalItem[], config: BundleConfig) => void
}

export default function BoatDeckingCalc({ specs, onChange, canWrite, onCreateProposal }: Props) {
  const [product, setProduct]           = useState<DekwaveKey>((specs.dekwaveProduct as DekwaveKey) || '6mm')
  const [sqftMode, setSqftMode]        = useState<'sections' | 'total'>((specs.sqftMode as 'sections' | 'total') || 'sections')
  const [manualTotalSqft, setManualTotalSqft] = useState<number>((specs.manualTotalSqft as number) || 0)
  const [sections, setSections]         = useState<DeckSection[]>(() => {
    const saved = specs.deckSections as DeckSection[] | undefined
    const isInches = specs.dimensionUnit === 'inches'
    if (saved && Array.isArray(saved) && saved.length > 0) {
      // Migrate legacy feet-based values to inches
      if (!isInches) return saved.map(s => ({ ...s, length: s.length * 12, width: s.width * 12 }))
      return saved
    }
    return [newSec()]
  })
  const [laserActive, setLaserActive]   = useState(!!(specs.laserActive as boolean))
  const [laserPadCount, setLaserPadCount] = useState((specs.laserPadCount as number) || 0)
  const [scanCost, setScanCost]         = useState((specs.scanCost as number) ?? SCAN_DEFAULT)
  const [hardwareCost, setHardwareCost] = useState((specs.hardwareCost as number) || 0)
  const [discountPct, setDiscountPct]   = useState((specs.discountPct as number) || 0)
  const [salePrice, setSalePrice]       = useState((specs.unitPriceSaved as number) || 0)
  const [pricingMode, setPricingMode]   = useState<'per_pad' | 'total'>((specs.pricingMode as 'per_pad' | 'total') || 'per_pad')
  const [pricePerPad, setPricePerPad]   = useState((specs.pricePerPad as number) || 0)

  // Install pay — formula or override (matching MarineCalc pattern)
  const [installOverride, setInstallOverride] = useState(() => {
    if (specs.installOverride !== undefined) return !!(specs.installOverride)
    // Legacy: if old labor data exists, default to override
    if (specs.laborRate && (specs.laborRate as number) > 0) return true
    return false
  })
  const [installerPay, setInstallerPay] = useState(() => {
    if (typeof specs.installerPay === 'number') return specs.installerPay as number
    // Legacy migration: compute from old fields
    const mode = specs.laborMode as string
    const rate = (specs.laborRate as number) || 0
    const hrs  = (specs.laborHours as number) || 0
    if (mode === 'hourly') return rate * hrs
    if (mode === 'flat') return rate
    // sqft mode — will be overridden by formula anyway
    return 0
  })

  // Boat type selector
  const [boatCategory, setBoatCategory] = useState<BoatCategory | ''>((specs.boatCategory as BoatCategory) || '')
  const [boatTypeId, setBoatTypeId]     = useState<string>((specs.boatTypeId as string) || '')
  const [confirmReplace, setConfirmReplace] = useState(false)

  const padCost      = DEKWAVE_PRODUCTS.find(p => p.key === product)?.padCost ?? PAD_COST
  const sectionsSqft = useMemo(() => sections.reduce((s, sec) => s + sectionSqft(sec), 0), [sections])
  const totalSqft    = sqftMode === 'total' ? manualTotalSqft : sectionsSqft
  const padCount     = Math.ceil(totalSqft / PAD_SQFT)

  // Clamp laser pad count
  useEffect(() => {
    if (laserPadCount > padCount) setLaserPadCount(padCount)
  }, [laserPadCount, padCount])

  // In per_pad mode, sale price is derived from pricePerPad × padCount
  const effectiveSalePrice = pricingMode === 'per_pad' && pricePerPad > 0
    ? Math.round(padCount * pricePerPad * (1 - discountPct / 100))
    : salePrice
  const materialCost = padCount * padCost
  const laserCost    = laserActive ? laserPadCount * LASER_PER_PAD : 0

  // Auto-calculated install (half of commercial, same as marine)
  const deckingInstall = useMemo(() => calculateDeckingInstallPay(totalSqft), [totalSqft])
  const effectiveInstallPay = installOverride ? installerPay : deckingInstall.pay

  useEffect(() => {
    if (!installOverride && deckingInstall.pay > 0) setInstallerPay(deckingInstall.pay)
  }, [installOverride, deckingInstall.pay])

  const cogs        = materialCost + laserCost + effectiveInstallPay + scanCost + hardwareCost
  const gpm         = calcGPMPct(effectiveSalePrice, cogs)
  const gp          = effectiveSalePrice - cogs
  const ratePerSqft = totalSqft > 0 ? effectiveSalePrice / totalSqft : 0

  function addSection() { if (!canWrite) return; setSections(prev => [...prev, newSec()]) }
  function removeSection(id: string) { if (!canWrite) return; setSections(prev => prev.filter(s => s.id !== id)) }
  function updateSection(id: string, field: keyof DeckSection, value: unknown) {
    if (!canWrite) return
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function quickAddPart(part: BoatPartDefinition) {
    if (!canWrite) return
    setSections(prev => [...prev, partToSection(part)])
  }

  function loadBoatTemplate(typeId: string) {
    const bt = findBoatType(typeId)
    if (!bt || bt.parts.length === 0) return
    const hasData = sections.some(s => sectionSqft(s) > 0)
    if (hasData && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setSections(bt.parts.map(partToSection))
    setBoatTypeId(typeId)
    setConfirmReplace(false)
  }

  const boatTypesForCat = boatCategory ? getBoatTypesForCategory(boatCategory) : []

  useEffect(() => {
    onChange({
      name: 'DEKWAVE ' + product.toUpperCase() + ' Decking \u2014 ' + Math.round(totalSqft) + ' sqft',
      unit_price: effectiveSalePrice,
      specs: {
        dekwaveProduct: product, sqftMode, manualTotalSqft,
        deckSections: sections, laserActive, laserPadCount,
        laserPerPadCost: LASER_PER_PAD, scanCost, hardwareCost, discountPct,
        pricingMode, pricePerPad,
        installOverride, installerPay: effectiveInstallPay,
        installHours: deckingInstall.hours, installTier: deckingInstall.tierLabel,
        dimensionUnit: 'inches', boatCategory, boatTypeId,
        vinylArea: totalSqft, padCount, materialCost, laserCost,
        laborCost: effectiveInstallPay,
        productLineType: 'boat_decking', vehicleType: 'marine', unitPriceSaved: effectiveSalePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, sqftMode, manualTotalSqft, sections, laserActive, laserPadCount, scanCost, hardwareCost, discountPct,
      salePrice, pricePerPad, pricingMode, totalSqft, installOverride, installerPay,
      deckingInstall.pay, boatCategory, boatTypeId])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }
  const secLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 800, color: 'var(--text2)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 5,
  }
  const hr: React.CSSProperties = { height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }
  const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

  return (
    <div style={gadget}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Anchor size={12} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          DEKWAVE Decking Calculator
        </span>
        {padCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 10, ...mono, color: 'var(--cyan)', fontWeight: 700 }}>
            {padCount} pads &middot; {PAD_SQFT} sqft/pad
          </span>
        )}
      </div>

      {/* 1. Material */}
      <div style={{ marginBottom: 8 }}>
        <div style={secLabel}>Material</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {DEKWAVE_PRODUCTS.map(p => (
            <button key={p.key} onClick={() => canWrite && setProduct(p.key)}
              style={pillBtnCompact(product === p.key, 'var(--cyan)')}>
              {p.label} &middot; ${p.padCost}/pad
            </button>
          ))}
          <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 8, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--text3)', ...mono }}>
            {PAD_SQFT} sqft/pad
          </span>
        </div>
      </div>

      <div style={hr} />

      {/* 2. Boat Type Selector */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <Ship size={10} style={{ color: 'var(--accent)' }} />
          <div style={secLabel}>Boat Type</div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <select value={boatCategory} onChange={e => { if (!canWrite) return; setBoatCategory(e.target.value as BoatCategory | ''); setBoatTypeId(''); setConfirmReplace(false) }}
            style={{ ...calcInputCompact, fontSize: 10, padding: '4px 6px', width: 150, appearance: 'none', WebkitAppearance: 'none' }} disabled={!canWrite}>
            <option value="">— Category —</option>
            {BOAT_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {boatCategory && boatTypesForCat.length > 0 && (
            <select value={boatTypeId} onChange={e => { if (!canWrite) return; setBoatTypeId(e.target.value); setConfirmReplace(false) }}
              style={{ ...calcInputCompact, fontSize: 10, padding: '4px 6px', width: 180, appearance: 'none', WebkitAppearance: 'none' }} disabled={!canWrite}>
              <option value="">— Select Size —</option>
              {boatTypesForCat.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
          {boatTypeId && findBoatType(boatTypeId)?.parts.length! > 0 && (
            <button onClick={() => loadBoatTemplate(boatTypeId)} style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '3px 10px',
              borderRadius: 5, fontSize: 9, fontWeight: 800, cursor: 'pointer',
              border: '1px solid rgba(79,127,255,0.4)', background: 'rgba(79,127,255,0.08)',
              color: 'var(--accent)', fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Load Template
            </button>
          )}
        </div>
        {confirmReplace && (
          <div style={{ padding: '5px 8px', marginBottom: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={11} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700 }}>Replace existing sections?</span>
            <button onClick={() => { setConfirmReplace(false); const bt = findBoatType(boatTypeId); if (bt) { setSections(bt.parts.map(partToSection)); } }}
              style={{ ...pillBtnCompact(true, 'var(--amber)'), fontSize: 8, padding: '2px 8px' }}>Yes</button>
            <button onClick={() => setConfirmReplace(false)}
              style={{ ...pillBtnCompact(false), fontSize: 8, padding: '2px 8px' }}>Cancel</button>
          </div>
        )}

        {/* Quick-add part buttons */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {QUICK_ADD_PARTS.map(p => (
            <button key={p.id} onClick={() => quickAddPart(p)} disabled={!canWrite}
              style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                cursor: canWrite ? 'pointer' : 'default',
                border: '1px solid rgba(34,192,122,0.25)', background: 'rgba(34,192,122,0.04)',
                color: 'var(--green)', fontFamily: 'Barlow Condensed, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                opacity: canWrite ? 1 : 0.5,
              }}>
              + {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={hr} />

      {/* 3. Deck Sections */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={secLabel}>Deck Sections</div>
            <div style={{ display: 'flex', gap: 3 }}>
              <button onClick={() => canWrite && setSqftMode('sections')} style={pillBtnCompact(sqftMode === 'sections', 'var(--cyan)')}>By Section</button>
              <button onClick={() => canWrite && setSqftMode('total')} style={pillBtnCompact(sqftMode === 'total', 'var(--accent)')}>Total Sqft</button>
            </div>
          </div>
          {canWrite && sqftMode === 'sections' && (
            <button onClick={addSection} style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px',
              borderRadius: 5, fontSize: 9, fontWeight: 800, cursor: 'pointer',
              border: '1px dashed rgba(34,192,122,0.4)', background: 'rgba(34,192,122,0.05)',
              color: 'var(--green)', fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <Plus size={9} /> Add Section
            </button>
          )}
        </div>

        {sqftMode === 'total' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 6 }}>
            <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              Total Sqft
            </label>
            <input type="number" value={manualTotalSqft || ''} onChange={e => setManualTotalSqft(Number(e.target.value))}
              placeholder="0" style={{ ...calcInputCompact, ...mono, textAlign: 'right', fontSize: 13, padding: '5px 8px', maxWidth: 120 }}
              disabled={!canWrite} min={0} step={1} />
            {padCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text2)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                &rarr; {padCount} pads needed
              </span>
            )}
            <span style={{ marginLeft: 'auto', ...mono, fontSize: 13, fontWeight: 800, color: totalSqft > 0 ? 'var(--cyan)' : 'var(--text3)' }}>
              {fmtN(totalSqft, 1)} sqft
            </span>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 58px 82px 44px 20px', gap: 3, padding: '0 2px', marginBottom: 3 }}>
              {['Section Name', 'Len (in)', 'Wid (in)', 'Shape', 'Sqft', ''].map(h => (
                <div key={h} style={{ fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif' }}>{h}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sections.map(sec => {
                const sqft     = sectionSqft(sec)
                const isManual = sec.shape === 'manual'
                return (
                  <div key={sec.id} style={{ display: 'grid', gridTemplateColumns: '1fr 58px 58px 82px 44px 20px', gap: 3, alignItems: 'center' }}>
                    <input value={sec.name} onChange={e => updateSection(sec.id, 'name', e.target.value)}
                      placeholder="Section name" style={{ ...calcInputCompact, fontSize: 11, padding: '4px 7px' }} disabled={!canWrite} />
                    {isManual ? (
                      <input type="number" value={sec.manualSqft || ''} onChange={e => updateSection(sec.id, 'manualSqft', Number(e.target.value))}
                        style={{ ...calcInputCompact, ...mono, textAlign: 'right', fontSize: 11, padding: '4px 5px', gridColumn: '2 / 4' }}
                        disabled={!canWrite} min={0} step={0.5} placeholder="sqft" />
                    ) : (
                      <>
                        <input type="number" value={sec.length || ''} onChange={e => updateSection(sec.id, 'length', Number(e.target.value))}
                          style={{ ...calcInputCompact, ...mono, textAlign: 'right', fontSize: 11, padding: '4px 5px' }} disabled={!canWrite} min={0} step={1} />
                        <input type="number" value={sec.width || ''} onChange={e => updateSection(sec.id, 'width', Number(e.target.value))}
                          style={{ ...calcInputCompact, ...mono, textAlign: 'right', fontSize: 11, padding: '4px 5px' }} disabled={!canWrite} min={0} step={1} />
                      </>
                    )}
                    <select value={sec.shape} onChange={e => updateSection(sec.id, 'shape', e.target.value as ShapeType)}
                      style={{ ...calcInputCompact, fontSize: 10, padding: '4px 4px', appearance: 'none', WebkitAppearance: 'none' }} disabled={!canWrite}>
                      <option value="rectangle">Rectangle</option>
                      <option value="triangle">Triangle</option>
                      <option value="manual">Manual</option>
                    </select>
                    <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: sqft > 0 ? 'var(--cyan)' : 'var(--text3)', textAlign: 'right' }}>{fmtN(sqft, 1)}</div>
                    {canWrite && sections.length > 1 ? (
                      <button onClick={() => removeSection(sec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                    ) : <div />}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, padding: '4px 8px', background: 'var(--surface)', borderRadius: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Net Sqft
                {padCount > 0 && <span style={{ color: 'var(--text2)', marginLeft: 8 }}>&rarr; {padCount} pads needed</span>}
              </span>
              <span style={{ ...mono, fontSize: 13, fontWeight: 800, color: totalSqft > 0 ? 'var(--cyan)' : 'var(--text3)' }}>
                {fmtN(totalSqft, 1)} sqft
              </span>
            </div>
          </>
        )}
      </div>

      <div style={hr} />

      {/* 4. Add-ons & Overhead */}
      <div style={{ marginBottom: 8 }}>
        <div style={secLabel}>Add-ons & Overhead</div>

        {/* Laser Engraving — $50/pad */}
        <div style={{ marginBottom: 6, padding: '5px 8px', background: 'var(--surface)', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: laserActive ? 6 : 0 }}>
            <button onClick={() => { if (!canWrite) return; setLaserActive(!laserActive); if (!laserActive) setLaserPadCount(padCount) }} style={pillBtnCompact(laserActive, 'var(--purple)')}>
              Laser Engraving (${LASER_PER_PAD}/pad)
            </button>
            {laserActive && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" value={laserPadCount || ''} onChange={e => setLaserPadCount(Math.min(Number(e.target.value), padCount))}
                    style={{ ...calcInputCompact, ...mono, textAlign: 'right', width: 44, fontSize: 11, padding: '3px 5px' }}
                    disabled={!canWrite} min={0} max={padCount} step={1} />
                  <span style={{ fontSize: 9, color: 'var(--text3)' }}>of {padCount} pads</span>
                </div>
                <span style={{ fontSize: 9, color: 'var(--purple)', ...mono, fontWeight: 700 }}>{fmtC(laserCost)}</span>
              </>
            )}
          </div>
          {laserActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 5 }}>
              <AlertTriangle size={10} style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: 'var(--amber)', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Reminder: Confirm brush texture direction with customer before production
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <label style={calcFieldLabelCompact}>Scan & Template ($)</label>
            <input type="number" value={scanCost} onChange={e => setScanCost(Number(e.target.value))}
              style={{ ...calcInputCompact, ...mono, textAlign: 'right' }} disabled={!canWrite} min={0} step={25} />
          </div>
          <div>
            <label style={calcFieldLabelCompact}>Hardware & Supplies ($)</label>
            <input type="number" value={hardwareCost || ''} onChange={e => setHardwareCost(Number(e.target.value))}
              style={{ ...calcInputCompact, ...mono, textAlign: 'right' }} disabled={!canWrite} min={0} step={10} placeholder="0" />
          </div>
        </div>
      </div>

      <div style={hr} />

      {/* 5. Install Pay (auto-calculated, matching marine pattern) */}
      <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--surface)' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Install Pay (&frac12; commercial)
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={() => { if (canWrite) { setInstallOverride(false); setInstallerPay(deckingInstall.pay) } }}
              style={pillBtnCompact(!installOverride, 'var(--cyan)')}>Formula</button>
            <button onClick={() => canWrite && setInstallOverride(true)}
              style={pillBtnCompact(installOverride, 'var(--amber)')}>Override</button>
          </div>
        </div>
        <div style={{ padding: '6px 10px', background: 'var(--bg)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>
            {deckingInstall.hours}h &times; ${deckingInstall.hourlyRate}/hr
          </span>
          <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: installOverride ? 'var(--amber)' : 'var(--cyan)' }}>
            = {fmtC(effectiveInstallPay)}
          </span>
          {installOverride && (
            <input type="number" value={installerPay || ''} onChange={e => setInstallerPay(Number(e.target.value))}
              style={{ ...calcInputCompact, width: 90, ...mono, textAlign: 'right', borderColor: 'var(--amber)' }}
              disabled={!canWrite} />
          )}
        </div>
      </div>

      <div style={hr} />

      {/* 6. Sale Price & Discount */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={secLabel}>Pricing</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => canWrite && setPricingMode('per_pad')} style={pillBtnCompact(pricingMode === 'per_pad', 'var(--cyan)')}>Per Pad</button>
            <button onClick={() => canWrite && setPricingMode('total')} style={pillBtnCompact(pricingMode === 'total', 'var(--accent)')}>Total</button>
          </div>
        </div>
        {pricingMode === 'per_pad' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <label style={calcFieldLabelCompact}>Price per Pad ($/pad)</label>
              <input type="number" value={pricePerPad || ''} onChange={e => setPricePerPad(Number(e.target.value))}
                style={{ ...calcInputCompact, ...mono, textAlign: 'right' }} disabled={!canWrite} min={0} step={25} placeholder="0" />
            </div>
            <div>
              <label style={calcFieldLabelCompact}>Discount %</label>
              <input type="number" value={discountPct || ''} onChange={e => setDiscountPct(Number(e.target.value))}
                style={{ ...calcInputCompact, ...mono, textAlign: 'right', borderColor: discountPct > 0 ? 'var(--amber)' : undefined }}
                disabled={!canWrite} min={0} max={50} step={1} placeholder="0" />
            </div>
            {pricePerPad > 0 && padCount > 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '5px 8px', background: 'rgba(34,211,238,0.06)', borderRadius: 6, border: '1px solid rgba(34,211,238,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {padCount} pads &times; {fmtC(pricePerPad)}/pad{discountPct > 0 ? ` − ${discountPct}%` : ''}
                </span>
                <span style={{ ...mono, fontSize: 13, fontWeight: 800, color: 'var(--cyan)' }}>{fmtC(effectiveSalePrice)}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <label style={calcFieldLabelCompact}>Sale Price</label>
              <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
                style={{ ...calcInputCompact, ...mono, textAlign: 'right' }} disabled={!canWrite} />
            </div>
            <div>
              <label style={calcFieldLabelCompact}>Discount %</label>
              <input type="number" value={discountPct || ''} onChange={e => setDiscountPct(Number(e.target.value))}
                style={{ ...calcInputCompact, ...mono, textAlign: 'right', borderColor: discountPct > 0 ? 'var(--amber)' : undefined }}
                disabled={!canWrite} min={0} max={50} step={1} placeholder="0" />
            </div>
          </div>
        )}
      </div>

      {/* Quote Breakdown Table */}
      {totalSqft > 0 && salePrice > 0 && (
        <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '4px 10px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
              Quote Breakdown
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Section', 'Sqft', 'Rate', 'Total'].map(h => (
                  <th key={h} style={{ padding: '3px 8px', textAlign: h === 'Section' ? 'left' : 'right', fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.filter(s => sectionSqft(s) > 0).map((sec, i) => {
                const sqft  = sectionSqft(sec)
                const total = sqft * ratePerSqft
                return (
                  <tr key={sec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                    <td style={{ padding: '3px 8px', color: 'var(--text1)', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif' }}>{sec.name || 'Section ' + (i + 1)}</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', ...mono, fontSize: 10, color: 'var(--text2)' }}>{fmtN(sqft, 1)}</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', ...mono, fontSize: 10, color: 'var(--text3)' }}>${fmtN(ratePerSqft, 2)}/sqft</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', ...mono, fontSize: 10, fontWeight: 700, color: 'var(--text1)' }}>{fmtC(total)}</td>
                  </tr>
                )
              })}
              <tr style={{ background: 'rgba(79,127,255,0.06)', borderTop: '1px solid rgba(79,127,255,0.2)' }}>
                <td style={{ padding: '4px 8px', fontSize: 9, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text2)', textTransform: 'uppercase' }}>TOTAL</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', ...mono, fontSize: 10, fontWeight: 700, color: 'var(--cyan)' }}>{fmtN(totalSqft, 1)} sqft</td>
                <td />
                <td style={{ padding: '4px 8px', textAlign: 'right', ...mono, fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>{fmtC(effectiveSalePrice)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ padding: '5px 10px', background: 'rgba(34,211,238,0.04)', borderTop: '1px solid rgba(34,211,238,0.12)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Material Order</span>
            <span style={{ fontSize: 9, color: 'var(--text2)', ...mono }}>{Math.round(totalSqft)} sqft net</span>
            <span style={{ fontSize: 9, color: 'var(--cyan)', ...mono, fontWeight: 700 }}>{padCount} pad{padCount !== 1 ? 's' : ''} &times; {PAD_SQFT} sqft = {fmtC(materialCost)}</span>
            {laserActive && <span style={{ fontSize: 9, color: 'var(--purple)', ...mono }}>+ laser {fmtC(laserCost)} ({laserPadCount} pads)</span>}
          </div>
        </div>
      )}

      <OutputBar
        items={[
          { label: 'Mat (' + padCount + ' pads)', value: fmtC(materialCost) },
          { label: 'Install',                      value: `${fmtC(effectiveInstallPay)} (${deckingInstall.hours}h)`, color: 'var(--cyan)' },
          { label: 'COGS',                         value: fmtC(cogs),        color: 'var(--red)'  },
        ]}
        gpm={gpm}
        gp={gp}
        cogs={cogs}
        currentPrice={effectiveSalePrice}
        onSetPrice={p => {
          if (!canWrite) return
          if (pricingMode === 'per_pad' && padCount > 0) {
            setPricePerPad(Math.round(p / padCount))
          } else {
            setSalePrice(discountPct > 0 ? Math.round(p * (1 - discountPct / 100)) : p)
          }
        }}
        canWrite={canWrite}
      />

      {/* Create Section Proposal button */}
      {onCreateProposal && canWrite && effectiveSalePrice > 0 && sections.filter(s => sectionSqft(s) > 0).length >= 2 && (
        <button
          onClick={() => {
            const activeSections = sections.filter(s => sectionSqft(s) > 0)
            const zones: ZoneProposalItem[] = activeSections.map((sec, i) => {
              const sqft = sectionSqft(sec)
              const frac = totalSqft > 0 ? sqft / totalSqft : 1 / activeSections.length
              const secCogs = cogs * frac
              return {
                zone_key: sec.id,
                zone_label: sec.name || 'Section ' + (i + 1),
                sqft,
                material_cost: Math.round(materialCost * frac),
                installer_pay: Math.round(effectiveInstallPay * frac),
                scanning_fee: 0,
                design_fee: 0,
                cogs: Math.round(secCogs),
                sale_price: Math.round(effectiveSalePrice * frac),
              }
            })
            const config: BundleConfig = {
              discount_type: 'percent',
              discount_value: 5,
              min_zones: activeSections.length,
              total_zones: activeSections.length,
              discount_label: 'Full Project Bundle',
            }
            onCreateProposal(zones, config)
          }}
          style={{
            marginTop: 8,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(79,127,255,0.4)',
            background: 'rgba(79,127,255,0.08)',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <Layers size={13} />
          Create Section Proposal
        </button>
      )}

    </div>
  )
}
