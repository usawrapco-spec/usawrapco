'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import {
  Wrench, Save, Calculator, ChevronDown, ChevronRight,
  Search, Zap, Edit3,
} from 'lucide-react'

interface VehicleMeasurement {
  id: string
  make: string
  model: string
  total_sqft: number
}

interface PricingRules {
  install_rate_hr: number
  production_speed: number
  material_per_sqft: number
  design_fee: number
  max_cost_pct: number
}

interface Props {
  profile: Profile
  vehicles: VehicleMeasurement[]
  initialRules: PricingRules
  orgId: string
}

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function RateCardClient({ profile, vehicles, initialRules, orgId }: Props) {
  const supabase = createClient()
  const isAdmin = isAdminRole(profile.role)

  // ── Assumptions state ───────────────────────────────────────────────────────
  const [rules, setRules] = useState<PricingRules>(initialRules)
  const [editingRules, setEditingRules] = useState(false)
  const [savingRules, setSavingRules] = useState(false)
  const [draftRules, setDraftRules] = useState<PricingRules>(initialRules)

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [selectedMake, setSelectedMake] = useState('all')
  const [collapsedMakes, setCollapsedMakes] = useState<Record<string, boolean>>({})

  // ── Speed bonus calc state ──────────────────────────────────────────────────
  const [calcVehicleId, setCalcVehicleId] = useState('')
  const [actualHours, setActualHours] = useState('')

  // ── Derived: unique makes ───────────────────────────────────────────────────
  const makes = useMemo(() => {
    const s = new Set(vehicles.map(v => v.make))
    return ['all', ...Array.from(s).sort()]
  }, [vehicles])

  // ── Filtered vehicles ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = vehicles
    if (selectedMake !== 'all') list = list.filter(v => v.make === selectedMake)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      )
    }
    return list
  }, [vehicles, selectedMake, search])

  // ── Grouped by make (for table display) ────────────────────────────────────
  const grouped = useMemo(() => {
    const m: Record<string, VehicleMeasurement[]> = {}
    for (const v of filtered) {
      if (!m[v.make]) m[v.make] = []
      m[v.make].push(v)
    }
    return m
  }, [filtered])

  const sortedMakeKeys = useMemo(() => Object.keys(grouped).sort(), [grouped])

  // ── Per-vehicle calc ────────────────────────────────────────────────────────
  function calc(sqft: number) {
    const budgeted_hrs = sqft / rules.production_speed
    const flat_rate = budgeted_hrs * rules.install_rate_hr
    const material = sqft * rules.material_per_sqft
    const total_cost = flat_rate + material + rules.design_fee
    const min_rev = total_cost / (rules.max_cost_pct / 100)
    return { budgeted_hrs, flat_rate, material, total_cost, min_rev }
  }

  // ── Speed bonus panel ───────────────────────────────────────────────────────
  const calcVehicle = vehicles.find(v => v.id === calcVehicleId)
  const bonusCalc = useMemo(() => {
    if (!calcVehicle || !actualHours) return null
    const budgeted_hrs = calcVehicle.total_sqft / rules.production_speed
    const actual = parseFloat(actualHours) || 0
    const saved = Math.max(0, budgeted_hrs - actual)
    const flat_pay = budgeted_hrs * rules.install_rate_hr
    const speed_bonus = saved * rules.install_rate_hr
    return { budgeted_hrs, actual, saved, flat_pay, speed_bonus, total: flat_pay + speed_bonus }
  }, [calcVehicle, actualHours, rules])

  // ── Save assumptions ────────────────────────────────────────────────────────
  async function saveRules() {
    setSavingRules(true)
    try {
      await supabase.from('rate_card_settings').upsert({
        org_id: orgId,
        install_rate_hr: draftRules.install_rate_hr,
        production_speed: draftRules.production_speed,
        material_per_sqft: draftRules.material_per_sqft,
        design_fee: draftRules.design_fee,
        max_cost_pct: draftRules.max_cost_pct,
        updated_at: new Date().toISOString(),
        updated_by: profile.id,
      }, { onConflict: 'org_id' })
      setRules(draftRules)
      setEditingRules(false)
    } catch {}
    setSavingRules(false)
  }

  function toggleMake(make: string) {
    setCollapsedMakes(prev => ({ ...prev, [make]: !prev[make] }))
  }

  // ── Table styles ────────────────────────────────────────────────────────────
  const th: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700,
    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em',
    whiteSpace: 'nowrap', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 1,
  }
  const thL: React.CSSProperties = { ...th, textAlign: 'left' }
  const td: React.CSSProperties = {
    padding: '7px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text1)',
    borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'JetBrains Mono, monospace',
  }
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', fontFamily: 'inherit' }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wrench size={20} color="var(--accent)" />
        </div>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
            Install Rate Card
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
            Flat install rates by vehicle sqft — {vehicles.length.toLocaleString()} vehicles in database
          </p>
        </div>
      </div>

      {/* ── Assumptions Bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Calculator size={14} color="var(--accent)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Assumptions
          </span>
        </div>

        {([
          { key: 'install_rate_hr' as const,   label: 'Install Rate',    prefix: '$', suffix: '/hr', step: '1' },
          { key: 'production_speed' as const,  label: 'Prod Speed',      prefix: '',  suffix: ' sqft/hr', step: '0.01' },
          { key: 'material_per_sqft' as const, label: 'Material',        prefix: '$', suffix: '/sqft', step: '0.01' },
          { key: 'design_fee' as const,        label: 'Design Fee',      prefix: '$', suffix: '',   step: '1' },
          { key: 'max_cost_pct' as const,      label: 'Max Cost',        prefix: '',  suffix: '%',  step: '1' },
        ]).map(field => (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{field.label}</span>
            {editingRules && isAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {field.prefix && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{field.prefix}</span>}
                <input
                  type="number" step={field.step}
                  value={draftRules[field.key]}
                  onChange={e => setDraftRules(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: 72, background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 6px', fontSize: 13, color: 'var(--text1)', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
                />
                {field.suffix && <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{field.suffix}</span>}
              </div>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                {field.prefix}{field.key === 'production_speed' ? rules[field.key].toFixed(2) : field.key === 'material_per_sqft' ? rules[field.key].toFixed(2) : rules[field.key].toFixed(0)}{field.suffix}
              </span>
            )}
          </div>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isAdmin && !editingRules && (
            <button onClick={() => { setDraftRules({ ...rules }); setEditingRules(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Edit3 size={12} /> Edit
            </button>
          )}
          {editingRules && (
            <>
              <button onClick={() => setEditingRules(false)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveRules} disabled={savingRules}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: savingRules ? 0.7 : 1 }}>
                {savingRules
                  ? <div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  : <Save size={12} />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicles…"
            style={{ width: '100%', paddingLeft: 32, padding: '8px 12px 8px 32px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text1)', outline: 'none' }}
          />
        </div>
        <select
          value={selectedMake}
          onChange={e => setSelectedMake(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none', minWidth: 160, cursor: 'pointer' }}
        >
          {makes.map(m => (
            <option key={m} value={m}>{m === 'all' ? 'All Makes' : m}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
          {filtered.length.toLocaleString()} vehicles
        </div>
      </div>

      {/* ── Rate Card Table ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thL}>Vehicle</th>
                <th style={th}>Total Sqft</th>
                <th style={th}>Budgeted Hrs</th>
                <th style={{ ...th, color: 'var(--accent)' }}>Flat Install $</th>
                <th style={th}>Material $</th>
                <th style={th}>Design Fee</th>
                <th style={{ ...th, color: 'var(--amber)' }}>Total Cost $</th>
                <th style={{ ...th, color: 'var(--green)' }}>Min Revenue $</th>
                <th style={{ ...th, color: 'var(--purple)' }}>Speed Bonus</th>
              </tr>
            </thead>
            <tbody>
              {sortedMakeKeys.map(make => {
                const items = grouped[make]
                const isCollapsed = collapsedMakes[make]
                return [
                  <tr key={`make-${make}`}>
                    <td colSpan={9} onClick={() => toggleMake(make)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.025)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isCollapsed ? <ChevronRight size={12} color="var(--text3)" /> : <ChevronDown size={12} color="var(--text3)" />}
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{make}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>({items.length})</span>
                      </div>
                    </td>
                  </tr>,
                  ...(!isCollapsed ? items.map(v => {
                    const c = calc(Number(v.total_sqft))
                    return (
                      <tr key={v.id}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={tdL}>{v.model}</td>
                        <td style={td}>{Number(v.total_sqft).toFixed(0)}</td>
                        <td style={td}>{c.budgeted_hrs.toFixed(1)}</td>
                        <td style={{ ...td, color: 'var(--accent)', fontWeight: 600 }}>{fmt$(c.flat_rate)}</td>
                        <td style={td}>{fmt$(c.material)}</td>
                        <td style={td}>{fmt$(rules.design_fee)}</td>
                        <td style={{ ...td, color: 'var(--amber)', fontWeight: 600 }}>{fmt$(c.total_cost)}</td>
                        <td style={{ ...td, color: 'var(--green)', fontWeight: 600 }}>{fmt$(c.min_rev)}</td>
                        <td style={{ ...td, color: 'var(--purple)', fontSize: 11 }}>${rules.install_rate_hr}/hr saved</td>
                      </tr>
                    )
                  }) : []),
                ]
              })}
              {sortedMakeKeys.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No vehicles found matching your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, padding: '10px 14px', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
        {[
          { color: 'var(--accent)', label: 'Flat Install Pay', formula: 'Budgeted Hrs × Install Rate' },
          { color: 'var(--amber)', label: 'Total Cost', formula: 'Flat + Material + Design' },
          { color: 'var(--green)', label: 'Min Revenue', formula: `Total Cost ÷ Max Cost%` },
          { color: 'var(--purple)', label: 'Speed Bonus', formula: 'Hours Saved × Install Rate' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              <strong style={{ color: 'var(--text2)' }}>{l.label}</strong> = {l.formula}
            </span>
          </div>
        ))}
      </div>

      {/* ── Speed Bonus Calculator ──────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="var(--purple)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>Speed Bonus Calculator</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>Select vehicle + actual hours → see total installer earnings</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vehicle</label>
            <select
              value={calcVehicleId}
              onChange={e => setCalcVehicleId(e.target.value)}
              style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none', minWidth: 260, cursor: 'pointer' }}
            >
              <option value="">Select a vehicle…</option>
              {makes.filter(m => m !== 'all').map(make => (
                <optgroup key={make} label={make}>
                  {vehicles.filter(v => v.make === make).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({Number(v.total_sqft).toFixed(0)} sqft)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actual Hours</label>
            <input
              type="number" step="0.25" min="0" value={actualHours}
              onChange={e => setActualHours(e.target.value)}
              placeholder="e.g. 10.5"
              style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text1)', outline: 'none', width: 130 }}
            />
          </div>

          {bonusCalc && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
              {[
                { label: 'Budgeted Hrs', value: `${bonusCalc.budgeted_hrs.toFixed(1)}h`, color: 'var(--text1)' },
                { label: 'Hrs Saved', value: `${bonusCalc.saved > 0 ? '+' : ''}${bonusCalc.saved.toFixed(1)}h`, color: bonusCalc.saved > 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Flat Pay', value: fmt$(bonusCalc.flat_pay), color: 'var(--accent)' },
                { label: 'Speed Bonus', value: `+${fmt$(bonusCalc.speed_bonus)}`, color: 'var(--purple)' },
                { label: 'Total Earned', value: fmt$(bonusCalc.total), color: 'var(--green)', big: true },
              ].map((item, i) => (
                <div key={item.label} style={{ textAlign: 'center', ...(i === 4 ? { borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 } : {}) }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: item.big ? 22 : 18, fontWeight: item.big ? 800 : 700, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
