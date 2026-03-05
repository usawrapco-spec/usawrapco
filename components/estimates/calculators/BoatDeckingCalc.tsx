'use client'

import { useState, useMemo, useEffect } from 'react'
import { Anchor, Plus, Trash2, Layers } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput,
  calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'

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
const PAD_SQFT     = 29
const PAD_COST     = 350
const LASER_COST   = 350
const SCAN_DEFAULT = 350

const DEKWAVE_PRODUCTS = [
  { key: '6mm', label: '6mm Dual Color', padCost: PAD_COST },
  { key: '9mm', label: '9mm Tri Color',  padCost: PAD_COST },
] as const

type DekwaveKey = typeof DEKWAVE_PRODUCTS[number]['key']
type ShapeType  = 'rectangle' | 'triangle' | 'manual'
type LaborMode  = 'sqft' | 'flat' | 'hourly'

interface DeckSection {
  id: string; name: string; length: number; width: number
  shape: ShapeType; manualSqft: number
}

function sectionSqft(s: DeckSection): number {
  if (s.shape === 'manual')   return s.manualSqft
  if (s.shape === 'triangle') return Math.round(s.length * s.width * 0.5 * 10) / 10
  return Math.round(s.length * s.width * 10) / 10
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtN = (n: number, d = 1) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
const newSec = (): DeckSection => ({ id: 's-' + Date.now() + '-' + Math.random(), name: '', length: 0, width: 0, shape: 'rectangle', manualSqft: 0 })

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
  onCreateProposal?: (zones: ZoneProposalItem[], config: BundleConfig) => void
}

