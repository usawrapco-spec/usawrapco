'use client'

import { useState, useEffect } from 'react'
import {
  Heart, Loader2, Palette, Filter, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronRight, Download, Image as ImageIcon,
} from 'lucide-react'
import { format } from 'date-fns'

interface MockupRender {
  id: string
  status: string
  output_type: string
  company_name: string
  concept_a_url: string | null
  concept_b_url: string | null
  concept_c_url: string | null
  concept_d_url: string | null
  concept_e_url: string | null
  concept_f_url: string | null
  selected_concept: string | null
  final_mockup_url: string | null
  upscaled_url: string | null
  print_url: string | null
  created_at: string
  current_step: number
  step_name: string
}

interface SavedRender {
  id: string
  mockup_result_id: string | null
  image_url: string
  label: string | null
  source: string
  metadata: Record<string, unknown>
  created_at: string
}

interface ActivityEntry {
  id: string
  action: string
  details: string
  metadata: Record<string, unknown>
  actor_type: string
  created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  concepts_ready: { bg: 'rgba(79,127,255,0.15)', color: 'var(--accent)', label: 'Concepts Ready' },
  concept_ready: { bg: 'rgba(34,192,122,0.15)', color: 'var(--green)', label: 'Selected' },
  complete: { bg: 'rgba(34,192,122,0.15)', color: 'var(--green)', label: 'Complete' },
  processing: { bg: 'rgba(245,158,11,0.15)', color: 'var(--amber)', label: 'Processing' },
  failed: { bg: 'rgba(242,90,90,0.15)', color: 'var(--red)', label: 'Failed' },
  approving: { bg: 'rgba(34,211,238,0.15)', color: 'var(--cyan)', label: 'Approving' },
}

const ACTION_LABELS: Record<string, { icon: typeof Palette; color: string; label: string }> = {
  mockup_concepts_generated: { icon: Palette, color: 'var(--accent)', label: 'Concepts Generated' },
  concept_selected: { icon: CheckCircle2, color: 'var(--cyan)', label: 'Concept Selected' },
  mockup_approved: { icon: CheckCircle2, color: 'var(--green)', label: 'Mockup Approved' },
  mockup_generation_failed: { icon: XCircle, color: 'var(--red)', label: 'Generation Failed' },
  render_saved: { icon: Heart, color: 'var(--red)', label: 'Render Saved' },
}

