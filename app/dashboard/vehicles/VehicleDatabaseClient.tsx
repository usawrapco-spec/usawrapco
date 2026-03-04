'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Database, AlertCircle } from 'lucide-react'
import { INSTALL_TIERS, MATERIAL_OPTIONS, calculateInstallPay } from '@/lib/estimator/vehicleDb'
import { DESIGN_FEE_DEFAULT, GPM_TARGET, autoPrice } from '@/components/estimates/calculators/types'

interface VehicleRow {
  id: string
  make: string
  model: string
  year_start: number | null
  year_end: number | null
  driver_sqft: number | null
  passenger_sqft: number | null
  back_sqft: number | null
  hood_sqft: number | null
  roof_sqft: number | null
  full_wrap_sqft: number | null
  full_wrap_with_roof_sqft: number | null
  total_sqft: number | null
  wrap_sqft: number | null
  linear_feet: number | null
  install_hours: number | null
  install_pay: number | null
  data_quality: string | null
}

interface Props {
  totalCount: number
  makes: string[]
}

const PAGE_SIZE = 50
const fmtC = (n: number) => '$' + n.toLocaleString()

const DQ_BADGE: Record<string, { bg: string; color: string }> = {
  good:     { bg: 'rgba(34,192,122,0.12)', color: 'var(--green)' },
  partial:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)' },
  cab_only: { bg: 'rgba(242,90,90,0.12)',  color: 'var(--red)' },
}

