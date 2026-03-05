'use client'

import { useState, useMemo, useEffect } from 'react'
import { Anchor, Plus, X, Check } from 'lucide-react'
import type { LineItemSpecs } from '@/types'
import { calcMarineSqft } from '@/lib/estimator/pricing'
import { createClient } from '@/lib/supabase/client'
import {
  CalcOutput, DESIGN_FEE_DEFAULT,
  calcGPMPct,
  calcFieldLabelCompact, calcInputCompact, pillBtnCompact,
} from './types'
import OutputBar from './OutputBar'
import { calculateMarineInstallPay } from '@/lib/estimator/vehicleDb'

interface Props {
  specs: LineItemSpecs
  onChange: (out: CalcOutput) => void
  canWrite: boolean
}

interface MaterialPreset {
  id: string
  name: string
  brand: string | null
  sku: string | null
  roll_width_in: number
  cost_per_yard: number
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
type WrapType = 'printed' | 'color_change'

const BLANK_NEW_MAT = { name: '', brand: '', sku: '', roll_width_in: 54, cost_per_yard: 0 }

export default function MarineCalc({ specs, onChange, canWrite }: Props) {
  const supabase = createClient()

  const [wrapType, setWrapType]           = useState<WrapType>((specs.wrapType as WrapType) || 'printed')
  const [hullLength, setHullLength]       = useState((specs.hullLength as number) || 24)
  const [hullHeight, setHullHeight]       = useState((specs.hullHeight as number) || 24)
  const [transom, setTransom]             = useState(!!(specs.includeTransom as boolean))
  const [transomWidth, setTransomWidth]   = useState((specs.transomWidth as number) || 72)
  const [transomHeight, setTransomHeight] = useState((specs.transomHeight as number) || 24)
  const [prepWork, setPrepWork]           = useState(!!(specs.prepWork as boolean))
  const [prepHours, setPrepHours]         = useState((specs.prepHours as number) || 0)
  const [installerPay, setInstallerPay]   = useState((specs.installerPay as number) || 0)
  const [installOverride, setInstallOverride] = useState(!!(specs.installOverride as boolean))
  const [designFee, setDesignFee]         = useState((specs.designFee as number) ?? DESIGN_FEE_DEFAULT)
  const [salePrice, setSalePrice]         = useState((specs.unitPriceSaved as number) || 0)

  // Material preset state
  const [presets, setPresets]             = useState<MaterialPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    (specs.materialPresetId as string) || null
  )
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [newMat, setNewMat]               = useState(BLANK_NEW_MAT)
  const [saving, setSaving]               = useState(false)

  // Derived from selected preset (or fallback custom rate)
  const [customRate, setCustomRate]       = useState((specs.customMatRate as number) || 2.10)
  const useCustom = selectedPresetId === 'custom'

  const selectedPreset = presets.find(p => p.id === selectedPresetId) ?? null
  const rollWidthIn    = selectedPreset?.roll_width_in ?? (wrapType === 'printed' ? 54 : 60)
  const costPerYard    = selectedPreset?.cost_per_yard
  // Fallback $/sqft: custom rate (or derived from preset for display)
  const matRate        = useCustom ? customRate : (selectedPreset ? selectedPreset.cost_per_yard / (selectedPreset.roll_width_in / 12 * 3) : customRate)
  const matLabel       = selectedPreset ? selectedPreset.name : 'Custom'

