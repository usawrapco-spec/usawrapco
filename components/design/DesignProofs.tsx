'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle, Clock, AlertTriangle, RefreshCw,
  ExternalLink, Send, Eye, RotateCcw, Layers,
  ChevronDown, MessageSquare,
} from 'lucide-react'
import type { Profile } from '@/types'

interface Proof {
  id: string
  project_id: string
  version_number: number
  image_url: string
  thumbnail_url: string | null
  designer_notes: string | null
  customer_status: string
  customer_feedback: string | null
  customer_approved_at: string | null
  sent_at: string
  project: {
    id: string
    title: string | null
    form_data: Record<string, any> | null
  } | null
}

interface DesignProject {
  id: string
  title: string | null
  client_name: string | null
  status: string
  vehicle_type: string | null
  created_at: string
  updated_at: string
  portal_token: string | null
  designer_id: string | null
  designer: { id: string; name: string | null; avatar_url: string | null } | null
}

type Tab = 'pending' | 'approved' | 'revision' | 'all'

interface Props {
  profile: Profile
  proofs: Proof[]
  designProjects: DesignProject[]
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    pending:           { label: 'Pending',          color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)',  icon: Clock },
    approved:          { label: 'Approved',          color: 'var(--green)',  bg: 'rgba(34,192,122,0.12)', icon: CheckCircle },
    revision_requested:{ label: 'Needs Revision',    color: 'var(--red)',    bg: 'rgba(242,90,90,0.12)',  icon: AlertTriangle },
    proof_sent:        { label: 'Proof Sent',        color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.1)',  icon: Send },
    revision:          { label: 'Revision',          color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)',  icon: RotateCcw },
  }
  const cfg = map[status] ?? { label: status, color: 'var(--text3)', bg: 'var(--surface2)', icon: Clock }
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 600,
    }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

