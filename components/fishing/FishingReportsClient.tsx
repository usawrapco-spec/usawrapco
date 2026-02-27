'use client'

import { useState } from 'react'
import { FileText, Plus, X, Filter, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FishingReport {
  id: string
  user_id: string
  report_date: string
  spot_id: string | null
  custom_location_name: string | null
  success_level: number | null
  species_caught: string | string[] | null | undefined
  species_targeted: string | null
  weather: string | null
  water_clarity: string | null
  tide_stage: string | null
  technique_used: string[] | null
  notes: string | null
}

interface Spot {
  id: string
  name: string
  region: string
}

interface Props {
  userId: string
  reports: FishingReport[]
  spots: Spot[]
}

const TECHNIQUES = ['trolling', 'jigging', 'casting', 'fly', 'mooching', 'crabbing', 'shrimping'] as const
type Technique = typeof TECHNIQUES[number]

const WATER_CLARITY_OPTIONS = ['clear', 'slightly turbid', 'turbid', 'very turbid'] as const
const TIDE_STAGE_OPTIONS = ['high', 'incoming', 'low', 'outgoing', 'slack'] as const

const EMPTY_FORM = {
  report_date: new Date().toISOString().split('T')[0],
  custom_location_name: '',
  species_targeted: '',
  success_level: 3,
  technique_used: [] as Technique[],
  weather: '',
  water_clarity: 'clear' as typeof WATER_CLARITY_OPTIONS[number],
  tide_stage: 'slack' as typeof TIDE_STAGE_OPTIONS[number],
  notes: '',
}

function SuccessDots({ level }: { level: number | null }) {
  if (level == null) return null
  const colors = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--green)', 'var(--cyan)']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: n <= level ? colors[level - 1] : 'var(--surface2)',
            border: `1px solid ${n <= level ? colors[level - 1] : '#2a2d3e'}`,
          }}
        />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 4 }}>{level}/5</span>
    </div>
  )
}

function speciesCaughtLabel(raw: string | string[] | null | undefined): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw.map(s => (typeof s === 'string' ? s : JSON.stringify(s))).join(', ')
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

