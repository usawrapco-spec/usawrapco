'use client'

import { useState, useMemo, useEffect } from 'react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const DECKING_MATERIALS = [
  { key: 'seadek',     label: 'SeaDek',    rate: 18 },
  { key: 'hydroturf',  label: 'Hydro-Turf',rate: 14 },
  { key: 'marinemat',  label: 'MarineMat', rate: 12 },
]

const ZONES = [
  { key: 'cockpit_floor', label: 'Cockpit Floor', sqftFn: (L: number, B: number) => Math.round(L * B * 0.35) },
  { key: 'bow_deck',      label: 'Bow Deck',      sqftFn: (L: number, B: number) => Math.round(L * B * 0.20) },
  { key: 'helm_station',  label: 'Helm Station',  sqftFn: () => 8 },
  { key: 'swim_platform', label: 'Swim Platform', sqftFn: (_L: number, B: number) => Math.round(B * 4) },
  { key: 'gunnel_pads',   label: 'Gunnel Pads',   sqftFn: (L: number) => Math.round(L * 2 * 0.5) },
  { key: 'ladder_pad',    label: 'Ladder Pad',    sqftFn: () => 2 },
  { key: 'hatch_covers',  label: 'Hatch Covers',  sqftFn: () => 6 },
]

export default function BoatDeckingCalc({ specs, onChange, canWrite }: Props) {
  const [boatLength, setBoatLength]   = useState((specs.boatLength as number) || 24)
  const [beamWidth, setBeamWidth]     = useState((specs.beamWidth as number) || 8)
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    new Set((specs.deckingZones as string[]) || [])
  )
  const [fullDeck, setFullDeck]       = useState(!!(specs.fullDeck as boolean))
  const [deckMaterial, setDeckMaterial] = useState((specs.deckingMaterial as string) || 'seadek')
  const [logoInlay, setLogoInlay]     = useState(!!(specs.customLogoInlay as boolean))
  const [designFee, setDesignFee]     = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]     = useState((specs.unitPriceSaved as number) || 0)

  const toggleZone = (key: string) => {
    if (!canWrite) return
    setFullDeck(false)
    setSelectedZones(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleFullDeck = () => {
    if (!canWrite) return
    const newFull = !fullDeck
    setFullDeck(newFull)
    setSelectedZones(newFull ? new Set(ZONES.map(z => z.key)) : new Set())
  }

  const sqft = useMemo(() => {
    const zones = fullDeck ? ZONES : ZONES.filter(z => selectedZones.has(z.key))
    return zones.reduce((s, z) => s + z.sqftFn(boatLength, beamWidth), 0)
  }, [boatLength, beamWidth, selectedZones, fullDeck])

  const matRate  = DECKING_MATERIALS.find(m => m.key === deckMaterial)?.rate ?? 18
  const matLabel = DECKING_MATERIALS.find(m => m.key === deckMaterial)?.label ?? deckMaterial

  const materialCost = sqft * matRate
  const installHours = Math.round((sqft / 8) * 10) / 10
  const installerPay = Math.round(installHours * 55)
  const logoCost     = logoInlay ? 350 : 0
  const cogs         = materialCost + installerPay + logoCost + designFee
  const gpm          = calcGPMPct(salePrice, cogs)
  const gp           = salePrice - cogs
  const auto73       = autoPrice(cogs)

  useEffect(() => {
    onChange({
      name: `Boat Decking — ${boatLength}ft${fullDeck ? ' Full Deck' : ''}`,
      unit_price: salePrice,
      specs: {
        boatLength, beamWidth, deckingZones: [...selectedZones], fullDeck,
        deckingMaterial: deckMaterial, vinylType: matLabel, customLogoInlay: logoInlay,
        vinylArea: sqft, materialCost, installerPay, estimatedHours: installHours,
        designFee, productLineType: 'boat_decking', vehicleType: 'marine', unitPriceSaved: salePrice,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqft, materialCost, salePrice, installerPay, designFee,
      boatLength, beamWidth, deckMaterial, logoInlay, fullDeck, selectedZones])

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 10 }}>
        Boat Decking Calculator
      </div>

      {/* Dimensions + Full Deck toggle on same row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Boat Length (ft)</label>
          <input type="number" value={boatLength} onChange={e => setBoatLength(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Beam Width (ft)</label>
          <input type="number" value={beamWidth} onChange={e => setBeamWidth(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div style={{ paddingBottom: 1 }}>
          <button onClick={toggleFullDeck} style={pillBtnCompact(fullDeck, 'var(--amber)')}>
            Full Deck
          </button>
        </div>
      </div>

      {/* Zones + Material + Logo in 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
        {/* Left: zones */}
        <div>
          <label style={calcFieldLabelCompact}>Zones</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 4 }}>
            {ZONES.map(z => {
              const sqftZ = z.sqftFn(boatLength, beamWidth)
              const active = fullDeck || selectedZones.has(z.key)
              return (
                <button key={z.key} onClick={() => toggleZone(z.key)}
                  style={{
                    ...pillBtnCompact(active, 'var(--green)'),
                    textAlign: 'left' as const,
                    padding: '4px 7px',
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: 1,
                  }}>
                  <span style={{ fontSize: 9 }}>{z.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: active ? 'var(--green)' : 'var(--text3)' }}>{sqftZ} sqft</span>
                </button>
              )
            })}
          </div>
        </div>
        {/* Right: material + logo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
          <div>
            <label style={calcFieldLabelCompact}>Material</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {DECKING_MATERIALS.map(m => (
                <button key={m.key} onClick={() => canWrite && setDeckMaterial(m.key)}
                  style={{ ...pillBtnCompact(deckMaterial === m.key, 'var(--green)'), justifyContent: 'space-between', display: 'flex', width: '100%' }}>
                  <span>{m.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}>${m.rate}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={calcFieldLabelCompact}>Logo Inlay</label>
            <button onClick={() => canWrite && setLogoInlay(!logoInlay)}
              style={{ ...pillBtnCompact(logoInlay, 'var(--purple)'), width: '100%', justifyContent: 'center', display: 'flex' }}>
              {logoInlay ? '+$350' : 'No Logo'}
            </button>
          </div>
        </div>
      </div>

      {/* Price row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Design Fee</label>
          <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      <OutputBar
        items={[
          { label: 'Total Sqft', value: `${sqft} sqft`, color: 'var(--cyan)' },
          { label: 'Mat Cost', value: `${fmtC(materialCost)} ($${matRate}/sqft)` },
          { label: 'Labor', value: fmtC(installerPay), color: 'var(--cyan)' },
          ...(logoInlay ? [{ label: 'Logo', value: fmtC(350), color: 'var(--purple)' }] : []),
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ]}
        gpm={gpm}
        gp={gp}
        autoPrice={Math.round(auto73)}
        onApplyAutoPrice={() => setSalePrice(Math.round(auto73))}
        canWrite={canWrite}
      />
    </div>
  )
}