export function DesignProofs({ profile, proofs: initialProofs, designProjects: initialProjects }: Props) {
  const supabase = createClient()

  const [tab, setTab]                     = useState<Tab>('pending')
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null)
  const [sending, setSending]             = useState<string | null>(null)
  const [sent, setSent]                   = useState<string | null>(null)

  // Stats
  const pendingProofs = initialProofs.filter(p => p.customer_status === 'pending')
  const approvedProofs = initialProofs.filter(p => p.customer_status === 'approved')
  const revisionProofs = initialProofs.filter(p => p.customer_status === 'revision_requested')

  // Design projects awaiting proof or in revision
  const pendingProjects = initialProjects.filter(p => p.status === 'proof_sent')
  const revisionProjects = initialProjects.filter(p => p.status === 'revision')

  const stats = [
    { label: 'Proofs Sent',   value: initialProofs.length,  color: 'var(--cyan)' },
    { label: 'Pending',       value: pendingProofs.length,  color: 'var(--amber)' },
    { label: 'Approved',      value: approvedProofs.length, color: 'var(--green)' },
    { label: 'Need Revision', value: revisionProofs.length, color: 'var(--red)' },
  ]

  async function sendReminder(proof: Proof) {
    // Just shows a "sent" flash — real reminder would email the customer
    setSending(proof.id)
    await new Promise(r => setTimeout(r, 800))
    setSending(null)
    setSent(proof.id)
    setTimeout(() => setSent(null), 2500)
  }

  const filteredProofs = initialProofs.filter(p =>
    tab === 'all' ? true :
    tab === 'pending' ? p.customer_status === 'pending' :
    tab === 'approved' ? p.customer_status === 'approved' :
    tab === 'revision' ? p.customer_status === 'revision_requested' : true
  )

  const filteredProjects = initialProjects.filter(p =>
    tab === 'pending' ? p.status === 'proof_sent' :
    tab === 'revision' ? p.status === 'revision' :
    tab === 'all' ? true : false
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            borderRadius: 10,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        {([
          { id: 'pending',  label: 'Pending',       count: pendingProofs.length + pendingProjects.length },
          { id: 'revision', label: 'Need Revision',  count: revisionProofs.length + revisionProjects.length },
          { id: 'approved', label: 'Approved',       count: approvedProofs.length },
          { id: 'all',      label: 'All',            count: initialProofs.length },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--text1)' : 'var(--text3)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: tab === t.id ? '#fff' : 'var(--text3)',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: 11,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Design projects section (no formal proof yet) ───────────────── */}
      {filteredProjects.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Design Projects
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredProjects.map(proj => (
              <div key={proj.id} style={{
                padding: 14,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                {/* Vehicle type color block */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'var(--surface2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Layers size={18} color="var(--accent)" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
                      {proj.title ?? proj.client_name ?? 'Untitled Design'}
                    </span>
                    <StatusBadge status={proj.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text3)' }}>
                    {proj.client_name && <span>{proj.client_name}</span>}
                    {proj.vehicle_type && <span>· {proj.vehicle_type.replace(/_/g, ' ')}</span>}
                    <span>· Updated {timeSince(proj.updated_at)}</span>
                    {proj.designer && <span>· {proj.designer.name}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {proj.portal_token && (
                    <a
                      href={`/portal/${proj.portal_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: 'var(--text2)',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={12} />
                      Portal
                    </a>
                  )}
                  <a
                    href={`/design/${proj.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 7,
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} />
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Formal proofs section ─────────────────────────────────────── */}
      {(filteredProofs.length > 0 || filteredProjects.length === 0) && (
        <div>
          {filteredProjects.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Formal Proofs
            </div>
          )}

          {filteredProofs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              <CheckCircle size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontWeight: 600 }}>
                {tab === 'pending' ? 'No pending proofs' :
                 tab === 'approved' ? 'No approved proofs yet' :
                 tab === 'revision' ? 'No revision requests' :
                 'No proofs sent yet'}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {tab === 'pending' ? 'All caught up!' : 'Proofs sent to customers will appear here'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredProofs.map(proof => (
                <div key={proof.id} style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--surface)',
                  border: `1px solid ${selectedProof?.id === proof.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 56,
                      height: 42,
                      borderRadius: 6,
                      background: 'var(--surface2)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {(proof.thumbnail_url ?? proof.image_url) && (
                        <img
                          src={proof.thumbnail_url ?? proof.image_url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
                          {proof.project?.title ?? 'Design Proof'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>v{proof.version_number}</span>
                        <StatusBadge status={proof.customer_status} />
                        <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                          {timeSince(proof.sent_at)}
                        </span>
                      </div>

                      {/* Designer notes */}
                      {proof.designer_notes && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 6px', lineHeight: 1.5 }}>
                          {proof.designer_notes}
                        </p>
                      )}

                      {/* Customer feedback (revision) */}
                      {proof.customer_feedback && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: 'rgba(242,90,90,0.06)',
                          border: '1px solid rgba(242,90,90,0.15)',
                          marginTop: 6,
                        }}>
                          <MessageSquare size={12} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                            {proof.customer_feedback}
                          </span>
                        </div>
                      )}

                      {/* Approved info */}
                      {proof.customer_status === 'approved' && proof.customer_approved_at && (
                        <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} />
                          Approved {timeSince(proof.customer_approved_at)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {proof.customer_status === 'pending' && (
                        <button
                          onClick={() => sendReminder(proof)}
                          disabled={sending === proof.id || sent === proof.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 10px',
                            borderRadius: 7,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: sent === proof.id ? 'rgba(34,192,122,0.1)' : 'transparent',
                            color: sent === proof.id ? 'var(--green)' : 'var(--text2)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Send size={11} />
                          {sent === proof.id ? 'Sent!' : sending === proof.id ? '…' : 'Remind'}
                        </button>
                      )}
                      <a
                        href={proof.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 10px',
                          borderRadius: 7,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'transparent',
                          color: 'var(--text2)',
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <Eye size={11} />
                        View
                      </a>
                      {proof.project_id && (
                        <a
                          href={`/projects/${proof.project_id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 10px',
                            borderRadius: 7,
                            background: 'var(--accent)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={11} />
                          Job
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
