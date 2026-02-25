'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  DollarSign, ArrowLeft, Clock, ChevronDown, ChevronUp, Check,
  Download, ChevronLeft, ChevronRight,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

interface EarningRow {
  id: string
  installer_id: string
  project_id: string
  assignment_id: string | null
  amount: number
  type: string
  status: string
  pay_period_start: string | null
  pay_period_end: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  project?: { id: string; title: string }
}

interface InstallerSummary {
  id: string
  name: string
  avatar_url: string | null
  earnings: EarningRow[]
  pending: number
  approved: number
  paid: number
  jobsCompleted: number
}

export default function InstallEarningsClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [summaries, setSummaries] = useState<InstallerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [weekOffset, setWeekOffset] = useState(0)

  const getWeekBounds = useCallback((offset: number) => {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day + (offset * 7))
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      startDate: start,
      endDate: end,
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const week = getWeekBounds(weekOffset)

    const [earningsRes, installersRes] = await Promise.all([
      supabase.from('installer_earnings')
        .select('id, installer_id, project_id, assignment_id, amount, type, status, pay_period_start, pay_period_end, paid_at, notes, created_at')
        .eq('org_id', ORG_ID)
        .gte('created_at', week.start)
        .lt('created_at', week.end)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, avatar_url').eq('org_id', ORG_ID).eq('role', 'installer'),
    ])

    const earnings = earningsRes.data || []
    const allInstallers = installersRes.data || []

    // Get project info for all earnings
    let projMap: Record<string, any> = {}
    if (earnings.length > 0) {
      const projIds = [...new Set(earnings.map(e => e.project_id).filter(Boolean))]
      if (projIds.length > 0) {
        const { data: projs } = await supabase.from('projects').select('id, title').in('id', projIds)
        projMap = Object.fromEntries((projs || []).map(p => [p.id, p]))
      }
    }

    // Build summaries per installer
    const earningsWithProjects = earnings.map(e => ({ ...e, project: projMap[e.project_id] }))
    const grouped: Record<string, EarningRow[]> = {}
    for (const e of earningsWithProjects) {
      if (!grouped[e.installer_id]) grouped[e.installer_id] = []
      grouped[e.installer_id].push(e)
    }

    const sums: InstallerSummary[] = allInstallers.map(inst => {
      const instEarnings = grouped[inst.id] || []
      return {
        id: inst.id,
        name: inst.name,
        avatar_url: inst.avatar_url,
        earnings: instEarnings,
        pending: instEarnings.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
        approved: instEarnings.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0),
        paid: instEarnings.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0),
        jobsCompleted: new Set(instEarnings.map(e => e.project_id)).size,
      }
    })
    .sort((a, b) => (b.pending + b.approved + b.paid) - (a.pending + a.approved + a.paid))

    setSummaries(sums)
    setLoading(false)
  }, [supabase, weekOffset, getWeekBounds])

  useEffect(() => { loadData() }, [loadData])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleMarkPaid = async (earningId: string) => {
    await supabase.from('installer_earnings').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', earningId)
    loadData()
  }

  const handleMarkAllPaid = async (installerId: string) => {
    const installer = summaries.find(s => s.id === installerId)
    if (!installer) return
    const unpaid = installer.earnings.filter(e => e.status === 'pending' || e.status === 'approved')
    for (const e of unpaid) {
      await supabase.from('installer_earnings').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      }).eq('id', e.id)
    }
    loadData()
  }

  const exportCSV = () => {
    const week = getWeekBounds(weekOffset)
    const rows = [['Installer', 'Job', 'Amount', 'Type', 'Status', 'Date']]
    for (const s of summaries) {
      for (const e of s.earnings) {
        rows.push([s.name, e.project?.title || 'N/A', String(e.amount), e.type || '', e.status, e.created_at.split('T')[0]])
      }
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `installer-earnings-${week.start}-to-${week.end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const week = getWeekBounds(weekOffset)
  const totalPending = summaries.reduce((s, i) => s + i.pending, 0)
  const totalApproved = summaries.reduce((s, i) => s + i.approved, 0)
  const totalPaid = summaries.reduce((s, i) => s + i.paid, 0)

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
      approved: { bg: 'rgba(34,192,122,0.15)', text: 'var(--green)' },
      paid: { bg: 'rgba(79,127,255,0.15)', text: 'var(--accent)' },
    }
    const c = colors[status] || { bg: 'var(--surface2)', text: 'var(--text2)' }
    return <span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{status}</span>
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/install" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
              <DollarSign size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--green)' }} />
              Installer Earnings
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: '2px 0 0' }}>Track and manage installer pay</p>
          </div>
        </div>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Pay Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text1)', display: 'flex' }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ color: 'var(--text1)', fontSize: 13, fontWeight: 600 }}>
              {week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {week.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text1)', display: 'flex' }}>
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ padding: '6px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text2)', fontSize: 11, fontWeight: 600 }}>
              Current Week
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginTop: 4 }}>${totalPending.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ color: 'var(--green)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginTop: 4 }}>${totalApproved.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text1)', marginTop: 4 }}>${totalPaid.toLocaleString()}</div>
        </div>
      </div>

      {/* Installer Cards */}
      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <Clock size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading earnings...
        </div>
      ) : summaries.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          No installer data found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {summaries.map(inst => {
            const isExpanded = expanded.has(inst.id)
            const total = inst.pending + inst.approved + inst.paid
            return (
              <div key={inst.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Installer header */}
                <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleExpand(inst.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                        {inst.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{inst.name}</div>
                        <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 1 }}>
                          {inst.jobsCompleted} job(s) &middot; {inst.earnings.length} earning(s)
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>${total.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {inst.pending > 0 && <span style={{ color: 'var(--amber)', marginRight: 8 }}>${inst.pending} pending</span>}
                          {inst.approved > 0 && <span style={{ color: 'var(--green)', marginRight: 8 }}>${inst.approved} approved</span>}
                          {inst.paid > 0 && <span style={{ color: 'var(--accent)' }}>${inst.paid} paid</span>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)' }} />}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
                    {inst.earnings.length > 0 && (inst.pending > 0 || inst.approved > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, marginBottom: 8 }}>
                        <button onClick={() => handleMarkAllPaid(inst.id)} style={{ padding: '5px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Mark All Paid
                        </button>
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Job</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Amount</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Type</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inst.earnings.map(e => (
                          <tr key={e.id}>
                            <td style={{ padding: '8px', color: 'var(--text1)', fontSize: 12 }}>
                              <Link href={`/projects/${e.project_id}`} style={{ color: 'var(--text1)', textDecoration: 'none' }}>
                                {e.project?.title || 'Unknown'}
                              </Link>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
                              ${e.amount.toLocaleString()}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text2)', fontSize: 11 }}>{e.type || 'install'}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{statusBadge(e.status)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {e.status !== 'paid' && (
                                <button onClick={() => handleMarkPaid(e.id)} style={{ padding: '3px 10px', background: 'rgba(79,127,255,0.15)', color: 'var(--accent)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                  Mark Paid
                                </button>
                              )}
                              {e.status === 'paid' && e.paid_at && (
                                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{new Date(e.paid_at).toLocaleDateString()}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inst.earnings.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: 16 }}>No earnings this period</div>
                    )}
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
