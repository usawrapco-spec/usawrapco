'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, X, ChevronRight, Camera, Shield,
  ExternalLink, FolderPlus, RefreshCw, ZoomIn, Loader2,
} from 'lucide-react'
import Link from 'next/link'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

interface MaintenanceTicket {
  id: string; ticket_token: string; ticket_type: string; status: string; priority: string
  subject: string; description: string | null; photos: string[]
  ai_assessment: string | null; ai_severity: string | null; ai_recommended_action: string | null
  internal_notes: string | null; is_warranty_eligible: boolean; warranty_expiry: string | null
  vehicle_year: string | null; vehicle_make: string | null; vehicle_model: string | null
  affected_areas: string[] | null; install_date: string | null
  estimated_repair_cost: number | null; resolution_notes: string | null
  resolved_at: string | null; customer_rating: number | null; created_at: string; updated_at: string
  customer: { id: string; name: string; email: string; phone: string | null } | null
  project: { id: string; title: string; vehicle_desc: string | null } | null
  assignee: { id: string; name: string; avatar_url: string | null } | null
}

interface Profile { id: string; name: string; role: string }

const STATUS_COLORS: Record<string, string> = {
  open: C.amber, reviewing: C.cyan, scheduled: C.accent,
  in_progress: C.purple, resolved: C.green, declined: C.red,
}
const PRIORITY_COLORS: Record<string, string> = {
  low: C.text3, normal: C.text2, high: C.amber, urgent: C.red,
}
const SEVERITY_COLORS: Record<string, string> = {
  minor: C.green, moderate: C.amber, significant: C.red, warranty_eligible: C.green,
}
const STATUSES = ['open', 'reviewing', 'scheduled', 'in_progress', 'resolved', 'declined']

