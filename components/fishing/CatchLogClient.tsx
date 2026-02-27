'use client'

import { useState } from 'react'
import { Fish, Plus, X, Star, Filter, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Species { id: string; common_name: string; category: string }
interface Spot { id: string; name: string; region: string }
interface CatchEntry {
  id: string
  species_name: string | null
  species_id: string | null
  weight_lbs: number | null
  length_inches: number | null
  catch_date: string
  catch_time: string | null
  location_name: string | null
  technique: string | null
  bait_lure: string | null
  was_released: boolean | null
  is_personal_best: boolean | null
  notes: string | null
  depth_ft: number | null
}

interface Props {
  userId: string
  catches: CatchEntry[]
  species: Species[]
  spots: Spot[]
}

const EMPTY_FORM = {
  species_id: '',
  species_name: '',
  weight_lbs: '',
  length_inches: '',
  catch_date: new Date().toISOString().split('T')[0],
  catch_time: '',
  location_name: '',
  technique: '',
  bait_lure: '',
  depth_ft: '',
  was_released: false,
  notes: '',
}

export function CatchLogClient({ userId, catches: initial, species }: Props) {
  const supabase = createClient()
  const [catches, setCatches] = useState<CatchEntry[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterSpecies, setFilterSpecies] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  function handleSpeciesChange(id: string) {
    const s = species.find(x => x.id === id)
    setForm(f => ({ ...f, species_id: id, species_name: s?.common_name ?? '' }))
  }

  async function handleSave() {
    if (!form.catch_date) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        catch_date: form.catch_date,
        species_id: form.species_id || null,
        species_name: form.species_name || null,
        weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
        length_inches: form.length_inches ? parseFloat(form.length_inches) : null,
        catch_time: form.catch_time || null,
        location_name: form.location_name || null,
        technique: form.technique || null,
        bait_lure: form.bait_lure || null,
        depth_ft: form.depth_ft ? parseInt(form.depth_ft) : null,
        was_released: form.was_released,
        notes: form.notes || null,
      }
      const { data, error } = await supabase.from('catch_log').insert(payload).select().single()
      if (!error && data) {
        setCatches(prev => [data as CatchEntry, ...prev])
        setForm(EMPTY_FORM)
        setShowForm(false)
      } else {
        alert('Error saving catch: ' + (error?.message ?? 'Unknown'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this catch?')) return
    await supabase.from('catch_log').delete().eq('id', id)
    setCatches(prev => prev.filter(c => c.id !== id))
  }

  const filtered = catches.filter(c => {
    if (filterSpecies && c.species_name !== filterSpecies) return false
    if (filterDate && c.catch_date < filterDate) return false
    return true
  })

  const uniqueSpeciesInLog = [...new Set(catches.map(c => c.species_name).filter((s): s is string => s !== null))]

  const iLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }
  const iStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid #2a2d3e',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Fish size={24} color="var(--green)" />
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Catch Log
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{catches.length} total entries</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '8px 14px', color: 'var(--text1)', cursor: 'pointer', fontSize: 13 }}
          >
            <Filter size={14} /> Filters <ChevronDown size={12} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >
            <Plus size={14} /> Log Catch
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={iLabel}>Filter by species</label>
            <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)} style={iStyle}>
              <option value="">All species</option>
              {uniqueSpeciesInLog.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label style={iLabel}>Catches after date</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={iStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => { setFilterSpecies(''); setFilterDate('') }}
              style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: 'var(--text1)', fontSize: 18, fontWeight: 700, margin: 0 }}>Log New Catch</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={iLabel}>Species</label>
                <select value={form.species_id} onChange={e => handleSpeciesChange(e.target.value)} style={iStyle}>
                  <option value="">Select species...</option>
                  {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
                </select>
                {!form.species_id && (
                  <input
                    placeholder="Or type species name"
                    value={form.species_name}
                    onChange={e => setForm(f => ({ ...f, species_name: e.target.value }))}
                    style={{ ...iStyle, marginTop: 6 }}
                  />
                )}
              </div>
              <div>
                <label style={iLabel}>Date *</label>
                <input type="date" value={form.catch_date} onChange={e => setForm(f => ({ ...f, catch_date: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={iLabel}>Time</label>
                <input type="time" value={form.catch_time} onChange={e => setForm(f => ({ ...f, catch_time: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={iLabel}>Weight (lbs)</label>
                <input type="number" step="0.1" placeholder="0.0" value={form.weight_lbs} onChange={e => setForm(f => ({ ...f, weight_lbs: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={iLabel}>Length (inches)</label>
                <input type="number" step="0.5" placeholder="0.0" value={form.length_inches} onChange={e => setForm(f => ({ ...f, length_inches: e.target.value }))} style={iStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={iLabel}>Location</label>
                <input
                  placeholder="e.g. Elliott Bay, Puget Sound"
                  value={form.location_name}
                  onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                  style={iStyle}
                />
              </div>
              <div>
                <label style={iLabel}>Technique</label>
                <input placeholder="e.g. trolling, jigging" value={form.technique} onChange={e => setForm(f => ({ ...f, technique: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={iLabel}>Bait / Lure</label>
                <input placeholder="e.g. herring, spoon" value={form.bait_lure} onChange={e => setForm(f => ({ ...f, bait_lure: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={iLabel}>Depth (ft)</label>
                <input type="number" placeholder="0" value={form.depth_ft} onChange={e => setForm(f => ({ ...f, depth_ft: e.target.value }))} style={iStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
                <input
                  type="checkbox"
                  id="released"
                  checked={form.was_released}
                  onChange={e => setForm(f => ({ ...f, was_released: e.target.checked }))}
                />
                <label htmlFor="released" style={{ color: 'var(--text1)', fontSize: 13, cursor: 'pointer' }}>Released</label>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={iLabel}>Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any notes about conditions, technique, etc."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...iStyle, resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 8, padding: '8px 16px', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: 'var(--green)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Catch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <Fish size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p>No catches recorded yet. Log your first catch!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => (
            <div
              key={c.id}
              style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Fish size={20} color="var(--green)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15 }}>{c.species_name || 'Unknown'}</span>
                  {c.is_personal_best && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(245,158,11,0.15)', border: '1px solid var(--amber)', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: 'var(--amber)' }}>
                      <Star size={10} fill="var(--amber)" /> PB
                    </span>
                  )}
                  {c.was_released && (
                    <span style={{ background: 'rgba(34,192,122,0.1)', border: '1px solid var(--green)', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: 'var(--green)' }}>
                      Released
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.catch_date}{c.catch_time ? ` ${c.catch_time}` : ''}</span>
                  {c.location_name && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.location_name}</span>}
                  {c.weight_lbs != null && <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{c.weight_lbs} lbs</span>}
                  {c.length_inches != null && <span style={{ fontSize: 12, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{c.length_inches}&quot;</span>}
                  {c.technique && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.technique}</span>}
                  {c.bait_lure && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.bait_lure}</span>}
                </div>
                {c.notes && <p style={{ fontSize: 12, color: 'var(--text2)', margin: '4px 0 0' }}>{c.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
