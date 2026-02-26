'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileInput, Search, Filter, ChevronDown, User,
  Image as ImageIcon, File, Calendar, AlertCircle,
  CheckCircle, Clock, Inbox, ExternalLink, RefreshCw,
} from 'lucide-react'
import type { Profile } from '@/types'

interface Designer {
  id: string
  name: string | null
  avatar_url: string | null
}

interface Brief {
  id: string
  token: string
  project_id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  design_brief: string | null
  text_content: string | null
  references_notes: string | null
  brand_colors: string | null
  brand_fonts: string | null
  vehicle_photos: string[]
  logo_files: string[]
  removal_required: boolean
  removal_description: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
  project: {
    id: string
    title: string | null
    customer_name: string | null
    form_data: Record<string, any> | null
    designer_id: string | null
  } | null
}

type StatusFilter = 'all' | 'new' | 'in_progress' | 'completed'

interface Props {
  profile: Profile
  designers: Designer[]
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function DesignBriefs({ profile, designers }: Props) {
  const supabase = createClient()

  const [briefs, setBriefs]           = useState<Brief[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<StatusFilter>('all')
  const [selected, setSelected]       = useState<Brief | null>(null)
  const [assigning, setAssigning]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customer_intake')
      .select(`
        *,
        project:project_id(id, title, customer_name, form_data, designer_id)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    setBriefs((data as Brief[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function assignDesigner(briefId: string, projectId: string, designerId: string) {
    setAssigning(briefId)
    await supabase.from('projects').update({ designer_id: designerId }).eq('id', projectId)
    await load()
    setAssigning(null)
  }

  const filtered = briefs.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (b.customer_name ?? '').toLowerCase().includes(q)
      || (b.project?.title ?? '').toLowerCase().includes(q)
      || (b.design_brief ?? '').toLowerCase().includes(q)
    const matchFilter =
      filter === 'all' ? true :
      filter === 'new' ? !b.completed && !b.project?.designer_id :
      filter === 'in_progress' ? !b.completed && !!b.project?.designer_id :
      filter === 'completed' ? b.completed : true
    return matchSearch && matchFilter
  })

  const counts = {
    all: briefs.length,
    new: briefs.filter(b => !b.completed && !b.project?.designer_id).length,
    in_progress: briefs.filter(b => !b.completed && !!b.project?.designer_id).length,
    completed: briefs.filter(b => b.completed).length,
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 100px)', minHeight: 0 }}>
      {/* ── Left: Brief list ───────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {(['all', 'new', 'in_progress', 'completed'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${filter === s ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                background: filter === s ? 'rgba(79,127,255,0.12)' : 'transparent',
                color: filter === s ? 'var(--accent)' : 'var(--text2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {s === 'all' ? 'All' : s === 'new' ? 'New' : s === 'in_progress' ? 'In Progress' : 'Completed'}
              <span style={{
                background: filter === s ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: filter === s ? '#fff' : 'var(--text3)',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: 11,
              }}>
                {counts[s]}
              </span>
            </button>
          ))}
          <button
            onClick={load}
            style={{
              marginLeft: 'auto',
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'var(--text3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search briefs…"
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: 'var(--text1)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Brief cards */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 100, borderRadius: 10, background: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              <Inbox size={36} style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600 }}>No briefs found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {filter !== 'all' ? 'Try a different filter' : 'Design briefs from customer intake forms will appear here'}
              </div>
            </div>
          ) : (
            filtered.map(brief => {
              const isSelected = selected?.id === brief.id
              const photoCount = (brief.vehicle_photos ?? []).length
              const logoCount = (brief.logo_files ?? []).length
              const hasDesigner = !!brief.project?.designer_id
              const designer = designers.find(d => d.id === brief.project?.designer_id)

              return (
                <div
                  key={brief.id}
                  onClick={() => setSelected(isSelected ? null : brief)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Status indicator */}
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: brief.completed ? 'var(--green)' : hasDesigner ? 'var(--amber)' : 'var(--accent)',
                      marginTop: 5,
                      flexShrink: 0,
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
                          {brief.customer_name ?? brief.project?.customer_name ?? 'Unknown Customer'}
                        </span>
                        {brief.project?.title && (
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>· {brief.project.title}</span>
                        )}
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          color: 'var(--text3)',
                          flexShrink: 0,
                        }}>
                          {timeSince(brief.created_at)}
                        </span>
                      </div>

                      {/* Brief preview */}
                      {brief.design_brief && (
                        <p style={{
                          fontSize: 13,
                          color: 'var(--text2)',
                          margin: '0 0 8px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.5,
                        }}>
                          {brief.design_brief}
                        </p>
                      )}

                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {photoCount > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                            <ImageIcon size={11} /> {photoCount} photo{photoCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {logoCount > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                            <File size={11} /> {logoCount} logo{logoCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {brief.removal_required && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: 'var(--amber)', fontWeight: 600,
                          }}>
                            <AlertCircle size={11} /> Removal required
                          </span>
                        )}
                        {brief.brand_colors && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Colors: {brief.brand_colors.slice(0, 30)}{brief.brand_colors.length > 30 ? '…' : ''}</span>
                        )}

                        {/* Designer badge or assign */}
                        {brief.project && (
                          <div style={{ marginLeft: 'auto' }}>
                            {designer ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%',
                                  background: 'var(--accent)', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 700, color: '#fff', overflow: 'hidden',
                                }}>
                                  {designer.avatar_url
                                    ? <img src={designer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : initials(designer.name)}
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text2)' }}>{designer.name}</span>
                              </div>
                            ) : (
                              <select
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  if (e.target.value) assignDesigner(brief.id, brief.project_id, e.target.value)
                                }}
                                defaultValue=""
                                style={{
                                  background: 'var(--surface2)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 6,
                                  color: 'var(--text3)',
                                  fontSize: 11,
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                }}
                                disabled={assigning === brief.id}
                              >
                                <option value="">Assign designer</option>
                                {designers.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: Detail panel ────────────────────────────────────────── */}
      {selected && (
        <div style={{
          width: 360,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>
                {selected.customer_name ?? 'Customer Brief'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Submitted {fmtDate(selected.created_at)}
              </div>
            </div>
            <div style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: selected.completed ? 'rgba(34,192,122,0.12)' : 'rgba(79,127,255,0.12)',
              color: selected.completed ? 'var(--green)' : 'var(--accent)',
            }}>
              {selected.completed ? 'Completed' : selected.project?.designer_id ? 'In Progress' : 'New'}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Contact info */}
            <Section title="Contact">
              {selected.customer_email && <Row label="Email" value={selected.customer_email} />}
              {selected.customer_phone && <Row label="Phone" value={selected.customer_phone} />}
              {selected.project?.title && <Row label="Project" value={selected.project.title} />}
            </Section>

            {/* Design brief */}
            {selected.design_brief && (
              <Section title="Design Brief">
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                  {selected.design_brief}
                </p>
              </Section>
            )}

            {/* Text content */}
            {selected.text_content && (
              <Section title="Text Content">
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                  {selected.text_content}
                </p>
              </Section>
            )}

            {/* References */}
            {selected.references_notes && (
              <Section title="References & Notes">
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                  {selected.references_notes}
                </p>
              </Section>
            )}

            {/* Brand */}
            {(selected.brand_colors || selected.brand_fonts) && (
              <Section title="Brand Details">
                {selected.brand_colors && <Row label="Colors" value={selected.brand_colors} />}
                {selected.brand_fonts && <Row label="Fonts" value={selected.brand_fonts} />}
              </Section>
            )}

            {/* Vehicle photos */}
            {(selected.vehicle_photos ?? []).length > 0 && (
              <Section title={`Vehicle Photos (${(selected.vehicle_photos ?? []).length})`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {(selected.vehicle_photos ?? []).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Vehicle ${i + 1}`}
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Logo files */}
            {(selected.logo_files ?? []).length > 0 && (
              <Section title={`Logo Files (${(selected.logo_files ?? []).length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(selected.logo_files ?? []).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: 'var(--surface2)',
                        color: 'var(--accent)',
                        fontSize: 12,
                        textDecoration: 'none',
                      }}
                    >
                      <File size={13} />
                      Logo file {i + 1}
                      <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* Removal */}
            {selected.removal_required && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(242,90,90,0.08)',
                border: '1px solid rgba(242,90,90,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={14} color="var(--red)" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>Removal Required</div>
                  {selected.removal_description && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{selected.removal_description}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer action */}
          {selected.project && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <a
                href={`/projects/${selected.project_id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 0',
                  borderRadius: 8,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} />
                Open Project
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', width: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text1)', flex: 1, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
