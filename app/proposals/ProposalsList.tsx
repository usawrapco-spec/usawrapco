'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Send, Eye, CheckCircle, XCircle, Clock, FileText, ChevronRight } from 'lucide-react'
import { PROPOSAL_STATUS_CONFIG, type ProposalStatus } from '@/lib/proposals'

interface ProposalRow {
  id: string
  title: string
  status: ProposalStatus
  created_at: string
  sent_at: string | null
  expiration_date: string | null
  public_token: string
  total_value: number
  customer_name: string | null
  customer_email: string | null
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
]

export default function ProposalsList() {
  const router = useRouter()
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/proposals${qs}`)
      const json = await res.json()
      setProposals(json.proposals || [])
    } catch {
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  async function handleNew() {
    setCreating(true)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Proposal' }),
      })
      const json = await res.json()
      if (json.proposal?.id) {
        router.push(`/proposals/${json.proposal.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function statusIcon(s: ProposalStatus) {
    const sv = s as string
    if (sv === 'accepted') return <CheckCircle size={13} />
    if (sv === 'declined') return <XCircle size={13} />
    if (sv === 'viewed') return <Eye size={13} />
    if (sv === 'sent') return <Send size={13} />
    if (sv === 'expired') return <Clock size={13} />
    return <FileText size={13} />
  }

  const counts = STATUS_FILTERS.slice(1).reduce<Record<string, number>>((acc, f) => {
    acc[f.value] = proposals.length > 0 && statusFilter === 'all'
      ? proposals.filter(p => p.status === f.value).length
      : 0
    return acc
  }, {})

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
            Proposals
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '4px 0 0' }}>
            Create and send branded proposals to customers
          </p>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
            background: 'var(--accent)', border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: creating ? 0.6 : 1,
          }}
        >
          <Plus size={15} />
          {creating ? 'Creating…' : 'New Proposal'}
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.value
          const cfg = f.value !== 'all' ? PROPOSAL_STATUS_CONFIG[f.value as ProposalStatus] : null
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '5px 14px', border: 'none', borderRadius: 20,
                background: active ? (cfg ? cfg.bg : 'rgba(79,127,255,0.18)') : 'var(--surface2)',
                color: active ? (cfg ? cfg.color : 'var(--accent)') : 'var(--text2)',
                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 160px 110px 120px 110px 36px',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--text3)',
        }}>
          <div>#</div>
          <div>Customer / Title</div>
          <div>Created</div>
          <div>Total Value</div>
          <div>Status</div>
          <div>Expires</div>
          <div />
        </div>

        {loading && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            Loading proposals…
          </div>
        )}

        {!loading && proposals.length === 0 && (
          <div style={{ padding: '60px 16px', textAlign: 'center' }}>
            <FileText size={32} color="var(--text3)" style={{ marginBottom: 12 }} />
            <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 8 }}>No proposals yet</div>
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>
              {statusFilter !== 'all' ? `No ${statusFilter} proposals` : 'Click "+ New Proposal" to get started'}
            </div>
          </div>
        )}

        {!loading && proposals.map((p, idx) => {
          const cfg = PROPOSAL_STATUS_CONFIG[p.status]
          const shortId = p.id.slice(0, 6).toUpperCase()
          return (
            <div
              key={p.id}
              onClick={() => router.push(`/proposals/${p.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 160px 110px 120px 110px 36px',
                padding: '13px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
                transition: 'background 0.12s',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)' }}>
                {shortId}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>
                  {p.customer_name || 'No Customer'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.title}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(p.created_at)}</div>
              <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: p.total_value > 0 ? 'var(--green)' : 'var(--text3)' }}>
                {p.total_value > 0 ? `$${p.total_value.toLocaleString()}` : '—'}
              </div>
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20,
                  background: cfg.bg, color: cfg.color,
                  fontSize: 11, fontWeight: 600,
                }}>
                  {statusIcon(p.status)}
                  {cfg.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(p.expiration_date)}</div>
              <ChevronRight size={14} color="var(--text3)" />
            </div>
          )
        })}
      </div>

      {!loading && proposals.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
          {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
