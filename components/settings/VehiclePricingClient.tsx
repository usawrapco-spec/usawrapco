'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Search, Save, CheckCircle2, AlertTriangle, Car, DollarSign } from 'lucide-react'
import vehiclesData from '@/lib/data/vehicles.json'

// ─── Types ──────────────────────────────────────────────────────────────────

interface VehicleEntry {
  year: number
  make: string
  model: string
  sqft: number
  basePrice: number
  installHours: number
  tier: string
}

interface PricingOverride {
  id?: string
  org_id: string
  year: number
  make: string
  model: string
  base_price: number
  install_hours: number
}

interface VehiclePricingProps {
  profile: Profile
  initialOverrides: PricingOverride[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const VEHICLES_DB: VehicleEntry[] = vehiclesData as unknown as VehicleEntry[]
const ALL_MAKES = [...new Set(VEHICLES_DB.map(v => v.make))].sort()

// ─── Styles ──────────────────────────────────────────────────────────────────

const monoFont = "'JetBrains Mono', monospace"
const headingFont = "'Barlow Condensed', sans-serif"

// ─── Component ───────────────────────────────────────────────────────────────

export default function VehiclePricingClient({ profile, initialOverrides }: VehiclePricingProps) {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [filterMake, setFilterMake] = useState('')
  const [overrides, setOverrides] = useState<Record<string, { base_price: number; install_hours: number }>>(
    {}
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  // Load initial overrides into map
  useEffect(() => {
    const map: Record<string, { base_price: number; install_hours: number }> = {}
    for (const o of initialOverrides) {
      map[`${o.year}-${o.make}-${o.model}`] = {
        base_price: o.base_price,
        install_hours: o.install_hours,
      }
    }
    setOverrides(map)
  }, [initialOverrides])

  // Deduplicated vehicles (unique by make+model, show latest year)
  const vehicles = useMemo(() => {
    const uniqueMap = new Map<string, VehicleEntry>()
    for (const v of VEHICLES_DB) {
      const key = `${v.make}-${v.model}`
      const existing = uniqueMap.get(key)
      if (!existing || v.year > existing.year) {
        uniqueMap.set(key, v)
      }
    }
    let result = Array.from(uniqueMap.values())
    if (filterMake) result = result.filter(v => v.make === filterMake)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(v =>
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        String(v.year).includes(q)
      )
    }
    return result.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model))
  }, [filterMake, search])

  function getEffectivePrice(v: VehicleEntry): number {
    const key = `${v.year}-${v.make}-${v.model}`
    return overrides[key]?.base_price ?? v.basePrice
  }

  function getEffectiveHours(v: VehicleEntry): number {
    const key = `${v.year}-${v.make}-${v.model}`
    return overrides[key]?.install_hours ?? v.installHours
  }

  function handlePriceChange(v: VehicleEntry, newPrice: number) {
    const key = `${v.year}-${v.make}-${v.model}`
    setOverrides(prev => ({
      ...prev,
      [key]: { base_price: newPrice, install_hours: getEffectiveHours(v) },
    }))
  }

  function handleHoursChange(v: VehicleEntry, newHours: number) {
    const key = `${v.year}-${v.make}-${v.model}`
    setOverrides(prev => ({
      ...prev,
      [key]: { base_price: getEffectivePrice(v), install_hours: newHours },
    }))
  }

  async function saveOverride(v: VehicleEntry) {
    const key = `${v.year}-${v.make}-${v.model}`
    const override = overrides[key]
    if (!override) return

    setSaving(key)
    const orgId = profile.org_id || ORG_ID
    const { error } = await supabase
      .from('vehicle_pricing_overrides')
      .upsert({
        org_id: orgId,
        year: v.year,
        make: v.make,
        model: v.model,
        base_price: override.base_price,
        install_hours: override.install_hours,
      }, { onConflict: 'org_id,year,make,model' })

    if (!error) {
      setSaved(prev => new Set(prev).add(key))
      setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(key); return n }), 2000)
    }
    setSaving(null)
  }

  const inp: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'var(--text1)',
    outline: 'none', fontFamily: monoFont, width: 80, textAlign: 'right',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Car size={20} style={{ color: 'var(--accent)' }} />
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: 'var(--text1)',
          fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
          margin: 0,
        }}>
          Vehicle Base Prices
        </h1>
        <span style={{
          fontSize: 11, color: 'var(--text3)', fontFamily: monoFont,
        }}>
          {VEHICLES_DB.length} entries | {vehicles.length} shown
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicles..."
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 12px 10px 32px', fontSize: 13, color: 'var(--text1)',
              outline: 'none',
            }}
          />
        </div>
        <select
          value={filterMake}
          onChange={e => setFilterMake(e.target.value)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text1)',
            cursor: 'pointer', outline: 'none', minWidth: 160,
          }}
        >
          <option value="">All Makes</option>
          {ALL_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 120px 1fr 70px 100px 90px 80px 50px',
          gap: 8, padding: '10px 14px', background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}>
          {['Year', 'Make', 'Model', 'Sqft', 'Base Price', 'Install Hrs', 'Tier', ''].map(h => (
            <span key={h} style={{
              fontSize: 9, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont,
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {vehicles.map(v => {
            const key = `${v.year}-${v.make}-${v.model}`
            const hasOverride = !!overrides[key]
            const isModified = hasOverride && (
              overrides[key].base_price !== v.basePrice ||
              overrides[key].install_hours !== v.installHours
            )
            return (
              <div
                key={key}
                style={{
                  display: 'grid', gridTemplateColumns: '60px 120px 1fr 70px 100px 90px 80px 50px',
                  gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  background: isModified ? 'rgba(79,127,255,0.04)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: monoFont }}>{v.year}</span>
                <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>{v.make}</span>
                <span style={{ fontSize: 12, color: 'var(--text1)' }}>{v.model}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: monoFont }}>{v.sqft}</span>
                <input
                  type="number"
                  value={getEffectivePrice(v)}
                  onChange={e => handlePriceChange(v, parseFloat(e.target.value) || 0)}
                  style={{
                    ...inp,
                    borderColor: isModified ? 'var(--accent)' : 'var(--border)',
                  }}
                />
                <input
                  type="number"
                  step="0.5"
                  value={getEffectiveHours(v)}
                  onChange={e => handleHoursChange(v, parseFloat(e.target.value) || 0)}
                  style={{
                    ...inp,
                    borderColor: isModified ? 'var(--accent)' : 'var(--border)',
                  }}
                />
                <span style={{
                  fontSize: 10, color: 'var(--text3)',
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(90,96,128,0.1)',
                }}>
                  {v.tier.replace(/_/g, ' ')}
                </span>
                <div>
                  {isModified && (
                    <button
                      onClick={() => saveOverride(v)}
                      disabled={saving === key}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: saved.has(key) ? 'var(--green)' : 'var(--accent)',
                        padding: 2, display: 'flex', alignItems: 'center',
                      }}
                      title="Save override"
                    >
                      {saved.has(key) ? <CheckCircle2 size={14} /> : <Save size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <div style={{
        marginTop: 12, padding: '8px 12px', borderRadius: 8,
        background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.12)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <DollarSign size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
          Edit base prices and install hours inline. Changes are saved per-entry to vehicle_pricing_overrides.
          Overrides take priority over vehicles.json defaults.
        </span>
      </div>
    </div>
  )
}
