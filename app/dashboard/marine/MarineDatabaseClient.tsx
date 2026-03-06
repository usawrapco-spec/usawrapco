'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Anchor, Plus, Sparkles, ChevronDown, ChevronUp, X, FileText, Trash2, ExternalLink } from 'lucide-react'
import { QUICK_ADD_PARTS } from '@/lib/estimator/boatDeckingDb'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface DeckComponent { id: string; label: string }

interface MarineVessel {
  id: string
  make: string
  model: string
  year: number | null
  boat_class: string
  overall_length_ft: number | null
  beam_ft: number | null
  draft_ft: number | null
  dry_weight_lbs: number | null
  fuel_capacity_gal: number | null
  water_capacity_gal: number | null
  num_levels: number | null
  deck_components: DeckComponent[]
  estimated_value_min: number | null
  estimated_value_max: number | null
  fun_facts: string[]
  schematic_svg: string | null
  manual_url: string | null
  manual_summary: string | null
  ai_generated: boolean
  source_urls: string[]
  created_at: string
}

interface Props {
  totalCount: number
  makes: string[]
  boatClasses: string[]
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const PAGE_SIZE = 50

const BOAT_CLASS_LABELS: Record<string, string> = {
  bowrider: 'Bowrider', center_console: 'Center Console', pontoon: 'Pontoon',
  cabin_cruiser: 'Cabin Cruiser', yacht: 'Yacht', sailboat: 'Sailboat',
  catamaran: 'Catamaran', trawler: 'Trawler', fishing: 'Fishing',
  ski_boat: 'Ski Boat', wakeboard: 'Wakeboard', deck_boat: 'Deck Boat',
  bass_boat: 'Bass Boat', custom: 'Custom',
}

const ALL_CLASSES = Object.entries(BOAT_CLASS_LABELS).map(([key, label]) => ({ key, label }))

const fmtV = (min: number | null, max: number | null) => {
  if (!min && !max) return '--'
  const f = (n: number) => '$' + n.toLocaleString()
  if (min && max) return `${f(min)} – ${f(max)}`
  return f(min || max!)
}

/* ── Styles ─────────────────────────────────────────────────────────────── */

const col: React.CSSProperties = {
  color: 'var(--text3)', fontWeight: 600, fontSize: 11, padding: '10px 8px',
  textAlign: 'left', borderBottom: '1px solid var(--surface2)', whiteSpace: 'nowrap',
  fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em',
}
const cell: React.CSSProperties = { padding: '6px 8px', fontSize: 12 }
const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, monospace' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--bg)',
  border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4,
  fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em',
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, background: 'var(--accent)', color: '#fff',
  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
}
const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text1)',
  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
}
const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--surface2)',
  width: '90%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto', padding: 24,
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function MarineDatabaseClient({ totalCount, makes, boatClasses }: Props) {
  const supabase = createClient()
  const [vessels, setVessels] = useState<MarineVessel[]>([])
  const [search, setSearch] = useState('')
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<Partial<MarineVessel>>({ boat_class: 'custom', num_levels: 1, deck_components: [], fun_facts: [] })
  const [addLoading, setAddLoading] = useState(false)

  // AI modal
  const [showAi, setShowAi] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<MarineVessel | null>(null)
  const [aiManualLoading, setAiManualLoading] = useState(false)

  /* ── Fetch ────────────────────────────────────────────────────────────── */

  const fetchVessels = useCallback(() => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('marine_vessels')
      .select('*')
      .order('make')
      .order('model')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (selectedMake) query = query.eq('make', selectedMake)
    if (selectedClass) query = query.eq('boat_class', selectedClass)
    if (search.length >= 2) query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%`)

    query.then(({ data }: { data: MarineVessel[] | null }) => {
      setLoading(false)
      if (data) setVessels(data)
    })
  }, [search, selectedMake, selectedClass, page])

  useEffect(() => { fetchVessels() }, [fetchVessels])

  /* ── Add Boat ─────────────────────────────────────────────────────────── */

  const handleAdd = async () => {
    if (!addForm.make || !addForm.model) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/marine-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, ai_generated: false }),
      })
      if (res.ok) {
        setShowAdd(false)
        setAddForm({ boat_class: 'custom', num_levels: 1, deck_components: [], fun_facts: [] })
        fetchVessels()
      }
    } finally { setAddLoading(false) }
  }

  /* ── AI Lookup ────────────────────────────────────────────────────────── */

  const handleAiLookup = async () => {
    if (!aiQuery || aiQuery.length < 3) return
    setAiLoading(true)
    setAiPreview(null)
    try {
      const res = await fetch('/api/marine-database/ai-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      })
      const { vessel } = await res.json()
      if (vessel) setAiPreview(vessel as MarineVessel)
    } catch { /* ignore */ }
    finally { setAiLoading(false) }
  }

  const handleAiSave = async () => {
    if (!aiPreview) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/marine-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPreview),
      })
      if (res.ok) {
        setShowAi(false)
        setAiPreview(null)
        setAiQuery('')
        fetchVessels()
      }
    } finally { setAiLoading(false) }
  }

  const handleFindManual = async () => {
    if (!aiPreview) return
    setAiManualLoading(true)
    try {
      const res = await fetch('/api/marine-database/ai-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ make: aiPreview.make, model: aiPreview.model, year: aiPreview.year }),
      })
      const result = await res.json()
      setAiPreview(prev => prev ? { ...prev, manual_url: result.manual_url, manual_summary: result.manual_summary } : null)
    } catch { /* ignore */ }
    finally { setAiManualLoading(false) }
  }

  /* ── Delete ───────────────────────────────────────────────────────────── */

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vessel from the database?')) return
    await fetch(`/api/marine-database/${id}`, { method: 'DELETE' })
    fetchVessels()
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Anchor size={20} color="var(--cyan)" /> Marine Vessel Database
          </h1>
          <p style={{ color: 'var(--text3)', margin: '4px 0 0', fontSize: 13 }}>
            {totalCount.toLocaleString()} vessels · {makes.length} manufacturers · {boatClasses.length} classes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnSecondary} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Boat
          </button>
          <button style={{ ...btnPrimary, background: 'var(--cyan)' }} onClick={() => setShowAi(true)}>
            <Sparkles size={14} /> AI Lookup
          </button>
        </div>
      </div>

      {/* Boat Class Reference Grid */}
      <div style={{ marginBottom: 20, padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--surface2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Boat Classes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {ALL_CLASSES.map(c => (
            <button
              key={c.key}
              onClick={() => { setSelectedClass(selectedClass === c.key ? '' : c.key); setPage(0) }}
              style={{
                padding: '8px 10px', borderRadius: 8, background: selectedClass === c.key ? 'rgba(34,211,238,0.12)' : 'var(--bg)',
                border: `1px solid ${selectedClass === c.key ? 'var(--cyan)' : 'var(--surface2)'}`,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: selectedClass === c.key ? 'var(--cyan)' : 'var(--text2)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {c.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="text" placeholder="Search make or model..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select value={selectedMake} onChange={e => { setSelectedMake(e.target.value); setPage(0) }}
          style={{ padding: '9px 12px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 13, minWidth: 160 }}>
          <option value="">All Manufacturers</option>
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
              <th style={{ ...col, textAlign: 'center' }}>Year</th>
              <th style={{ ...col, textAlign: 'center', color: 'var(--cyan)' }}>Class</th>
              <th style={{ ...col, textAlign: 'center', color: '#4f7fff' }}>Length</th>
              <th style={{ ...col, textAlign: 'center', color: '#8b5cf6' }}>Beam</th>
              <th style={{ ...col, textAlign: 'center', color: '#22c07a' }}>Draft</th>
              <th style={{ ...col, textAlign: 'center', color: '#f59e0b' }}>Levels</th>
              <th style={{ ...col, textAlign: 'center', color: 'var(--green)' }}>Est. Value</th>
              <th style={{ ...col, textAlign: 'center' }}>Source</th>
              <th style={{ ...col, width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ ...cell, textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Loading...</td></tr>
            ) : vessels.length === 0 ? (
              <tr><td colSpan={11} style={{ ...cell, textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No vessels found. Use AI Lookup to add boats!</td></tr>
            ) : vessels.map((v, i) => (
              <Fragment key={v.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)', cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  <td style={{ ...cell, color: 'var(--text2)', fontWeight: 500 }}>{v.make}</td>
                  <td style={{ ...cell, color: 'var(--text1)' }}>{v.model}</td>
                  <td style={{ ...cell, color: 'var(--text3)', textAlign: 'center', fontSize: 11 }}>{v.year || '--'}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(34,211,238,0.1)', color: 'var(--cyan)' }}>
                      {BOAT_CLASS_LABELS[v.boat_class] || v.boat_class}
                    </span>
                  </td>
                  <td style={{ ...cell, ...mono, color: '#4f7fff', textAlign: 'center', fontWeight: 600 }}>{v.overall_length_ft ? `${v.overall_length_ft}'` : '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#8b5cf6', textAlign: 'center', fontWeight: 600 }}>{v.beam_ft ? `${v.beam_ft}'` : '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#22c07a', textAlign: 'center', fontWeight: 600 }}>{v.draft_ft ? `${v.draft_ft}'` : '--'}</td>
                  <td style={{ ...cell, ...mono, color: '#f59e0b', textAlign: 'center', fontWeight: 600 }}>{v.num_levels || '--'}</td>
                  <td style={{ ...cell, ...mono, color: 'var(--green)', textAlign: 'center', fontSize: 11 }}>{fmtV(v.estimated_value_min, v.estimated_value_max)}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      background: v.ai_generated ? 'rgba(139,92,246,0.12)' : 'rgba(34,192,122,0.12)',
                      color: v.ai_generated ? '#8b5cf6' : 'var(--green)',
                    }}>
                      {v.ai_generated ? 'AI' : 'Manual'}
                    </span>
                  </td>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    {expandedId === v.id ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                  </td>
                </tr>

                {/* Expanded Detail */}
                {expandedId === v.id && (
                  <tr><td colSpan={11} style={{ padding: 0 }}>
                    <div style={{ padding: 20, background: 'var(--bg)', borderTop: '1px solid var(--surface2)', borderBottom: '1px solid var(--surface2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* Left: Specs + Fun Facts */}
                        <div>
                          {/* Specs Grid */}
                          <div style={{ ...labelStyle, marginBottom: 8 }}>Specifications</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16 }}>
                            {[
                              ['Length', v.overall_length_ft ? `${v.overall_length_ft} ft` : '--'],
                              ['Beam', v.beam_ft ? `${v.beam_ft} ft` : '--'],
                              ['Draft', v.draft_ft ? `${v.draft_ft} ft` : '--'],
                              ['Dry Weight', v.dry_weight_lbs ? `${v.dry_weight_lbs.toLocaleString()} lbs` : '--'],
                              ['Fuel Capacity', v.fuel_capacity_gal ? `${v.fuel_capacity_gal} gal` : '--'],
                              ['Water Capacity', v.water_capacity_gal ? `${v.water_capacity_gal} gal` : '--'],
                              ['Deck Levels', v.num_levels ? String(v.num_levels) : '--'],
                              ['Class', BOAT_CLASS_LABELS[v.boat_class] || v.boat_class],
                            ].map(([label, val]) => (
                              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 4, background: 'var(--surface)' }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</span>
                                <span style={{ ...mono, fontSize: 11, color: 'var(--text1)', fontWeight: 600 }}>{val}</span>
                              </div>
                            ))}
                          </div>

                          {/* Fun Facts */}
                          {v.fun_facts && v.fun_facts.length > 0 && (
                            <div style={{ padding: 12, background: 'rgba(34,211,238,0.05)', borderRadius: 8, border: '1px solid rgba(34,211,238,0.15)', marginBottom: 16 }}>
                              <div style={{ ...labelStyle, color: 'var(--cyan)', marginBottom: 8 }}>Fun Facts</div>
                              {v.fun_facts.map((fact, fi) => (
                                <div key={fi} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, paddingLeft: 12, position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: 0, color: 'var(--cyan)' }}>•</span>
                                  {fact}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Deck Components */}
                          {v.deck_components && v.deck_components.length > 0 && (
                            <div>
                              <div style={{ ...labelStyle, marginBottom: 8 }}>Deck Components</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {v.deck_components.map((dc, di) => (
                                  <span key={di} style={{
                                    padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                    background: 'rgba(79,127,255,0.1)', color: '#4f7fff',
                                  }}>
                                    {dc.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Schematic + Manual */}
                        <div>
                          {/* SVG Schematic */}
                          {v.schematic_svg && (
                            <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--surface2)', marginBottom: 16, textAlign: 'center' }}>
                              <div style={{ ...labelStyle, marginBottom: 8 }}>Top-Down Schematic</div>
                              <div
                                style={{ maxWidth: 300, margin: '0 auto' }}
                                dangerouslySetInnerHTML={{ __html: v.schematic_svg }}
                              />
                            </div>
                          )}

                          {/* Manual */}
                          {(v.manual_url || v.manual_summary) && (
                            <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--surface2)', marginBottom: 16 }}>
                              <div style={{ ...labelStyle, marginBottom: 8 }}>Manual / Documentation</div>
                              {v.manual_url && (
                                <a href={v.manual_url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 12, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textDecoration: 'none' }}>
                                  <ExternalLink size={12} /> View Manual PDF
                                </a>
                              )}
                              {v.manual_summary && (
                                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                  {v.manual_summary}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11, color: 'var(--red)' }} onClick={() => handleDelete(v.id)}>
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          style={{ padding: '6px 14px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text1)', border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
          Prev
        </button>
        <span style={{ color: 'var(--text3)', fontSize: 13 }}>Page {page + 1}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={vessels.length < PAGE_SIZE}
          style={{ padding: '6px 14px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text1)', border: 'none', cursor: vessels.length < PAGE_SIZE ? 'not-allowed' : 'pointer', opacity: vessels.length < PAGE_SIZE ? 0.5 : 1 }}>
          Next
        </button>
      </div>

      {/* ── Add Boat Modal ──────────────────────────────────────────────────── */}
      {showAdd && (
        <div style={overlay} onClick={() => setShowAdd(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: 'var(--text1)', fontSize: 18, fontWeight: 700, margin: 0 }}>Add Boat Manually</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
            </div>

            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={labelStyle}>Make *</div>
                <input style={inputStyle} value={addForm.make || ''} onChange={e => setAddForm({ ...addForm, make: e.target.value })} placeholder="Boston Whaler" />
              </div>
              <div>
                <div style={labelStyle}>Model *</div>
                <input style={inputStyle} value={addForm.model || ''} onChange={e => setAddForm({ ...addForm, model: e.target.value })} placeholder="280 Outrage" />
              </div>
              <div>
                <div style={labelStyle}>Year</div>
                <input type="number" style={inputStyle} value={addForm.year || ''} onChange={e => setAddForm({ ...addForm, year: e.target.value ? Number(e.target.value) : null })} placeholder="2024" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={labelStyle}>Boat Class</div>
                <select style={inputStyle} value={addForm.boat_class || 'custom'} onChange={e => setAddForm({ ...addForm, boat_class: e.target.value })}>
                  {ALL_CLASSES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Deck Levels</div>
                <input type="number" style={inputStyle} value={addForm.num_levels || 1} onChange={e => setAddForm({ ...addForm, num_levels: Number(e.target.value) })} min={1} max={6} />
              </div>
            </div>

            {/* Dimensions */}
            <div style={{ ...labelStyle, marginBottom: 8 }}>Dimensions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Overall Length (ft)</div>
                <input type="number" style={inputStyle} value={addForm.overall_length_ft || ''} onChange={e => setAddForm({ ...addForm, overall_length_ft: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Beam (ft)</div>
                <input type="number" style={inputStyle} value={addForm.beam_ft || ''} onChange={e => setAddForm({ ...addForm, beam_ft: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Draft (ft)</div>
                <input type="number" style={inputStyle} value={addForm.draft_ft || ''} onChange={e => setAddForm({ ...addForm, draft_ft: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Dry Weight (lbs)</div>
                <input type="number" style={inputStyle} value={addForm.dry_weight_lbs || ''} onChange={e => setAddForm({ ...addForm, dry_weight_lbs: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Fuel Capacity (gal)</div>
                <input type="number" style={inputStyle} value={addForm.fuel_capacity_gal || ''} onChange={e => setAddForm({ ...addForm, fuel_capacity_gal: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Water Capacity (gal)</div>
                <input type="number" style={inputStyle} value={addForm.water_capacity_gal || ''} onChange={e => setAddForm({ ...addForm, water_capacity_gal: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>

            {/* Value */}
            <div style={{ ...labelStyle, marginBottom: 8 }}>Estimated Value Range</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Min ($)</div>
                <input type="number" style={inputStyle} value={addForm.estimated_value_min || ''} onChange={e => setAddForm({ ...addForm, estimated_value_min: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Max ($)</div>
                <input type="number" style={inputStyle} value={addForm.estimated_value_max || ''} onChange={e => setAddForm({ ...addForm, estimated_value_max: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>

            {/* Deck Components */}
            <div style={{ ...labelStyle, marginBottom: 8 }}>Deck Components</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {QUICK_ADD_PARTS.map(p => {
                const selected = (addForm.deck_components || []).some(dc => dc.id === p.id)
                return (
                  <button key={p.id} onClick={() => {
                    const current = addForm.deck_components || []
                    setAddForm({
                      ...addForm,
                      deck_components: selected ? current.filter(dc => dc.id !== p.id) : [...current, { id: p.id, label: p.label }],
                    })
                  }} style={{
                    padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: selected ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                    color: selected ? '#4f7fff' : 'var(--text3)',
                    border: `1px solid ${selected ? '#4f7fff' : 'transparent'}`,
                  }}>
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Fun Facts */}
            <div style={{ ...labelStyle, marginBottom: 8 }}>Fun Facts</div>
            <div style={{ marginBottom: 16 }}>
              {(addForm.fun_facts || []).map((fact, fi) => (
                <div key={fi} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={fact}
                    onChange={e => {
                      const facts = [...(addForm.fun_facts || [])]
                      facts[fi] = e.target.value
                      setAddForm({ ...addForm, fun_facts: facts })
                    }}
                    placeholder="e.g., Known for its unsinkable hull design..."
                  />
                  <button onClick={() => {
                    const facts = (addForm.fun_facts || []).filter((_, i) => i !== fi)
                    setAddForm({ ...addForm, fun_facts: facts })
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => setAddForm({ ...addForm, fun_facts: [...(addForm.fun_facts || []), ''] })}
                style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}>
                + Add Fact
              </button>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...btnPrimary, opacity: addLoading || !addForm.make || !addForm.model ? 0.5 : 1 }}
                disabled={addLoading || !addForm.make || !addForm.model} onClick={handleAdd}>
                {addLoading ? 'Saving...' : 'Save Boat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Lookup Modal ─────────────────────────────────────────────────── */}
      {showAi && (
        <div style={overlay} onClick={() => { if (!aiLoading) { setShowAi(false); setAiPreview(null); setAiQuery('') } }}>
          <div style={{ ...modal, maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: 'var(--text1)', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="var(--cyan)" /> AI Boat Lookup
              </h2>
              <button onClick={() => { setShowAi(false); setAiPreview(null); setAiQuery('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 16px' }}>
              Type any boat name and AI will research specs, fun facts, generate a schematic, and find the manual.
            </p>

            {/* Search Input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                style={{ ...inputStyle, flex: 1, fontSize: 15, padding: '12px 14px' }}
                value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiLookup()}
                placeholder="e.g., 2024 Boston Whaler 280 Outrage"
                autoFocus
              />
              <button style={{ ...btnPrimary, background: 'var(--cyan)', padding: '12px 24px' }}
                onClick={handleAiLookup} disabled={aiLoading || aiQuery.length < 3}>
                {aiLoading ? 'Researching...' : 'Search'}
              </button>
            </div>

            {/* Loading */}
            {aiLoading && !aiPreview && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 14, color: 'var(--cyan)', marginBottom: 8 }}>Researching vessel...</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Looking up specs, generating schematic, finding fun facts</div>
              </div>
            )}

            {/* AI Preview */}
            {aiPreview && (
              <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--surface2)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ color: 'var(--text1)', fontSize: 16, fontWeight: 700, margin: 0 }}>
                    {aiPreview.year && `${aiPreview.year} `}{aiPreview.make} {aiPreview.model}
                  </h3>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'rgba(34,211,238,0.1)', color: 'var(--cyan)' }}>
                    {BOAT_CLASS_LABELS[aiPreview.boat_class] || aiPreview.boat_class}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Left: Specs */}
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16 }}>
                      {[
                        ['Length', aiPreview.overall_length_ft ? `${aiPreview.overall_length_ft} ft` : '--'],
                        ['Beam', aiPreview.beam_ft ? `${aiPreview.beam_ft} ft` : '--'],
                        ['Draft', aiPreview.draft_ft ? `${aiPreview.draft_ft} ft` : '--'],
                        ['Weight', aiPreview.dry_weight_lbs ? `${aiPreview.dry_weight_lbs.toLocaleString()} lbs` : '--'],
                        ['Fuel', aiPreview.fuel_capacity_gal ? `${aiPreview.fuel_capacity_gal} gal` : '--'],
                        ['Water', aiPreview.water_capacity_gal ? `${aiPreview.water_capacity_gal} gal` : '--'],
                        ['Levels', String(aiPreview.num_levels || 1)],
                        ['Value', fmtV(aiPreview.estimated_value_min, aiPreview.estimated_value_max)],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 4, background: 'var(--surface)' }}>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</span>
                          <span style={{ ...mono, fontSize: 11, color: 'var(--text1)', fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Deck Components */}
                    {aiPreview.deck_components?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ ...labelStyle, marginBottom: 6 }}>Deck Components</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {aiPreview.deck_components.map((dc, i) => (
                            <span key={i} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: 'rgba(79,127,255,0.1)', color: '#4f7fff' }}>
                              {dc.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fun Facts */}
                    {aiPreview.fun_facts?.length > 0 && (
                      <div style={{ padding: 12, background: 'rgba(34,211,238,0.05)', borderRadius: 8, border: '1px solid rgba(34,211,238,0.15)' }}>
                        <div style={{ ...labelStyle, color: 'var(--cyan)', marginBottom: 8 }}>Fun Facts</div>
                        {aiPreview.fun_facts.map((fact, fi) => (
                          <div key={fi} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, paddingLeft: 12, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 0, color: 'var(--cyan)' }}>•</span>
                            {fact}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Schematic */}
                  <div>
                    {aiPreview.schematic_svg && (
                      <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--surface2)', textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ ...labelStyle, marginBottom: 8 }}>Top-Down Schematic</div>
                        <div
                          style={{ maxWidth: 280, margin: '0 auto' }}
                          dangerouslySetInnerHTML={{ __html: aiPreview.schematic_svg }}
                        />
                      </div>
                    )}

                    {/* Manual Section */}
                    {aiPreview.manual_summary ? (
                      <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--surface2)' }}>
                        <div style={{ ...labelStyle, marginBottom: 6 }}>Manual Summary</div>
                        {aiPreview.manual_url && (
                          <a href={aiPreview.manual_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textDecoration: 'none' }}>
                            <ExternalLink size={11} /> View Manual
                          </a>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {aiPreview.manual_summary}
                        </div>
                      </div>
                    ) : (
                      <button style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}
                        onClick={handleFindManual} disabled={aiManualLoading}>
                        <FileText size={14} />
                        {aiManualLoading ? 'Finding Manual...' : 'Find Manual'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--surface2)' }}>
                  <button style={btnSecondary} onClick={() => { setAiPreview(null); setAiQuery('') }}>Search Again</button>
                  <button style={{ ...btnPrimary, background: 'var(--green)' }} onClick={handleAiSave} disabled={aiLoading}>
                    {aiLoading ? 'Saving...' : 'Save to Database'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Fragment helper (React) ────────────────────────────────────────────── */
function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
