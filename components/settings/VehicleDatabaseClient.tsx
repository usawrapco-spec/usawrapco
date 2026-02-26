'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Search, Upload, Download, Plus, Truck, X, CheckCircle2, AlertTriangle, Trash2,
} from 'lucide-react'

interface Vehicle {
  id: string
  org_id: string
  year: string
  make: string
  model: string
  trim: string | null
  body_style: string | null
  sqft_full: number | null
  sqft_partial: number | null
  sqft_hood: number | null
  sqft_roof: number | null
  sqft_sides: number | null
  template_url: string | null
  template_scale: string
  metadata: any
  created_at: string
}

interface Props {
  profile: Profile
  initialVehicles: Vehicle[]
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
  }).filter(row => Object.values(row).some(v => v))
}

function mapCSVRow(row: Record<string, string>, orgId: string): Partial<Vehicle> {
  // Try common column name patterns
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k]
    }
    return null
  }
  return {
    org_id: orgId,
    year: get('year', 'model_year', 'yr') || '',
    make: get('make', 'manufacturer', 'brand') || '',
    model: get('model', 'model_name') || '',
    trim: get('trim', 'trim_level', 'variant'),
    body_style: get('body_style', 'body', 'style', 'type'),
    sqft_full: parseFloat(get('sqft_full', 'full_sqft', 'sqft', 'sq_ft_full', 'full') || '') || null,
    sqft_partial: parseFloat(get('sqft_partial', 'partial_sqft', 'partial') || '') || null,
    sqft_hood: parseFloat(get('sqft_hood', 'hood_sqft', 'hood') || '') || null,
    sqft_roof: parseFloat(get('sqft_roof', 'roof_sqft', 'roof') || '') || null,
    sqft_sides: parseFloat(get('sqft_sides', 'sides_sqft', 'sides') || '') || null,
    template_scale: '1:20',
  }
}