export function FishingReportsClient({ userId, reports: initialReports, spots }: Props) {
  const supabase = createClient()
  const [reports, setReports] = useState<FishingReport[]>(initialReports)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterMinSuccess, setFilterMinSuccess] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  function toggleTechnique(t: Technique) {
    setForm(f => ({
      ...f,
      technique_used: f.technique_used.includes(t)
        ? f.technique_used.filter(x => x !== t)
        : [...f.technique_used, t],
    }))
  }

  async function handleSave() {
    if (!form.report_date) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        report_date: form.report_date,
        custom_location_name: form.custom_location_name || null,
        species_targeted: form.species_targeted || null,
        success_level: form.success_level,
        technique_used: form.technique_used.length > 0 ? form.technique_used : null,
        weather: form.weather || null,
        water_clarity: form.water_clarity || null,
        tide_stage: form.tide_stage || null,
        notes: form.notes || null,
      }
      const { data, error } = await supabase.from('fishing_reports').insert(payload).select().single()
      if (!error && data) {
        setReports(prev => [data as FishingReport, ...prev])
        setForm(EMPTY_FORM)
        setShowForm(false)
      } else {
        alert('Error saving report: ' + (error?.message ?? 'Unknown'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this report?')) return
    await supabase.from('fishing_reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  const filtered = reports.filter(r => {
    if (filterDateFrom && r.report_date < filterDateFrom) return false
    if (filterDateTo && r.report_date > filterDateTo) return false
    if (filterMinSuccess && (r.success_level ?? 0) < filterMinSuccess) return false
    return true
  })

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={24} color="var(--cyan)" />
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Fishing Reports
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{reports.length} reports</p>
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >
            <Plus size={14} /> Create Report
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={iLabel}>Date from</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={iStyle} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={iLabel}>Date to</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={iStyle} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={iLabel}>Min success level</label>
            <select value={filterMinSuccess} onChange={e => setFilterMinSuccess(Number(e.target.value))} style={iStyle}>
              <option value={0}>Any</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <button
            onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterMinSuccess(0) }}
            style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Reports List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <FileText size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p>No reports found. Create your first fishing report!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const locationDisplay = r.custom_location_name
              || spots.find(s => s.id === r.spot_id)?.name
              || 'Unknown location'
            const techniques = Array.isArray(r.technique_used) ? r.technique_used : []

            return (
              <div
                key={r.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '16px 18px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15 }}>{locationDisplay}</span>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.report_date}</span>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <SuccessDots level={r.success_level} />
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      {!!r.species_caught && (
                        <span style={{ fontSize: 12, color: 'var(--green)' }}>
                          Caught: {speciesCaughtLabel(r.species_caught as string | string[])}
                        </span>
                      )}
                      {r.weather && (
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.weather}</span>
                      )}
                      {r.water_clarity && (
                        <span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{r.water_clarity}</span>
                      )}
                      {r.tide_stage && (
                        <span style={{ fontSize: 12, color: 'var(--cyan)', textTransform: 'capitalize' }}>{r.tide_stage} tide</span>
                      )}
                    </div>

                    {techniques.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {techniques.map(t => (
                          <span
                            key={t}
                            style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(79,127,255,0.1)', borderRadius: 4, padding: '2px 7px', border: '1px solid rgba(79,127,255,0.3)', textTransform: 'capitalize' }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.notes && <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>{r.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Report Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: 'var(--text1)', fontSize: 18, fontWeight: 700, margin: 0 }}>Create Fishing Report</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={iLabel}>Date *</label>
                  <input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} style={iStyle} />
                </div>
                <div>
                  <label style={iLabel}>Location</label>
                  <input
                    placeholder="Location name"
                    value={form.custom_location_name}
                    onChange={e => setForm(f => ({ ...f, custom_location_name: e.target.value }))}
                    style={iStyle}
                  />
                </div>
              </div>

              <div>
                <label style={iLabel}>Species targeted</label>
                <input
                  placeholder="e.g. Chinook Salmon, Dungeness Crab"
                  value={form.species_targeted}
                  onChange={e => setForm(f => ({ ...f, species_targeted: e.target.value }))}
                  style={iStyle}
                />
              </div>

              <div>
                <label style={iLabel}>Success level: {form.success_level}/5</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(n => {
                    const colors = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--green)', 'var(--cyan)']
                    const active = form.success_level === n
                    return (
                      <button
                        key={n}
                        onClick={() => setForm(f => ({ ...f, success_level: n }))}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          border: `2px solid ${active ? colors[n - 1] : '#2a2d3e'}`,
                          background: active ? `${colors[n - 1]}22` : 'var(--surface2)',
                          color: active ? colors[n - 1] : 'var(--text2)',
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={iLabel}>Techniques used</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TECHNIQUES.map(t => {
                    const active = form.technique_used.includes(t)
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTechnique(t)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: `1px solid ${active ? 'var(--accent)' : '#2a2d3e'}`,
                          background: active ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                          color: active ? 'var(--accent)' : 'var(--text2)',
                          fontSize: 12,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={iLabel}>Weather</label>
                  <input
                    placeholder="e.g. sunny, calm"
                    value={form.weather}
                    onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}
                    style={iStyle}
                  />
                </div>
                <div>
                  <label style={iLabel}>Water clarity</label>
                  <select value={form.water_clarity} onChange={e => setForm(f => ({ ...f, water_clarity: e.target.value as typeof WATER_CLARITY_OPTIONS[number] }))} style={iStyle}>
                    {WATER_CLARITY_OPTIONS.map(o => <option key={o} value={o} style={{ textTransform: 'capitalize' }}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={iLabel}>Tide stage</label>
                  <select value={form.tide_stage} onChange={e => setForm(f => ({ ...f, tide_stage: e.target.value as typeof TIDE_STAGE_OPTIONS[number] }))} style={iStyle}>
                    {TIDE_STAGE_OPTIONS.map(o => <option key={o} value={o} style={{ textTransform: 'capitalize' }}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={iLabel}>Notes</label>
                <textarea
                  rows={3}
                  placeholder="Details about conditions, technique, fish behavior..."
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
                style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
