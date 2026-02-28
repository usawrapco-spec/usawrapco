'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  autoPrice, calcGPMPct, gpmColor,
  calcFieldLabel, calcInput, pillBtn, outputRow, outputVal,
} from './types'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const DECKING_MATERIALS = [
  { key: 'seadek',     label: 'SeaDek',      rate: 18 },
  { key: 'hydroturf',  label: 'Hydro-Turf',  rate: 14 },
  { key: 'marinemat',  label: 'MarineMat',   rate: 12 },
]

const ZONES = [
  { key: 'cockpit_floor',  label: 'Cockpit Floor',  sqftFn: (L: number, B: number) => Math.round(L * B * 0.35) },
  { key: 'bow_deck',       label: 'Bow Deck',       sqftFn: (L: number, B: number) => Math.round(L * B * 0.20) },
  { key: 'helm_station',   label: 'Helm Station',   sqftFn: () => 8 },
  { key: 'swim_platform',  label: 'Swim Platform',  sqftFn: (_L: number, B: number) => Math.round(B * 4) },
  { key: 'gunnel_pads',    label: 'Gunnel Pads',    sqftFn: (L: number) => Math.round(L * 2 * 0.5) },
  { key: 'ladder_pad',     label: 'Ladder Pad',     sqftFn: () => 2 },
  { key: 'hatch_covers',   label: 'Hatch Covers',   sqftFn: () => 6 },
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
    if (newFull) {
      setSelectedZones(new Set(ZONES.map(z => z.key)))
    } else {
      setSelectedZones(new Set())
    }
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
    marginTop: 12, padding: 14,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 12,
  }

  return (
    <div style={gadget}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 14 }}>
        Boat Decking Calculator
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={calcFieldLabel}>Boat Length (ft)</label>
          <input type="number" value={boatLength} onChange={e => setBoatLength(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabel}>Beam Width (ft)</label>
          <input type="number" value={beamWidth} onChange={e => setBeamWidth(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      {/* Zone Selection */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Zones</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 5, marginBottom: 6 }}>
          {ZONES.map(z => {
            const sqftZ = z.sqftFn(boatLength, beamWidth)
            const active = fullDeck || selectedZones.has(z.key)
            return (
              <button key={z.key} onClick={() => toggleZone(z.key)}
                style={{ ...pillBtn(active, 'var(--green)'), textAlign: 'left', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
                <div>{z.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: active ? 'var(--green)' : 'var(--text3)', marginTop: 2 }}>{sqftZ} sqft</div>
              </button>
            )
          })}
        </div>
        <button onClick={toggleFullDeck}
          style={{ ...pillBtn(fullDeck, 'var(--amber)'), padding: '6px 16px' }}>
          Full Deck (all zones)
        </button>
      </div>

      {/* Material */}
      <div style={{ marginBottom: 12 }}>
        <label style={calcFieldLabel}>Material</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {DECKING_MATERIALS.map(m => (
            <button key={m.key} onClick={() => canWrite && setDeckMaterial(m.key)}
              style={{ ...pillBtn(deckMaterial === m.key, 'var(--green)'), flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11 }}>{m.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, marginTop: 2 }}>${m.rate}/sqft</div>
            </button>
          ))}
        </div>
      </div>

      {/* Logo Inlay */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <label style={{ ...calcFieldLabel, marginBottom: 0 }}>Custom Logo Inlay</label>
        <button onClick={() => canWrite && setLogoInlay(!logoInlay)} style={pillBtn(logoInlay, 'var(--purple)')}>
          {logoInlay ? 'Yes +$350' : 'No'}
        </button>
      </div>

      {/* Price */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div>
          <label style={calcFieldLabel}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabel}>Design Fee</label>
          <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
            style={{ ...calcInput, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      {/* Outputs */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Live Outputs</div>
        {[
          ['Total Sqft', `${sqft} sqft`],
          ['Material Cost', fmtC(materialCost) + ` ($${matRate}/sqft)`],
          ['Install Hours', `${installHours}h @ $55/hr`],
          ['Installer Pay', fmtC(installerPay)],
          logoInlay && ['Logo Inlay', fmtC(350)],
          ['Design Fee', fmtC(designFee)],
          ['COGS', fmtC(cogs)],
        ].filter(Boolean).map((row) => {
          const [l, v] = row as string[]
          return <div key={l} style={outputRow}><span>{l}</span><span style={outputVal}>{v}</span></div>
        })}
        <div style={{ ...outputRow, borderBottom: 'none', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text1)' }}>GPM</span>
          <span style={{ ...outputVal, fontSize: 14, color: gpmColor(gpm) }}>{gpm.toFixed(1)}% ({fmtC(gp)} GP)</span>
        </div>
        <button onClick={() => canWrite && setSalePrice(Math.round(auto73))}
          style={{
            marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'not-allowed',
            background: 'linear-gradient(135deg, rgba(34,192,122,0.15) 0%, rgba(79,127,255,0.15) 100%)',
            border: '1px solid rgba(34,192,122,0.3)', color: 'var(--green)',
            fontSize: 11, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
          <Zap size={12} /> Hit 73% GPM → Set Price to {fmtC(auto73)}
        </button>
      </div>
    </div>
  )
}
