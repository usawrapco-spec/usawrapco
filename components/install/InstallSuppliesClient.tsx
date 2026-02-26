'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Package, Check, X, Clock, ArrowLeft, ChevronDown, ChevronUp,
  AlertTriangle, Calendar, MessageSquare,
} from 'lucide-react'

interface SupplyRequest {
  id: string
  project_id: string
  requested_by: string
  approved_by: string | null
  status: string
  items: any[]
  urgency: string
  needed_by: string | null
  notes: string | null
  approved_at: string | null
  fulfilled_at: string | null
  created_at: string
  requester?: { id: string; name: string }
  project?: { id: string; title: string }
}

type TabKey = 'pending' | 'approved' | 'fulfilled' | 'all'

export default function InstallSuppliesClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [requests, setRequests] = useState<SupplyRequest[]>([])
  const [tab, setTab] = useState<TabKey>('pending')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({})

  const loadRequests = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('supply_requests')
      .select('id, project_id, requested_by, approved_by, status, items, urgency, needed_by, notes, approved_at, fulfilled_at, created_at')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (tab !== 'all') query = query.eq('status', tab)

    const { data } = await query
    const rows = data || []

    if (rows.length > 0) {
      const requesterIds = [...new Set(rows.map(r => r.requested_by).filter(Boolean))]
      const projectIds = [...new Set(rows.map(r => r.project_id).filter(Boolean))]

      const [reqRes, projRes] = await Promise.all([
        requesterIds.length > 0 ? supabase.from('profiles').select('id, name').in('id', requesterIds) : { data: [] },
        projectIds.length > 0 ? supabase.from('projects').select('id, title').in('id', projectIds) : { data: [] },
      ])

      const reqMap = Object.fromEntries((reqRes.data || []).map(r => [r.id, r]))
      const projMap = Object.fromEntries((projRes.data || []).map(p => [p.id, p]))

      setRequests(rows.map(r => ({
        ...r,
        requester: reqMap[r.requested_by],
        project: r.project_id ? projMap[r.project_id] : undefined,
      })))
    } else {
      setRequests([])
    }
    setLoading(false)
  }, [supabase, tab])

  useEffect(() => { loadRequests() }, [loadRequests])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApprove = async (id: string) => {
    const updates: any = {
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }
    if (managerNotes[id]) updates.notes = managerNotes[id]
    await supabase.from('supply_requests').update(updates).eq('id', id)
    loadRequests()
  }

  const handleDeny = async (id: string) => {
    const updates: any = { status: 'denied' }
    if (managerNotes[id]) updates.notes = managerNotes[id]
    await supabase.from('supply_requests').update(updates).eq('id', id)
    loadRequests()
  }

  const handleFulfill = async (id: string) => {
    await supabase.from('supply_requests').update({
      status: 'fulfilled',
      fulfilled_at: new Date().toISOString(),
    }).eq('id', id)
    loadRequests()
  }

  const urgencyBadge = (u: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      critical: { bg: 'rgba(242,90,90,0.15)', text: 'var(--red)' },
      urgent: { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
      normal: { bg: 'rgba(146,153,181,0.1)', text: 'var(--text2)' },
    }
    const s = styles[u] || styles.normal
    return (
      <span style={{ background: s.bg, color: s.text, padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {u === 'critical' && <AlertTriangle size={11} />}
        {u}
      </span>
    )
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
      approved: { bg: 'rgba(34,192,122,0.15)', text: 'var(--green)' },
      fulfilled: { bg: 'rgba(79,127,255,0.15)', text: 'var(--accent)' },
      denied: { bg: 'rgba(242,90,90,0.15)', text: 'var(--red)' },
    }
    const c = colors[status] || { bg: 'var(--surface2)', text: 'var(--text2)' }
    return (
      <span style={{ background: c.bg, color: c.text, padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
        {status}
      </span>
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'fulfilled', label: 'Fulfilled' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/install" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
            <Package size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--purple)' }} />
            Supply Requests
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, margin: '2px 0 0' }}>Review and manage material and supply requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.key ? 'var(--accent)' : 'var(--surface)', color: tab === t.key ? '#fff' : 'var(--text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests */}
      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <Clock size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          No {tab === 'all' ? '' : tab} supply requests found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(req => {
            const isExpanded = expanded.has(req.id)
            const items = Array.isArray(req.items) ? req.items : []
            return (
              <div key={req.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleExpand(req.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{req.requester?.name || 'Unknown'}</div>
                        <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                          {req.project?.title || 'General Request'} &middot; {items.length} item(s)
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {req.needed_by && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                          <Calendar size={11} /> {req.needed_by}
                        </div>
                      )}
                      {urgencyBadge(req.urgency || 'normal')}
                      {statusBadge(req.status)}
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)' }} />}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
                    {/* Items list */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Items Requested</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {items.map((item: any, i: number) => (
                          <div key={i} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text1)', fontSize: 13 }}>
                              {typeof item === 'string' ? item : item.name || item.description || JSON.stringify(item)}
                            </span>
                            {item.quantity && (
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)', fontSize: 12 }}>
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                        {items.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>No items listed</div>}
                      </div>
                    </div>

                    {/* Notes */}
                    {req.notes && (
                      <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Notes</div>
                        <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{req.notes}</p>
                      </div>
                    )}

                    {/* Manager notes + actions */}
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <div style={{ marginTop: 12 }}>
                        {req.status === 'pending' && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>
                              <MessageSquare size={11} /> Manager Notes
                            </div>
                            <textarea
                              value={managerNotes[req.id] || ''}
                              onChange={e => setManagerNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                              placeholder="Add notes (optional)..."
                              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text1)', fontSize: 12, resize: 'vertical', minHeight: 50, boxSizing: 'border-box' }}
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(req.id)} style={{ padding: '7px 16px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={14} /> Approve
                              </button>
                              <button onClick={() => handleDeny(req.id)} style={{ padding: '7px 16px', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <X size={14} /> Deny
                              </button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button onClick={() => handleFulfill(req.id)} style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={14} /> Mark Fulfilled
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
                      <span>Requested: {new Date(req.created_at).toLocaleString()}</span>
                      {req.approved_at && <span>Approved: {new Date(req.approved_at).toLocaleString()}</span>}
                      {req.fulfilled_at && <span>Fulfilled: {new Date(req.fulfilled_at).toLocaleString()}</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
