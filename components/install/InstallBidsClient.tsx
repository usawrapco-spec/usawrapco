'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  FileText, Check, X, ChevronLeft, Filter, CheckSquare, Square,
  Clock, ArrowLeft,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

interface BidRow {
  id: string
  project_id: string
  installer_id: string
  status: string
  pay_amount: number
  hours_budget: number | null
  created_at: string
  project?: { id: string; title: string }
  installer?: { id: string; name: string }
}

type TabKey = 'pending' | 'approved' | 'denied' | 'all'

export default function InstallBidsClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [bids, setBids] = useState<BidRow[]>([])
  const [tab, setTab] = useState<TabKey>('pending')
  const [loading, setLoading] = useState(true)
  const [installers, setInstallers] = useState<{ id: string; name: string }[]>([])
  const [filterInstaller, setFilterInstaller] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const loadBids = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('installer_bids').select('id, project_id, installer_id, status, pay_amount, hours_budget, created_at').eq('org_id', ORG_ID).order('created_at', { ascending: false })

    if (tab !== 'all') query = query.eq('status', tab)
    if (filterInstaller) query = query.eq('installer_id', filterInstaller)

    const { data } = await query
    const rows = data || []

    if (rows.length > 0) {
      const projectIds = [...new Set(rows.map(b => b.project_id))]
      const installerIds = [...new Set(rows.map(b => b.installer_id))]

      const [projRes, instRes] = await Promise.all([
        supabase.from('projects').select('id, title').in('id', projectIds),
        supabase.from('profiles').select('id, name').in('id', installerIds),
      ])

      const projMap = Object.fromEntries((projRes.data || []).map(p => [p.id, p]))
      const instMap = Object.fromEntries((instRes.data || []).map(i => [i.id, i]))

      setBids(rows.map(b => ({ ...b, project: projMap[b.project_id], installer: instMap[b.installer_id] })))
    } else {
      setBids([])
    }

    setSelected(new Set())
    setLoading(false)
  }, [supabase, tab, filterInstaller])

  const loadInstallers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, name').eq('org_id', ORG_ID).eq('role', 'installer')
    setInstallers(data || [])
  }, [supabase])

  useEffect(() => { loadInstallers() }, [loadInstallers])
  useEffect(() => { loadBids() }, [loadBids])

  const handleAction = async (bidId: string, action: 'approved' | 'denied') => {
    await supabase.from('installer_bids').update({ status: action }).eq('id', bidId)
    loadBids()
  }

  const handleBulkApprove = async () => {
    if (selected.size === 0) return
    setBulkProcessing(true)
    const ids = Array.from(selected)
    for (const id of ids) {
      await supabase.from('installer_bids').update({ status: 'approved' }).eq('id', id)
    }
    setBulkProcessing(false)
    loadBids()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === bids.length) setSelected(new Set())
    else setSelected(new Set(bids.map(b => b.id)))
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
      approved: { bg: 'rgba(34,192,122,0.15)', text: 'var(--green)' },
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
    { key: 'denied', label: 'Denied' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/install" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
              <FileText size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--amber)' }} />
              Bid Management
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: '2px 0 0' }}>Review and manage installer bids</p>
          </div>
        </div>
        {tab === 'pending' && selected.size > 0 && (
          <button onClick={handleBulkApprove} disabled={bulkProcessing} style={{ padding: '8px 18px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: bulkProcessing ? 0.6 : 1 }}>
            <Check size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Approve {selected.size} Selected
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.key ? 'var(--accent)' : 'var(--surface)', color: tab === t.key ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--text3)' }} />
          <select value={filterInstaller} onChange={e => setFilterInstaller(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 12px', color: 'var(--text1)', fontSize: 13 }}>
            <option value="">All Installers</option>
            {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
            <Clock size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading bids...
          </div>
        ) : bids.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No bids found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {tab === 'pending' && (
                  <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>
                    <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                      {selected.size === bids.length ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                )}
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Installer</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hours</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bids.map(bid => (
                <tr key={bid.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {tab === 'pending' && (
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => toggleSelect(bid.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selected.has(bid.id) ? 'var(--accent)' : 'var(--text3)' }}>
                        {selected.has(bid.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                  )}
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/projects/${bid.project_id}`} style={{ color: 'var(--text1)', textDecoration: 'none', fontWeight: 500, fontSize: 13 }}>
                      {bid.project?.title || 'Unknown'}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text1)', fontSize: 13 }}>{bid.installer?.name || 'Unknown'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>
                    ${bid.pay_amount?.toLocaleString() || '0'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)', fontSize: 13 }}>
                    {bid.hours_budget ?? '-'}h
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text2)', fontSize: 12 }}>
                    {new Date(bid.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>{statusBadge(bid.status)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {bid.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleAction(bid.id, 'approved')} title="Approve" style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(34,192,122,0.15)', border: 'none', cursor: 'pointer', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={15} />
                        </button>
                        <button onClick={() => handleAction(bid.id, 'denied')} title="Deny" style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(242,90,90,0.15)', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