export default function CustomerDesignsTab({ customerId, orgId }: { customerId: string; orgId: string }) {
  const [renders, setRenders] = useState<MockupRender[]>([])
  const [saved, setSaved] = useState<SavedRender[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'wrap' | 'signage'>('all')
  const [expandedRender, setExpandedRender] = useState<string | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [savingUrl, setSavingUrl] = useState<string | null>(null)

  const savedUrls = new Set(saved.map(s => s.image_url))

  useEffect(() => {
    fetch(`/api/customers/${customerId}/renders`)
      .then(r => r.json())
      .then(data => {
        setRenders(data.renders || [])
        setSaved(data.saved || [])
        setActivity(data.activity || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [customerId])

  const filteredRenders = renders.filter(r =>
    filterType === 'all' || r.output_type === filterType
  )

  async function toggleSave(render: MockupRender, imageUrl: string, label: string) {
    if (savedUrls.has(imageUrl)) {
      const savedItem = saved.find(s => s.image_url === imageUrl)
      if (!savedItem) return
      setSavingUrl(imageUrl)
      await fetch(`/api/customers/${customerId}/renders/save`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: savedItem.id }),
      })
      setSaved(prev => prev.filter(s => s.id !== savedItem.id))
      setSavingUrl(null)
    } else {
      setSavingUrl(imageUrl)
      const res = await fetch(`/api/customers/${customerId}/renders/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockup_result_id: render.id,
          image_url: imageUrl,
          label,
          metadata: { output_type: render.output_type, company_name: render.company_name },
        }),
      })
      const data = await res.json()
      if (data.saved) setSaved(prev => [data.saved, ...prev])
      setSavingUrl(null)
    }
  }

  function getConceptUrls(r: MockupRender) {
    const concepts: { slot: string; url: string; label: string }[] = []
    if (r.concept_a_url) concepts.push({ slot: 'a', url: r.concept_a_url, label: 'Concept A' })
    if (r.concept_b_url) concepts.push({ slot: 'b', url: r.concept_b_url, label: 'Concept B' })
    if (r.concept_c_url) concepts.push({ slot: 'c', url: r.concept_c_url, label: 'Concept C' })
    if (r.concept_d_url) concepts.push({ slot: 'd', url: r.concept_d_url, label: 'Concept D' })
    if (r.concept_e_url) concepts.push({ slot: 'e', url: r.concept_e_url, label: 'Concept E' })
    if (r.concept_f_url) concepts.push({ slot: 'f', url: r.concept_f_url, label: 'Concept F' })
    return concepts
  }

  function getDisplayUrl(r: MockupRender) {
    return r.final_mockup_url || r.upscaled_url || r.concept_a_url || ''
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
      <Loader2 size={24} className="animate-spin" style={{ opacity: 0.5, display: 'block', margin: '0 auto 8px' }} />
      Loading designs...
    </div>
  )

  if (!renders.length && !saved.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
      <Palette size={40} style={{ opacity: 0.25, display: 'block', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 15, fontWeight: 600 }}>No designs yet</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Mockups and renders for this customer will appear here.</div>
    </div>
  )

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
    background: active ? 'var(--accent)' : 'var(--surface2)',
    color: active ? '#fff' : 'var(--text2)',
  })

  return (
    <div>
      {/* ── Saved Renders ─────────────────────────────────────────────────── */}
      {saved.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={12} style={{ color: 'var(--red)' }} fill="var(--red)" />
            Saved Renders ({saved.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {saved.map(s => (
              <div
                key={s.id}
                style={{
                  position: 'relative', borderRadius: 10, overflow: 'hidden',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: 'var(--surface2)',
                }}
              >
                <img
                  src={s.image_url}
                  alt={s.label || 'Saved render'}
                  onClick={() => setLightbox(s.image_url)}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                />
                <button
                  onClick={() => {
                    const mockup = renders.find(r => r.id === s.mockup_result_id)
                    if (mockup) toggleSave(mockup, s.image_url, s.label || '')
                  }}
                  style={{
                    position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)',
                    border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Heart size={14} fill="var(--red)" style={{ color: 'var(--red)' }} />
                </button>
                {s.label && (
                  <div style={{ padding: '6px 8px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} style={{ color: 'var(--text3)' }} />
        <button onClick={() => setFilterType('all')} style={chipStyle(filterType === 'all')}>
          All ({renders.length})
        </button>
        <button onClick={() => setFilterType('wrap')} style={chipStyle(filterType === 'wrap')}>
          Wraps
        </button>
        <button onClick={() => setFilterType('signage')} style={chipStyle(filterType === 'signage')}>
          Signage
        </button>
      </div>

      {/* ── All Render History ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredRenders.map(render => {
          const concepts = getConceptUrls(render)
          const displayUrl = getDisplayUrl(render)
          const statusInfo = STATUS_COLORS[render.status] || STATUS_COLORS.processing
          const isExpanded = expandedRender === render.id

          return (
            <div
              key={render.id}
              style={{
                border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
                background: 'var(--card-bg)',
              }}
            >
              {/* Header row */}
              <div
                onClick={() => setExpandedRender(isExpanded ? null : render.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt=""
                    style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 56, height: 42, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={18} style={{ color: 'var(--text3)', opacity: 0.4 }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {render.company_name || 'Untitled Design'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {format(new Date(render.created_at), 'MMM d, yyyy h:mm a')} &middot; {render.output_type}
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: statusInfo.bg, color: statusInfo.color,
                  textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
                }}>
                  {statusInfo.label}
                </span>
                {render.selected_concept && (
                  <span style={{
                    padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                    background: 'rgba(34,211,238,0.12)', color: 'var(--cyan)',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {render.selected_concept.toUpperCase()}
                  </span>
                )}
                {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--text3)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text3)' }} />}
              </div>

              {/* Expanded concepts grid */}
              {isExpanded && concepts.length > 0 && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', margin: '12px 0 8px', letterSpacing: '0.05em' }}>
                    All Concepts ({concepts.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                    {concepts.map(c => (
                      <div
                        key={c.slot}
                        style={{
                          position: 'relative', borderRadius: 8, overflow: 'hidden',
                          border: render.selected_concept === c.slot ? '2px solid var(--accent)' : '1px solid var(--border)',
                        }}
                      >
                        <img
                          src={c.url}
                          alt={c.label}
                          onClick={() => setLightbox(c.url)}
                          style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: render.selected_concept === c.slot ? 'var(--accent)' : 'var(--text3)' }}>
                            {c.label}
                            {render.selected_concept === c.slot && ' ✓'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSave(render, c.url, `${render.company_name || 'Design'} — ${c.label}`) }}
                            disabled={savingUrl === c.url}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                          >
                            <Heart
                              size={13}
                              fill={savedUrls.has(c.url) ? 'var(--red)' : 'none'}
                              style={{ color: savedUrls.has(c.url) ? 'var(--red)' : 'var(--text3)' }}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Final / Upscaled / Print links */}
                  {(render.final_mockup_url || render.upscaled_url || render.print_url) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {render.final_mockup_url && (
                        <a href={render.final_mockup_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <Download size={12} /> Final
                        </a>
                      )}
                      {render.upscaled_url && (
                        <a href={render.upscaled_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <Download size={12} /> Upscaled
                        </a>
                      )}
                      {render.print_url && (
                        <a href={render.print_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                          <Download size={12} /> Print-Ready PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Design Journey Timeline ───────────────────────────────────────── */}
      {activity.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none',
              border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800,
              color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: 0, marginBottom: showTimeline ? 10 : 0,
            }}
          >
            {showTimeline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Clock size={12} />
            Design Journey ({activity.length})
          </button>
          {showTimeline && (
            <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activity.map(a => {
                const info = ACTION_LABELS[a.action] || { icon: Clock, color: 'var(--text3)', label: a.action }
                const Icon = info.icon
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ marginTop: 2, flexShrink: 0, marginLeft: -25, width: 16, height: 16, borderRadius: '50%', background: 'var(--card-bg)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={9} style={{ color: info.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{info.label}</div>
                      {a.details && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.details}</div>}
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, opacity: 0.7 }}>
                        {format(new Date(a.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt="Preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  )
}