export default function VehicleDatabaseClient({ totalCount, makes }: Props) {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedMake, setSelectedMake] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState('')
  const [liveCount, setLiveCount] = useState(totalCount)

  useEffect(() => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('vehicle_measurements')
      .select('*')
      .order('make')
      .order('model')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (selectedMake) query = query.eq('make', selectedMake)
    if (search.length >= 2) query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%`)

    query.then(({ data }: { data: VehicleRow[] | null }) => {
      setLoading(false)
      if (data) setVehicles(data)
    })
  }, [search, selectedMake, page])

  const handleSeed = async (force = false) => {
    setSeeding(true)
    setSeedResult('')
    try {
      const res = await fetch(`/api/admin/seed-vehicles${force ? '?force=true' : ''}`, { method: 'POST' })
      const json = await res.json()
      setSeedResult(JSON.stringify(json, null, 2))
      if (json.inserted) setLiveCount(json.inserted)
    } catch (e) {
      setSeedResult(String(e))
    }
    setSeeding(false)
  }

  const fmtYears = (v: VehicleRow) => {
    if (!v.year_start) return '--'
    if (!v.year_end || v.year_end === v.year_start) return String(v.year_start)
    return `${v.year_start}-${v.year_end}`
  }

  const col: React.CSSProperties = { color: 'var(--text3)', fontWeight: 600, fontSize: 11, padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid var(--surface2)', whiteSpace: 'nowrap', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }
  const cell: React.CSSProperties = { padding: '6px 8px', fontSize: 12 }
  const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }

  // Material cost for COGS reference (Avery 1105 default)
  const matRate = MATERIAL_OPTIONS[0].rate

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={20} color="var(--accent)" /> Vehicle Measurement Database
          </h1>
          <p style={{ color: 'var(--text3)', margin: '4px 0 0', fontSize: 13 }}>
            {liveCount.toLocaleString()} vehicles · {makes.length} makes · single source of truth for all sq ft calculations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleSeed(false)}
            disabled={seeding}
            style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--green)', color: 'white', border: 'none', cursor: seeding ? 'not-allowed' : 'pointer', fontSize: 13, opacity: seeding ? 0.6 : 1 }}
          >
            {seeding ? 'Working...' : 'Seed DB'}
          </button>
          <button
            onClick={() => handleSeed(true)}
            disabled={seeding}
            style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--amber)', color: 'white', border: 'none', cursor: seeding ? 'not-allowed' : 'pointer', fontSize: 13, opacity: seeding ? 0.6 : 1 }}
          >
            Force Re-seed
          </button>
        </div>
      </div>

      {liveCount === 0 && (
        <div style={{ background: '#1a0f0f', border: '1px solid var(--red)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} color="var(--red)" />
          <div>
            <div style={{ color: 'var(--red)', fontWeight: 600 }}>Database is empty!</div>
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Click "Seed DB" to load 2,045 vehicles.</div>
          </div>
        </div>
      )}

      {seedResult && (
        <pre style={{ background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, padding: 12, color: 'var(--green)', fontSize: 12, marginBottom: 16, overflowX: 'auto' }}>
          {seedResult}
        </pre>
      )}

      {/* Install Tier Reference Grid */}
      <div style={{ marginBottom: 20, padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--surface2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Install Tier Reference (Formula: {INSTALL_TIERS[0].hourlyRate}/hr)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {INSTALL_TIERS.map(tier => {
            const wrapSqft = tier.label === 'XS' ? 125 : tier.label === 'S' ? 175 : tier.label === 'M' ? 225 : tier.label === 'L' ? 275 : tier.label === 'XL' ? 350 : tier.label === 'XXL' ? 450 : tier.label === '3XL' ? 550 : 650
            const matCost = Math.round(wrapSqft * matRate * 1.10)
            const cogs = matCost + tier.pay + DESIGN_FEE_DEFAULT
            const price = autoPrice(cogs)
            return (
              <div key={tier.label} style={{
                padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--surface2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--cyan)', fontFamily: "'Barlow Condensed', sans-serif" }}>{tier.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text3)' }}>{tier.sqftRange} sqft</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: 10 }}>
                  <span style={{ color: 'var(--text3)' }}>Install</span>
                  <span style={{ ...mono, color: 'var(--text1)', textAlign: 'right', fontWeight: 600 }}>{fmtC(tier.pay)}</span>
                  <span style={{ color: 'var(--text3)' }}>Hours</span>
                  <span style={{ ...mono, color: 'var(--text2)', textAlign: 'right' }}>{tier.hours}h</span>
                  <span style={{ color: 'var(--text3)' }}>COGS</span>
                  <span style={{ ...mono, color: 'var(--text2)', textAlign: 'right' }}>{fmtC(cogs)}</span>
                  <span style={{ color: 'var(--text3)' }}>75% GPM</span>
                  <span style={{ ...mono, color: 'var(--green)', textAlign: 'right', fontWeight: 700 }}>{fmtC(price)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="text"
            placeholder="Search make or model..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={selectedMake}
          onChange={e => { setSelectedMake(e.target.value); setPage(0) }}
          style={{ padding: '9px 12px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 13, minWidth: 160 }}
        >
          <option value="">All Makes</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--surface2)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={col}>Make</th>
              <th style={col}>Model</th>
              <th style={{ ...col, textAlign: 'center' }}>Years</th>
              <th style={{ ...col, textAlign: 'center', color: '#4f7fff' }}>Driver</th>
              <th style={{ ...col, textAlign: 'center', color: '#8b5cf6' }}>Pass.</th>
              <th style={{ ...col, textAlign: 'center', color: '#f59e0b' }}>Rear</th>
              <th style={{ ...col, textAlign: 'center', color: '#22c07a' }}>Hood</th>
              <th style={{ ...col, textAlign: 'center', color: '#ec4899' }}>Roof</th>
              <th style={{ ...col, textAlign: 'center', color: 'var(--cyan)' }}>Lin Ft</th>
              <th style={{ ...col, textAlign: 'center', color: 'var(--amber)' }}>Wrap Sqft</th>
              <th style={{ ...col, textAlign: 'center', color: 'var(--text2)' }}>+Roof</th>
              <th style={{ ...col, textAlign: 'center', color: 'var(--green)' }}>Install</th>
              <th style={{ ...col, textAlign: 'center' }}>Quality</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} style={{ ...cell, textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Loading...</td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ ...cell, textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No vehicles found</td>
              </tr>
            ) : vehicles.map((v, i) => {
              const dq = v.data_quality || 'good'
              const badge = DQ_BADGE[dq] || DQ_BADGE.good
              return (
                <tr key={v.id} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)' }}>
                  <td style={{ ...cell, color: 'var(--text2)', fontWeight: 500 }}>{v.make}</td>
                  <td style={{ ...cell, color: 'var(--text1)' }}>{v.model}</td>
                  <td style={{ ...cell, color: 'var(--text3)', textAlign: 'center', fontSize: 11 }}>{fmtYears(v)}</td>
                  <td style={{ ...cell, ...mono, color: '#4f7fff', textAlign: 'center', fontWeight: 600 }}>{v.driver_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#8b5cf6', textAlign: 'center', fontWeight: 600 }}>{v.passenger_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#f59e0b', textAlign: 'center', fontWeight: 600 }}>{v.back_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#22c07a', textAlign: 'center', fontWeight: 600 }}>{v.hood_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#ec4899', textAlign: 'center', fontWeight: 600 }}>{v.roof_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: 'var(--cyan)', textAlign: 'center', fontWeight: 600 }}>{v.linear_feet ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: 'var(--amber)', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{v.full_wrap_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: 'var(--text2)', textAlign: 'center', fontSize: 11 }}>{v.full_wrap_with_roof_sqft ?? v.total_sqft ?? '--'}</td>
                  <td style={{ ...cell, ...mono, color: 'var(--green)', textAlign: 'center', fontWeight: 600 }}>{v.install_pay ? fmtC(v.install_pay) : '--'}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: badge.bg, color: badge.color }}>
                      {dq}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{ padding: '6px 14px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text1)', border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}
        >
          Prev
        </button>
        <span style={{ color: 'var(--text3)', fontSize: 13 }}>Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={vehicles.length < PAGE_SIZE}
          style={{ padding: '6px 14px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text1)', border: 'none', cursor: vehicles.length < PAGE_SIZE ? 'not-allowed' : 'pointer', opacity: vehicles.length < PAGE_SIZE ? 0.5 : 1 }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