export default function BoatDeckingCalc({ specs, onChange, canWrite, onCreateProposal }: Props) {
  const [product, setProduct]           = useState<DekwaveKey>((specs.dekwaveProduct as DekwaveKey) || '6mm')
  const [sections, setSections]         = useState<DeckSection[]>(() => {
    const saved = specs.deckSections as DeckSection[] | undefined
    if (saved && Array.isArray(saved) && saved.length > 0) return saved
    return [newSec()]
  })
  const [laserActive, setLaserActive]   = useState(!!(specs.laserActive as boolean))
  const [scanCost, setScanCost]         = useState((specs.scanCost as number) ?? SCAN_DEFAULT)
  const [hardwareCost, setHardwareCost] = useState((specs.hardwareCost as number) || 0)
  const [laborMode, setLaborMode]       = useState<LaborMode>((specs.laborMode as LaborMode) || 'sqft')
  const [laborRate, setLaborRate]       = useState((specs.laborRate as number) || 0)
  const [laborHours, setLaborHours]     = useState((specs.laborHours as number) || 0)
  const [discountPct, setDiscountPct]   = useState((specs.discountPct as number) || 0)
  const [salePrice, setSalePrice]       = useState((specs.unitPriceSaved as number) || 0)
  const [pricingMode, setPricingMode]   = useState<'per_pad' | 'total'>((specs.pricingMode as 'per_pad' | 'total') || 'per_pad')
  const [pricePerPad, setPricePerPad]   = useState((specs.pricePerPad as number) || 0)

  const padCost      = DEKWAVE_PRODUCTS.find(p => p.key === product)?.padCost ?? PAD_COST
  const totalSqft    = useMemo(() => sections.reduce((s, sec) => s + sectionSqft(sec), 0), [sections])
  const padCount     = Math.ceil(totalSqft / PAD_SQFT)

  // In per_pad mode, sale price is derived from pricePerPad × padCount
  const effectiveSalePrice = pricingMode === 'per_pad' && pricePerPad > 0
    ? Math.round(padCount * pricePerPad * (1 - discountPct / 100))
    : salePrice
  const materialCost = padCount * padCost
  const laserCost    = laserActive ? LASER_COST : 0
  const laborCost    = useMemo(() => {
    if (laborMode === 'sqft')   return totalSqft * laborRate
    if (laborMode === 'hourly') return laborRate * laborHours
    return laborRate
  }, [laborMode, laborRate, laborHours, totalSqft])
  const cogs        = materialCost + laserCost + laborCost + scanCost + hardwareCost
  const gpm         = calcGPMPct(effectiveSalePrice, cogs)
  const gp          = effectiveSalePrice - cogs
  const ratePerSqft = totalSqft > 0 ? effectiveSalePrice / totalSqft : 0

  function addSection() { if (!canWrite) return; setSections(prev => [...prev, newSec()]) }
  function removeSection(id: string) { if (!canWrite) return; setSections(prev => prev.filter(s => s.id !== id)) }
  function updateSection(id: string, field: keyof DeckSection, value: unknown) {
    if (!canWrite) return
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  useEffect(() => {
    onChange({
      name: 'DEKWAVE ' + product.toUpperCase() + ' Decking \u2014 ' + Math.round(totalSqft) + ' sqft',
      unit_price: effectiveSalePrice,
      specs: {
        dekwaveProduct: product, deckSections: sections, laserActive, scanCost,
        hardwareCost, laborMode, laborRate, laborHours, discountPct,
        pricingMode, pricePerPad,
        vinylArea: totalSqft, padCount, materialCost, laserCost, laborCost,
        productLineType: 'boat_decking', vehicleType: 'marine', unitPriceSaved: effectiveSalePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, sections, laserActive, scanCost, hardwareCost, laborMode, laborRate, laborHours, discountPct, salePrice, pricePerPad, pricingMode, totalSqft])

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

      {/* 2. Deck Sections */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={secLabel}>Deck Sections</div>
          {canWrite && (
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 58px 82px 44px 20px', gap: 3, padding: '0 2px', marginBottom: 3 }}>
          {['Section Name', 'Len ft', 'Wid ft', 'Shape', 'Sqft', ''].map(h => (
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
                      style={{ ...calcInputCompact, ...mono, textAlign: 'right', fontSize: 11, padding: '4px 5px' }} disabled={!canWrite} min={0} step={0.5} />
                    <input type="number" value={sec.width || ''} onChange={e => updateSection(sec.id, 'width', Number(e.target.value))}
                      style={{ ...calcInputCompact, ...mono, textAlign: 'right', fontSize: 11, padding: '4px 5px' }} disabled={!canWrite} min={0} step={0.5} />
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
      </div>

      <div style={hr} />

      {/* 3. Add-ons & Overhead */}
      <div style={{ marginBottom: 8 }}>
        <div style={secLabel}>Add-ons & Overhead</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '5px 8px', background: 'var(--surface)', borderRadius: 6 }}>
          <button onClick={() => canWrite && setLaserActive(!laserActive)} style={pillBtnCompact(laserActive, 'var(--purple)')}>
            Laser Engraving (+${LASER_COST})
          </button>
          {laserActive && <span style={{ fontSize: 9, color: 'var(--purple)', ...mono, fontWeight: 700 }}>{fmtC(laserCost)}</span>}
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

      {/* 4. Installation Labor */}
      <div style={{ marginBottom: 8 }}>
        <div style={secLabel}>Installation Labor</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {(['sqft', 'flat', 'hourly'] as const).map(key => (
            <button key={key} onClick={() => canWrite && setLaborMode(key)} style={pillBtnCompact(laborMode === key, 'var(--accent)')}>
              {key === 'sqft' ? 'Per Sqft' : key === 'flat' ? 'Flat Fee' : 'Hourly'}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: laborMode === 'hourly' ? '1fr 1fr' : '1fr', gap: 6 }}>
          <div>
            <label style={calcFieldLabelCompact}>
              {laborMode === 'sqft' ? 'Rate ($/sqft) \u00b7 ' + Math.round(totalSqft) + ' sqft' : laborMode === 'hourly' ? 'Hourly Rate ($/hr)' : 'Flat Fee ($)'}
            </label>
            <input type="number" value={laborRate || ''} onChange={e => setLaborRate(Number(e.target.value))}
              style={{ ...calcInputCompact, ...mono, textAlign: 'right' }} disabled={!canWrite} min={0} step={laborMode === 'sqft' ? 0.5 : 25} placeholder="0" />
          </div>
          {laborMode === 'hourly' && (
            <div>
              <label style={calcFieldLabelCompact}>Hours</label>
              <input type="number" value={laborHours || ''} onChange={e => setLaborHours(Number(e.target.value))}
                style={{ ...calcInputCompact, ...mono, textAlign: 'right' }} disabled={!canWrite} min={0} step={0.5} placeholder="0" />
            </div>
          )}
        </div>
        {laborCost > 0 && <div style={{ marginTop: 3, fontSize: 9, color: 'var(--text3)', ...mono }}>Labor COGS: {fmtC(laborCost)}</div>}
      </div>

      <div style={hr} />

      {/* 5. Sale Price & Discount */}
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
            {laserActive && <span style={{ fontSize: 9, color: 'var(--purple)', ...mono }}>+ laser {fmtC(laserCost)}</span>}
          </div>
        </div>
      )}

      <OutputBar
        items={[
          { label: 'Mat (' + padCount + ' pads)', value: fmtC(materialCost) },
          { label: 'Labor',                        value: fmtC(laborCost),   color: 'var(--cyan)' },
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
                installer_pay: Math.round(laborCost * frac),
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