export default function VehicleDatabaseClient({ profile, initialVehicles }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const orgId = profile.org_id || ORG_ID

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [csvPreview, setCsvPreview] = useState<{ rows: Record<string, string>[]; file: File } | null>(null)
  const [error, setError] = useState('')

  const [newVehicle, setNewVehicle] = useState({
    year: '', make: '', model: '', trim: '', body_style: '',
    sqft_full: '', sqft_partial: '', sqft_hood: '', sqft_roof: '', sqft_sides: '',
  })

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    return !q || `${v.year} ${v.make} ${v.model} ${v.trim || ''}`.toLowerCase().includes(q)
  })

  async function handleCSVFile(file: File) {
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length === 0) { setError('CSV appears empty or malformed'); return }
    setCsvPreview({ rows, file })
  }

  async function importCSV() {
    if (!csvPreview) return
    setImporting(true); setError('')
    try {
      const mapped = csvPreview.rows.map(row => mapCSVRow(row, orgId)).filter(v => v.year && v.make && v.model)
      let success = 0
      let failed = 0
      // Batch in chunks of 50
      for (let i = 0; i < mapped.length; i += 50) {
        const chunk = mapped.slice(i, i + 50)
        const { data, error: err } = await supabase
          .from('vehicle_database')
          .upsert(chunk as any, { onConflict: 'org_id,year,make,model' })
          .select()
        if (err) failed += chunk.length
        else {
          success += data?.length || 0
          setVehicles(prev => {
            const newItems = (data || []) as Vehicle[]
            const ids = new Set(newItems.map(v => v.id))
            return [...prev.filter(v => !ids.has(v.id)), ...newItems]
          })
        }
      }
      setImportResults({ success, failed })
      setCsvPreview(null)
    } catch (e: any) {
      setError(e.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function addVehicle() {
    if (!newVehicle.year || !newVehicle.make || !newVehicle.model) {
      setError('Year, Make, and Model are required')
      return
    }
    setError('')
    const { data, error: err } = await supabase
      .from('vehicle_database')
      .insert({
        org_id: orgId,
        year: newVehicle.year,
        make: newVehicle.make,
        model: newVehicle.model,
        trim: newVehicle.trim || null,
        body_style: newVehicle.body_style || null,
        sqft_full: parseFloat(newVehicle.sqft_full) || null,
        sqft_partial: parseFloat(newVehicle.sqft_partial) || null,
        sqft_hood: parseFloat(newVehicle.sqft_hood) || null,
        sqft_roof: parseFloat(newVehicle.sqft_roof) || null,
        sqft_sides: parseFloat(newVehicle.sqft_sides) || null,
        template_scale: '1:20',
      })
      .select()
      .single()
    if (err) { setError(err.message); return }
    setVehicles(prev => [data as Vehicle, ...prev])
    setShowAddModal(false)
    setNewVehicle({ year: '', make: '', model: '', trim: '', body_style: '', sqft_full: '', sqft_partial: '', sqft_hood: '', sqft_roof: '', sqft_sides: '' })
  }

  async function deleteVehicle(id: string) {
    await supabase.from('vehicle_database').delete().eq('id', id)
    setVehicles(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
            Vehicle Database
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {vehicles.length} vehicles — used for sqft auto-fill in estimates
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Upload size={14} /> Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); e.target.value = '' }}
          />
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Vehicle
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
          borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--red)',
        }}>
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {importResults && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
          borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--green)',
        }}>
          <CheckCircle2 size={14} />
          Imported {importResults.success} vehicles
          {importResults.failed > 0 && ` (${importResults.failed} failed)`}
          <button onClick={() => setImportResults(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* CSV Preview Modal */}
      {csvPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, maxWidth: 700, width: '100%', maxHeight: '80vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                Preview Import — {csvPreview.rows.length} rows
              </h3>
              <button onClick={() => setCsvPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
              First 5 rows shown. Columns auto-mapped from CSV headers.
            </p>
            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {Object.keys(csvPreview.rows[0] || {}).slice(0, 8).map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text3)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).slice(0, 8).map((val, j) => (
                        <td key={j} style={{ padding: '6px 10px', color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCsvPreview(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={importCSV}
                disabled={importing}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: importing ? 0.6 : 1 }}
              >
                {importing ? 'Importing...' : `Import ${csvPreview.rows.length} Vehicles`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, maxWidth: 540, width: '100%',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Add Vehicle</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { key: 'year', label: 'Year *' },
                { key: 'make', label: 'Make *' },
                { key: 'model', label: 'Model *' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    {f.label}
                  </label>
                  <input
                    className="field"
                    value={(newVehicle as any)[f.key]}
                    onChange={e => setNewVehicle(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { key: 'trim', label: 'Trim' },
                { key: 'body_style', label: 'Body Style' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    {f.label}
                  </label>
                  <input
                    className="field"
                    value={(newVehicle as any)[f.key]}
                    onChange={e => setNewVehicle(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { key: 'sqft_full', label: 'Full Sqft' },
                { key: 'sqft_partial', label: 'Partial' },
                { key: 'sqft_hood', label: 'Hood' },
                { key: 'sqft_roof', label: 'Roof' },
                { key: 'sqft_sides', label: 'Sides' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    {f.label}
                  </label>
                  <input
                    className="field"
                    type="number"
                    placeholder="0"
                    value={(newVehicle as any)[f.key]}
                    onChange={e => setNewVehicle(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={addVehicle} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Add Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="field"
            placeholder="Search by year, make, model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} of {vehicles.length} vehicles
        </span>
      </div>

      {/* Table */}
      {vehicles.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          border: '2px dashed var(--border)', borderRadius: 14,
        }}>
          <Truck size={36} style={{ color: 'var(--text3)', marginBottom: 12, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
            No vehicles yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Import a CSV with year, make, model, and sqft data
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            <Upload size={14} /> Import CSV
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Make</th>
                <th>Model</th>
                <th>Trim</th>
                <th>Body</th>
                <th style={{ textAlign: 'right' }}>Full Sqft</th>
                <th style={{ textAlign: 'right' }}>Partial</th>
                <th style={{ textAlign: 'right' }}>Hood</th>
                <th style={{ textAlign: 'right' }}>Roof</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>
                    No vehicles match your search.
                  </td>
                </tr>
              )}
              {filtered.map(v => (
                <tr key={v.id}>
                  <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{v.year}</td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{v.make}</td>
                  <td style={{ fontSize: 13, color: 'var(--text2)' }}>{v.model}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{v.trim || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>{v.body_style || '—'}</td>
                  <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {v.sqft_full ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{v.sqft_partial ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{v.sqft_hood ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{v.sqft_roof ?? '—'}</td>
                  <td>
                    <button
                      onClick={() => deleteVehicle(v.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, borderRadius: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