function chip(text: string, color: string) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${color}20`, color, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
      {text.replace('_', ' ').toUpperCase()}
    </span>
  )
}
function fmt(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function fmtTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return fmt(d)
}

export default function MaintenanceClient({ profile }: { profile: Profile | null }) {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<MaintenanceTicket | null>(null)
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [notesEdit, setNotesEdit] = useState('')
  const [resolution, setResolution] = useState('')

  const loadTickets = useCallback(async () => {
    setLoading(true)
    const qs = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
    const res = await fetch(`/api/portal/maintenance${qs}`)
    const data = await res.json()
    setTickets(data.tickets || [])
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { loadTickets() }, [loadTickets])

  async function updateTicket(id: string, updates: Record<string, unknown>) {
    setUpdating(true)
    await fetch('/api/portal/maintenance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    await loadTickets()
    if (selected?.id === id) setSelected(t => t ? { ...t, ...updates } as MaintenanceTicket : t)
    setUpdating(false)
  }

  const counts = STATUSES.reduce((acc, s) => { acc[s] = tickets.filter(t => t.status === s).length; return acc }, {} as Record<string, number>)
  const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text1, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Photo lightbox */}
      {photoLightbox && (
        <div onClick={() => setPhotoLightbox(null)} style={{ position: 'fixed', inset: 0, background: '#000000e0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={photoLightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setPhotoLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: '#ffffff20', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={22} />
          </button>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 40 }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 540, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 50, overflow: 'auto', maxWidth: '100vw' }}>
            {/* Panel header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: C.surface, zIndex: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: C.text1, marginBottom: 8 }}>{selected.subject}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {chip(selected.status, STATUS_COLORS[selected.status] || C.text2)}
                  {chip(selected.priority + ' priority', PRIORITY_COLORS[selected.priority] || C.text2)}
                  {selected.is_warranty_eligible && chip('Warranty eligible', C.green)}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 4 }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Customer + Vehicle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 14, background: C.surface2, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: C.text3, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>CUSTOMER</div>
                  <div style={{ fontWeight: 700, color: C.text1 }}>{selected.customer?.name || '—'}</div>
                  <div style={{ fontSize: 13, color: C.text2 }}>{selected.customer?.email}</div>
                  {selected.customer?.phone && <div style={{ fontSize: 13, color: C.text2 }}>{selected.customer.phone}</div>}
                </div>
                <div style={{ padding: 14, background: C.surface2, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: C.text3, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>VEHICLE</div>
                  <div style={{ fontWeight: 700, color: C.text1 }}>{[selected.vehicle_year, selected.vehicle_make, selected.vehicle_model].filter(Boolean).join(' ') || '—'}</div>
                  {selected.install_date && <div style={{ fontSize: 13, color: C.text2 }}>Installed: {fmt(selected.install_date)}</div>}
                  {selected.warranty_expiry && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Shield size={12} color={new Date() < new Date(selected.warranty_expiry) ? C.green : C.text3} />
                      <span style={{ fontSize: 12, color: new Date() < new Date(selected.warranty_expiry) ? C.green : C.text3 }}>
                        Warranty until {fmt(selected.warranty_expiry)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Assessment */}
              {selected.ai_assessment && (
                <div style={{ padding: 16, background: `${SEVERITY_COLORS[selected.ai_severity || ''] || C.accent}10`, border: `1px solid ${SEVERITY_COLORS[selected.ai_severity || ''] || C.accent}30`, borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5 }}>AI ASSESSMENT</div>
                    {selected.ai_severity && chip(selected.ai_severity.replace('_', ' '), SEVERITY_COLORS[selected.ai_severity] || C.text2)}
                  </div>
                  <div style={{ color: C.text1, lineHeight: 1.6, marginBottom: selected.ai_recommended_action ? 12 : 0 }}>{selected.ai_assessment}</div>
                  {selected.ai_recommended_action && (
                    <div style={{ padding: '10px 12px', background: C.surface, borderRadius: 8, color: C.text2, fontSize: 14 }}>
                      <span style={{ color: C.text3, fontWeight: 600 }}>Recommended: </span>{selected.ai_recommended_action}
                    </div>
                  )}
                </div>
              )}

              {/* Photos */}
              {selected.photos?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5, marginBottom: 10 }}>CUSTOMER PHOTOS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {selected.photos.map((url, i) => (
                      <div key={i} onClick={() => setPhotoLightbox(url)} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative', background: C.surface2 }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: '#00000060', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          <ZoomIn size={20} color="#fff" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5, marginBottom: 8 }}>CUSTOMER DESCRIPTION</div>
                  <div style={{ color: C.text2, lineHeight: 1.6, padding: '12px 14px', background: C.surface2, borderRadius: 10 }}>{selected.description}</div>
                </div>
              )}

              {/* Affected areas */}
              {selected.affected_areas && selected.affected_areas.length > 0 && (
                <div style={{ marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.affected_areas.map(a => (
                    <span key={a} style={{ padding: '4px 10px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 12, color: C.text2 }}>{a}</span>
                  ))}
                </div>
              )}

              {/* Status control */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5, marginBottom: 10 }}>UPDATE STATUS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUSES.map(s => {
                    const active = selected.status === s
                    const color = STATUS_COLORS[s] || C.text2
                    return (
                      <button key={s} onClick={() => updateTicket(selected.id, { status: s })} disabled={updating}
                        style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${active ? color : C.border}`, background: active ? `${color}20` : C.surface2, color: active ? color : C.text2, cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400 }}>
                        {s.replace('_', ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Resolution notes (shown when resolved) */}
              {selected.status === 'resolved' && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5, marginBottom: 8 }}>RESOLUTION NOTES</div>
                  <textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how this was resolved…"
                    style={{ width: '100%', minHeight: 80, padding: '10px 12px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => updateTicket(selected.id, { resolution_notes: resolution })} disabled={updating}
                    style={{ marginTop: 8, padding: '8px 16px', background: C.green, color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    Save Resolution
                  </button>
                </div>
              )}

              {/* Internal notes */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5, marginBottom: 8 }}>INTERNAL NOTES</div>
                <textarea value={notesEdit} onChange={e => setNotesEdit(e.target.value)} placeholder="Add private notes visible only to staff…"
                  style={{ width: '100%', minHeight: 80, padding: '10px 12px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => updateTicket(selected.id, { internal_notes: notesEdit })} disabled={updating}
                  style={{ marginTop: 8, padding: '8px 16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.text2, fontWeight: 600, fontSize: 13 }}>
                  Save Notes
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.project && (
                  <Link href={`/projects/${selected.project.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text1, textDecoration: 'none' }}>
                    <ExternalLink size={18} color={C.accent} />
                    <div>
                      <div style={{ fontWeight: 600 }}>View Original Job</div>
                      <div style={{ fontSize: 13, color: C.text2 }}>{selected.project.title}</div>
                    </div>
                  </Link>
                )}
                <Link
                  href={`/estimates/new?customer_id=${selected.customer?.id || ''}&vehicle=${encodeURIComponent([selected.vehicle_year, selected.vehicle_make, selected.vehicle_model].filter(Boolean).join(' '))}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: `${C.accent}15`, border: `1px solid ${C.accent}40`, borderRadius: 12, color: C.accent, textDecoration: 'none' }}>
                  <FolderPlus size={18} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Create Job From Ticket</div>
                    <div style={{ fontSize: 13, color: C.text2 }}>Pre-fills vehicle + customer info</div>
                  </div>
                </Link>
              </div>

              <div style={{ marginTop: 20, fontSize: 12, color: C.text3, textAlign: 'center' }}>
                Submitted {fmtTime(selected.created_at)} · #{selected.ticket_token?.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22, color: C.text1 }}>Maintenance Tickets</div>
          <div style={{ fontSize: 13, color: C.text2 }}>{tickets.length} total</div>
        </div>
        <button onClick={loadTickets} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.text2, fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {['all', ...STATUSES].map(s => {
            const count = s === 'all' ? tickets.length : counts[s] || 0
            const active = filterStatus === s
            const color = s === 'all' ? C.accent : STATUS_COLORS[s] || C.text2
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1px solid ${active ? color : C.border}`, background: active ? `${color}20` : C.surface2, color: active ? color : C.text2, cursor: 'pointer', fontWeight: active ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap' }}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
                <span style={{ background: active ? `${color}30` : C.surface, padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: active ? color : C.text3 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Tickets */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Loader2 size={32} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: C.text3 }}>
            <CheckCircle2 size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div style={{ fontSize: 18, fontWeight: 600 }}>No tickets</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              {filterStatus === 'all' ? 'Customers submit maintenance requests through their portal.' : `No ${filterStatus.replace('_', ' ')} tickets.`}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(t => {
              const sc = STATUS_COLORS[t.status] || C.text2
              const pc = PRIORITY_COLORS[t.priority] || C.text2
              const sevc = SEVERITY_COLORS[t.ai_severity || ''] || C.text2
              return (
                <div key={t.id} onClick={() => { setSelected(t); setNotesEdit(t.internal_notes || ''); setResolution(t.resolution_notes || '') }}
                  style={{ padding: '16px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', gap: 14, alignItems: 'flex-start' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = `${C.accent}60`)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = C.border)}>
                  {/* Priority bar */}
                  <div style={{ width: 4, borderRadius: 2, background: pc, alignSelf: 'stretch', flexShrink: 0 }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.text1, marginBottom: 2 }}>{t.subject}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {t.customer && <span style={{ fontSize: 13, color: C.text2 }}>{t.customer.name}</span>}
                          {(t.vehicle_year || t.vehicle_make) && (
                            <span style={{ fontSize: 13, color: C.text3 }}>· {[t.vehicle_year, t.vehicle_make, t.vehicle_model].filter(Boolean).join(' ')}</span>
                          )}
                          <span style={{ fontSize: 12, color: C.text3 }}>{fmtTime(t.created_at)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                        {chip(t.status, sc)}
                        {t.is_warranty_eligible && <Shield size={16} color={C.green} title="Warranty eligible" />}
                      </div>
                    </div>

                    {t.ai_assessment && (
                      <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.ai_assessment}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {t.ai_severity && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${sevc}20`, color: sevc }}>
                          {t.ai_severity.replace('_', ' ')}
                        </span>
                      )}
                      {t.photos?.length > 0 && (
                        <span style={{ fontSize: 12, color: C.text3, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Camera size={12} /> {t.photos.length} photo{t.photos.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} color={C.text3} style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
