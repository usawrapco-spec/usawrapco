'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Phone, Search, ArrowLeft, Filter, ChevronDown,
  PhoneCall, Clock, ThumbsUp, ThumbsDown, SkipForward,
  CheckCircle, X, Edit3, Save,
} from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Phone }> = {
  pending:         { label: 'Pending',         color: C.text3,   icon: Clock },
  called:          { label: 'Called',           color: C.accent,  icon: PhoneCall },
  no_answer:       { label: 'No Answer',       color: C.amber,   icon: Phone },
  callback:        { label: 'Callback',        color: C.cyan,    icon: Clock },
  interested:      { label: 'Interested',      color: C.green,   icon: ThumbsUp },
  not_interested:  { label: 'Not Interested',  color: C.red,     icon: ThumbsDown },
  converted:       { label: 'Converted',       color: C.green,   icon: CheckCircle },
  skipped:         { label: 'Skipped',         color: C.text3,   icon: SkipForward },
}

interface Lead {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  status: string
  notes: string | null
  call_count: number
  last_called_at: string | null
  next_callback: string | null
  custom_fields: Record<string, string>
}

interface ListItem {
  id: string
  name: string
  total_count: number
  called_count: number
  status: string
}

export default function LeadTable({ list, leads: initial }: { list: ListItem; leads: Lead[] }) {
  const [leads, setLeads] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    let result = leads
    if (statusFilter) result = result.filter(l => l.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
      )
    }
    return result
  }, [leads, search, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1 })
    return counts
  }, [leads])

  async function saveNotes(leadId: string) {
    setSaving(true)
    const res = await fetch(`/api/sales-portal/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: editNotes }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes: editNotes } : l))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function updateStatus(leadId: string, status: string) {
    const res = await fetch(`/api/sales-portal/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    }
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/sales-portal/leads" style={{ color: C.text3, textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: 0, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
            {list.name}
          </h1>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
            {list.total_count} contacts &middot; {list.called_count} called
          </div>
        </div>
        <Link
          href={`/sales-portal/leads/${list.id}/dialer`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', background: C.green, color: '#fff',
            border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <Phone size={14} /> Dial List
        </Link>
      </div>

      {/* Status Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          onClick={() => setStatusFilter('')}
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: !statusFilter ? `${C.accent}20` : C.surface2,
            border: `1px solid ${!statusFilter ? C.accent : C.border}`,
            color: !statusFilter ? C.accent : C.text3, cursor: 'pointer',
          }}
        >
          All ({leads.length})
        </button>
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const count = statusCounts[key] || 0
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: statusFilter === key ? `${meta.color}20` : C.surface2,
                border: `1px solid ${statusFilter === key ? meta.color : C.border}`,
                color: statusFilter === key ? meta.color : C.text3, cursor: 'pointer',
              }}
            >
              {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} color={C.text3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads..."
          style={{
            width: '100%', padding: '10px 12px 10px 34px',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Lead Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(lead => {
          const meta = STATUS_META[lead.status] ?? STATUS_META.pending
          const isEditing = editingId === lead.id
          return (
            <div key={lead.id} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: meta.color, marginTop: 6, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{lead.name}</div>
                  {lead.company && <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>{lead.company}</div>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: C.text3 }}>
                    {lead.phone && <span>{lead.phone}</span>}
                    {lead.email && <span>{lead.email}</span>}
                  </div>
                  {lead.call_count > 0 && (
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>
                      Called {lead.call_count}x
                      {lead.last_called_at && ` · Last: ${new Date(lead.last_called_at).toLocaleDateString()}`}
                    </div>
                  )}

                  {/* Notes */}
                  {isEditing ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="Add notes..."
                        style={{
                          width: '100%', padding: '8px 10px', minHeight: 60,
                          background: C.surface2, border: `1px solid ${C.border}`,
                          borderRadius: 6, color: C.text1, fontSize: 12,
                          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <button
                          onClick={() => saveNotes(lead.id)}
                          disabled={saving}
                          style={{
                            padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: C.accent, color: '#fff', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <Save size={10} /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.text3, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : lead.notes ? (
                    <div
                      onClick={() => { setEditingId(lead.id); setEditNotes(lead.notes || '') }}
                      style={{ fontSize: 11, color: C.text2, marginTop: 6, cursor: 'pointer', fontStyle: 'italic' }}
                    >
                      {lead.notes}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditingId(lead.id); setEditNotes(lead.notes || '') }}
                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.text3 }}
                    title="Edit notes"
                  >
                    <Edit3 size={14} />
                  </button>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      style={{ padding: 4, color: C.green }}
                      title="Call"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Status Buttons */}
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                {['interested', 'callback', 'no_answer', 'not_interested', 'converted'].map(s => {
                  const sm = STATUS_META[s]
                  const active = lead.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(lead.id, active ? 'pending' : s)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: active ? `${sm.color}20` : 'transparent',
                        border: `1px solid ${active ? sm.color : C.border}`,
                        color: active ? sm.color : C.text3, cursor: 'pointer',
                      }}
                    >
                      {sm.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3, fontSize: 13 }}>
          {search || statusFilter ? 'No leads match your filter' : 'No leads in this list'}
        </div>
      )}
    </div>
  )
}