  // Load presets
  useEffect(() => {
    supabase
      .from('wrap_material_presets')
      .select('id, name, brand, sku, roll_width_in, cost_per_yard')
      .order('name')
      .then(({ data }) => {
        if (data) setPresets(data as MaterialPreset[])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const marine = useMemo(() => calcMarineSqft(
    hullLength, hullHeight, wrapType, transom,
    transomWidth, transomHeight,
    matRate,
    rollWidthIn,
    costPerYard
  ), [hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight,
      matRate, rollWidthIn, costPerYard])

  // Install: marine = half of commercial formula
  const marineInstall = useMemo(() => calculateMarineInstallPay(marine.boatSqft), [marine.boatSqft])
  const effectiveInstallPay = installOverride ? installerPay : marineInstall.pay
  const installHours = marineInstall.hours
  const prepCost     = prepWork ? Math.round(prepHours * (marineInstall.hourlyRate || 17)) : 0

  useEffect(() => {
    if (!installOverride && marineInstall.pay > 0) setInstallerPay(marineInstall.pay)
  }, [installOverride, marineInstall.pay])

  const cogs       = marine.totalCost + effectiveInstallPay + prepCost + designFee
  const gpm        = calcGPMPct(salePrice, cogs)
  const gp         = salePrice - cogs
  const belowFloor = salePrice > 0 && gpm < 67

  useEffect(() => {
    onChange({
      name: `Marine Hull Wrap — ${hullLength}ft ${wrapType === 'printed' ? 'Printed' : 'Color Change'}`,
      unit_price: salePrice,
      specs: {
        hullLength, hullHeight, wrapType, includeTransom: transom,
        transomWidth, transomHeight,
        prepWork, prepHours, installOverride,
        vinylType: matLabel, materialPresetId: selectedPresetId,
        rollWidthIn, costPerYard,
        vinylArea: marine.boatSqft,
        materialCost: marine.totalCost, installerPay: effectiveInstallPay,
        estimatedHours: installHours + (prepWork ? prepHours : 0),
        designFee, productLineType: 'marine', vehicleType: 'marine', unitPriceSaved: salePrice,
        panels: marine.panels, totalLinearFt: marine.totalLinearFt,
        totalLinearYards: marine.totalLinearYards,
        wasteSqft: marine.wasteSqft, wasteCost: marine.wasteCost,
        yardBased: marine.yardBased,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marine.boatSqft, marine.totalCost, salePrice, effectiveInstallPay, designFee,
      hullLength, hullHeight, wrapType, transom, transomWidth, transomHeight,
      prepWork, prepHours, installOverride, selectedPresetId, rollWidthIn, costPerYard])

  async function saveNewMaterial() {
    if (!newMat.name || !newMat.cost_per_yard || !newMat.roll_width_in) return
    setSaving(true)
    const { data: profile } = await supabase.from('profiles').select('org_id').single()
    if (!profile?.org_id) { setSaving(false); return }
    const { data, error } = await supabase
      .from('wrap_material_presets')
      .insert({
        org_id: profile.org_id,
        name: newMat.name,
        brand: newMat.brand || null,
        sku: newMat.sku || null,
        roll_width_in: newMat.roll_width_in,
        cost_per_yard: newMat.cost_per_yard,
      })
      .select('id, name, brand, sku, roll_width_in, cost_per_yard')
      .single()
    setSaving(false)
    if (!error && data) {
      setPresets(prev => [...prev, data as MaterialPreset].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedPresetId(data.id)
      setShowAddMaterial(false)
      setNewMat(BLANK_NEW_MAT)
    }
  }

  const gadget: React.CSSProperties = {
    marginTop: 10, padding: 10,
    background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
    border: '1px solid var(--border)', borderRadius: 10,
  }

  // Derived $/sqft for a preset (for display only)
  function presetSqftRate(p: MaterialPreset) {
    return (p.cost_per_yard / (p.roll_width_in / 12 * 3)).toFixed(2)
  }

  const materialBreakdown = marine.yardBased && costPerYard
    ? `${marine.totalLinearYards.toFixed(1)} yds × ${fmtC(costPerYard)}/yd`
    : `${marine.boatSqft} sqft`

  return (
    <div style={gadget}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Anchor size={12} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Marine Hull Wrap Calculator
        </span>
      </div>

      {/* Row 1: Wrap Type + panel badge */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        {([['printed', 'Printed'], ['color_change', 'Color Change']] as const).map(([k, label]) => (
          <button key={k} onClick={() => canWrite && setWrapType(k)}
            style={pillBtnCompact(wrapType === k, 'var(--cyan)')}>
            {label}
          </button>
        ))}
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 800,
          background: marine.panels === 2 ? 'rgba(245,158,11,0.15)' : 'rgba(34,192,122,0.15)',
          color: marine.panels === 2 ? 'var(--amber)' : 'var(--green)',
          border: `1px solid ${marine.panels === 2 ? 'rgba(245,158,11,0.3)' : 'rgba(34,192,122,0.3)'}`,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {marine.panels}P · {hullHeight}&quot; hull / {marine.rollWidthIn}&quot; roll / {marine.maxHeightIn.toFixed(0)}&quot; max
        </span>
      </div>

      {/* Row 2: Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Hull Length (ft)</label>
          <input type="number" value={hullLength} onChange={e => setHullLength(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Hull Height (inches)</label>
          <input type="number" value={hullHeight} onChange={e => setHullHeight(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} step="1" />
        </div>
      </div>

      {/* Row 3: Transom + Prep */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', cursor: canWrite ? 'pointer' : 'default' }}>
          <input type="checkbox" checked={transom} onChange={() => canWrite && setTransom(!transom)} />
          Transom
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', cursor: canWrite ? 'pointer' : 'default' }}>
          <input type="checkbox" checked={prepWork} onChange={() => canWrite && setPrepWork(!prepWork)} />
          Prep
        </label>
        {prepWork && (
          <input type="number" value={prepHours} onChange={e => setPrepHours(Number(e.target.value))}
            style={{ ...calcInputCompact, width: 60, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
            disabled={!canWrite} min={0} placeholder="hrs" />
        )}
      </div>

      {/* Transom Dimensions */}
      {transom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
          <div>
            <label style={calcFieldLabelCompact}>Transom Width (in)</label>
            <input type="number" value={transomWidth} onChange={e => setTransomWidth(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
          </div>
          <div>
            <label style={calcFieldLabelCompact}>Transom Height (in)</label>
            <input type="number" value={transomHeight} onChange={e => setTransomHeight(Number(e.target.value))}
              style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
          </div>
        </div>
      )}

      {/* Material Presets */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={calcFieldLabelCompact}>Material</label>
          {canWrite && (
            <button onClick={() => setShowAddMaterial(!showAddMaterial)}
              style={{ ...pillBtnCompact(showAddMaterial, 'var(--accent)'), display: 'flex', alignItems: 'center', gap: 3 }}>
              <Plus size={9} />
              Add Material
            </button>
          )}
        </div>

        {/* Preset pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: presets.length > 0 ? 4 : 0 }}>
          {presets.map(p => {
            const active = selectedPresetId === p.id
            return (
              <button key={p.id} onClick={() => canWrite && setSelectedPresetId(active ? null : p.id)}
                style={{ ...pillBtnCompact(active, 'var(--cyan)'), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '3px 8px', gap: 1 }}>
                <span>{p.name}{p.brand ? ` · ${p.brand}` : ''}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: active ? 'var(--cyan)' : 'var(--text3)' }}>
                  {p.roll_width_in}&quot; roll · ${p.cost_per_yard}/yd · ${presetSqftRate(p)}/sqft
                </span>
              </button>
            )
          })}
          {/* Custom fallback */}
          <button onClick={() => canWrite && setSelectedPresetId('custom')}
            style={pillBtnCompact(useCustom, 'var(--amber)')}>
            Custom $/sqft
          </button>
        </div>

        {/* Custom rate input */}
        {useCustom && (
          <div style={{ marginTop: 4 }}>
            <label style={calcFieldLabelCompact}>Custom Rate ($/sqft)</label>
            <input type="number" value={customRate || ''} onChange={e => setCustomRate(Number(e.target.value))}
              style={{ ...calcInputCompact, width: 100, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
              disabled={!canWrite} step="0.01" min={0} />
          </div>
        )}

        {/* Add material form */}
        {showAddMaterial && (
          <div style={{ marginTop: 6, padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 6 }}>
              New Material Preset
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 5, marginBottom: 5 }}>
              <div>
                <label style={calcFieldLabelCompact}>Name *</label>
                <input value={newMat.name} onChange={e => setNewMat(p => ({ ...p, name: e.target.value }))}
                  placeholder="Avery MPI 1105" style={{ ...calcInputCompact, fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={calcFieldLabelCompact}>Brand</label>
                <input value={newMat.brand} onChange={e => setNewMat(p => ({ ...p, brand: e.target.value }))}
                  placeholder="Avery" style={{ ...calcInputCompact, fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={calcFieldLabelCompact}>SKU</label>
                <input value={newMat.sku} onChange={e => setNewMat(p => ({ ...p, sku: e.target.value }))}
                  placeholder="MPI1105" style={{ ...calcInputCompact, fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 5, alignItems: 'end' }}>
              <div>
                <label style={calcFieldLabelCompact}>Roll Width (in) *</label>
                <input type="number" value={newMat.roll_width_in || ''} onChange={e => setNewMat(p => ({ ...p, roll_width_in: Number(e.target.value) }))}
                  style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} min={1} />
              </div>
              <div>
                <label style={calcFieldLabelCompact}>Cost / Yard ($) *</label>
                <input type="number" value={newMat.cost_per_yard || ''} onChange={e => setNewMat(p => ({ ...p, cost_per_yard: Number(e.target.value) }))}
                  style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} min={0} step="0.01" />
              </div>
              <button onClick={saveNewMaterial} disabled={saving || !newMat.name || !newMat.cost_per_yard}
                style={{ ...pillBtnCompact(true, 'var(--green)'), display: 'flex', alignItems: 'center', gap: 3, paddingBottom: 6 }}>
                <Check size={10} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setShowAddMaterial(false); setNewMat(BLANK_NEW_MAT) }}
                style={{ ...pillBtnCompact(false), display: 'flex', alignItems: 'center', paddingBottom: 6 }}>
                <X size={10} />
              </button>
            </div>
            {newMat.roll_width_in > 0 && newMat.cost_per_yard > 0 && (
              <div style={{ marginTop: 5, fontSize: 9, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                Derived: ${(newMat.cost_per_yard / (newMat.roll_width_in / 12 * 3)).toFixed(2)}/sqft
              </div>
            )}
          </div>
        )}
      </div>

      {/* Install Pay */}
      <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--surface)' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Install Pay (½ commercial)
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={() => { if (canWrite) { setInstallOverride(false); setInstallerPay(marineInstall.pay) } }}
              style={pillBtnCompact(!installOverride, 'var(--cyan)')}>Formula</button>
            <button onClick={() => canWrite && setInstallOverride(true)}
              style={pillBtnCompact(installOverride, 'var(--amber)')}>Override</button>
          </div>
        </div>
        <div style={{ padding: '6px 10px', background: 'var(--bg)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text2)' }}>
            {installHours}h × ${marineInstall.hourlyRate}/hr
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: installOverride ? 'var(--amber)' : 'var(--cyan)' }}>
            = {fmtC(effectiveInstallPay)}
          </span>
          {installOverride && (
            <input type="number" value={installerPay || ''} onChange={e => setInstallerPay(Number(e.target.value))}
              style={{ ...calcInputCompact, width: 90, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', borderColor: 'var(--amber)' }}
              disabled={!canWrite} />
          )}
        </div>
      </div>

      {/* Sale Price + Design Fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
        <div>
          <label style={calcFieldLabelCompact}>Sale Price</label>
          <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', borderColor: belowFloor ? 'var(--red)' : undefined }} disabled={!canWrite} />
        </div>
        <div>
          <label style={calcFieldLabelCompact}>Design Fee</label>
          <input type="number" value={designFee || ''} onChange={e => setDesignFee(Number(e.target.value))}
            style={{ ...calcInputCompact, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} disabled={!canWrite} />
        </div>
      </div>

      {belowFloor && (
        <div style={{ marginBottom: 8, padding: '6px 10px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)', borderRadius: 7, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
          Below 65% floor — manager override required.
        </div>
      )}

      <OutputBar
        items={[
          { label: 'Material', value: `${fmtC(marine.totalCost)} (${materialBreakdown})` },
          { label: 'Install', value: `${fmtC(effectiveInstallPay)} (${installHours}h)`, color: 'var(--cyan)' },
          { label: 'COGS', value: fmtC(cogs), color: 'var(--red)' },
        ]}
        gpm={gpm}
        gp={gp}
        cogs={cogs}
        currentPrice={salePrice}
        onSetPrice={(p) => canWrite && setSalePrice(p)}
        canWrite={canWrite}
      />
    </div>
  )
}
