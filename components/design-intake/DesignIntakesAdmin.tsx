'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import Link from 'next/link'
import {
  Palette, Search, Clock, CheckCircle, ExternalLink,
  ChevronRight, X, MessageSquare, User, Briefcase,
} from 'lucide-react'

interface IntakeSession {
  id: string
  token: string
  project_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  business_name: string | null
  services_selected: string[]
  vehicle_data: Record<string, unknown>
  brand_data: Record<string, unknown>
  style_preference: string | null
  ai_chat_history: { role: string; content: string; timestamp: string }[]
  completed: boolean
  completed_at: string | null
  created_at: string
}

const SERVICE_LABELS: Record<string, string> = {
  vehicle_wrap: 'Vehicle Wrap',
  commercial_fleet: 'Fleet',
  trailer_wrap: 'Trailer',
  marine_boat: 'Marine',
  storefront_signage: 'Signage',
  branded_apparel: 'Apparel',
  logo_design: 'Logo',
  brand_package: 'Brand Package',
  social_media_kit: 'Social Media',
  print_materials: 'Print',
  something_else: 'Other',
}

export default function DesignIntakesAdmin({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [sessions, setSessions] = useState<IntakeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')

  useEffect(() => {
    supabase.from('design_intake_sessions')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions(data || [])
        setLoading(false)
      })
  }, [profile.org_id])

  const filtered = sessions.filter(s => {
    if (filter === 'completed' && !s.completed) return false
    if (filter === 'pending' && s.completed) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.contact_name?.toLowerCase().includes(q) ||
        s.business_name?.toLowerCase().includes(q) ||
        s.contact_email?.toLowerCase().includes(q)
      )
    }
    return true
  })

  function relTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Palette size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28, fontWeight: 900, color: 'var(--text1)',
          }}>
            Design Intakes
          </h1>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {sessions.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)', pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, business, email..."
            style={{
              width: '100%', padding: '9px 14px 9px 34px', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text1)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        {(['all', 'completed', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: filter === f ? 'rgba(79,127,255,0.08)' : 'transparent',
              color: filter === f ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          background: 'var(--surface)', borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          <Palette size={40} style={{ color: 'var(--text3)', marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
            No design intakes yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Send a design intake link from the Sales dropdown to get started
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--border)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.5fr 100px 100px 40px',
            gap: 0, padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>Name</span>
            <span>Business</span>
            <span>Services</span>
            <span>Status</span>
            <span>Date</span>
            <span />
          </div>

          {/* Rows */}
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.5fr 100px 100px 40px',
                gap: 0, padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'none', border: 'none', width: '100%',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.contact_name || 'Unknown'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.business_name || '-'}
              </span>
              <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(s.services_selected || []).slice(0, 3).map(svc => (
                  <span key={svc} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(79,127,255,0.08)', color: 'var(--accent)',
                  }}>
                    {SERVICE_LABELS[svc] || svc}
                  </span>
                ))}
                {(s.services_selected || []).length > 3 && (
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>+{s.services_selected.length - 3}</span>
                )}
              </span>
              <span>
                {s.completed ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>
                    <CheckCircle size={12} /> Done
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--amber)' }}>
                    <Clock size={12} /> Pending
                  </span>
                )}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {relTime(s.created_at)}
              </span>
              <span>
                <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedSession && (
        <IntakeDetailDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  )
}

function IntakeDetailDrawer({ session, onClose }: { session: IntakeSession; onClose: () => void }) {
  const [tab, setTab] = useState<'summary' | 'chat'>('summary')

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560, height: '100%',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
              {session.contact_name || 'Unknown'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {session.business_name || session.contact_email || 'No details'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {session.project_id && (
              <Link
                href={`/projects/${session.project_id}`}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'rgba(79,127,255,0.08)', color: 'var(--accent)',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Briefcase size={12} /> Open Project
              </Link>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {(['summary', 'chat'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', fontSize: 13, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--accent)' : 'var(--text3)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                textTransform: 'capitalize',
              }}
            >
              {t === 'chat' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MessageSquare size={14} /> AI Chat ({(session.ai_chat_history || []).length})
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <User size={14} /> Summary
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'summary' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Section title="Contact">
                <Field label="Name" value={session.contact_name} />
                <Field label="Email" value={session.contact_email} />
                <Field label="Phone" value={session.contact_phone} />
                <Field label="Business" value={session.business_name} />
              </Section>

              <Section title="Services">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(session.services_selected || []).map(s => (
                    <span key={s} style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                      background: 'rgba(79,127,255,0.08)', color: 'var(--accent)',
                    }}>
                      {SERVICE_LABELS[s] || s}
                    </span>
                  ))}
                </div>
              </Section>

              {session.vehicle_data && Object.keys(session.vehicle_data).length > 0 && (
                <Section title="Vehicle">
                  {Object.entries(session.vehicle_data).map(([k, v]) => (
                    <Field key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                  ))}
                </Section>
              )}

              {session.brand_data && Object.keys(session.brand_data).length > 0 && (
                <Section title="Brand">
                  {Object.entries(session.brand_data).map(([k, v]) => {
                    if (k === 'colors' && Array.isArray(v)) {
                      return (
                        <div key={k} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 80, textTransform: 'capitalize' }}>Colors</span>
                          {v.map(c => (
                            <div key={String(c)} style={{ width: 20, height: 20, borderRadius: 4, background: String(c), border: '1px solid rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                      )
                    }
                    return <Field key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                  })}
                </Section>
              )}

              {session.style_preference && (
                <Section title="Style">
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', textTransform: 'capitalize' }}>
                    {session.style_preference.replace(/_/g, ' ')}
                  </span>
                </Section>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(session.ai_chat_history || []).length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  No AI chat history
                </div>
              ) : (
                session.ai_chat_history.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '85%', padding: '10px 14px', borderRadius: 14,
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text1)',
                      fontSize: 13, lineHeight: 1.5,
                      borderBottomRightRadius: msg.role === 'user' ? 4 : 14,
                      borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 14,
                    }}>
                      {msg.content}
                      <div style={{
                        fontSize: 10, color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : 'var(--text3)',
                        marginTop: 4,
                      }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 12, padding: 16,
      border: '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 80, textTransform: 'capitalize' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
