'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Wrench, Users, FileText, Package, DollarSign, Calendar,
  ChevronRight, X, Search, Plus, Trash2, AlertCircle, Check,
  Clock, Eye, UserPlus,
} from 'lucide-react'

interface StatCard { label: string; value: string | number; icon: React.ReactNode; color: string; badge?: number }
interface JobRow { id: string; title: string; vehicle_desc: string | null; pipe_stage: string; install_date: string | null; status: string }
interface Assignment { id: string; project_id: string; installer_id: string; role: string; split_percentage: number; status: string; installer?: { id: string; name: string; avatar_url: string | null } }
interface BidRow { id: string; project_id: string; installer_id: string; status: string; pay_amount: number; project?: { title: string }; installer?: { name: string } }
interface SupplyRow { id: string; project_id: string; requested_by: string; status: string; items: any[]; urgency: string; needed_by: string | null; requester?: { name: string } }

type FilterTab = 'all' | 'week' | 'unassigned'

export default function InstallDashboardClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [stats, setStats] = useState({ jobsThisWeek: 0, activeInstallers: 0, pendingBids: 0, supplyRequests: 0, revenueMonth: 0 })
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [bids, setBids] = useState<BidRow[]>([])
  const [supplies, setSupplies] = useState<SupplyRow[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)
  const [modalJob, setModalJob] = useState<JobRow | null>(null)
  const [modalAssignments, setModalAssignments] = useState<{ installer_id: string; name: string; role: string; split_percentage: number }[]>([])
  const [installers, setInstallers] = useState<{ id: string; name: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const getWeekBounds = useCallback(() => {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  const getMonthBounds = useCallback(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const week = getWeekBounds()
    const month = getMonthBounds()

    const [scheduleRes, activeRes, bidsRes, supplyRes, earningsRes, jobsRes, installersRes] = await Promise.all([
      supabase.from('installer_schedule').select('id').eq('org_id', ORG_ID).gte('scheduled_date', week.start.split('T')[0]).lt('scheduled_date', week.end.split('T')[0]),
      supabase.from('installer_assignments').select('installer_id').eq('org_id', ORG_ID).eq('status', 'in_progress'),
      supabase.from('installer_bids').select('id, project_id, installer_id, status, pay_amount').eq('org_id', ORG_ID).eq('status', 'pending'),
      supabase.from('supply_requests').select('id, project_id, requested_by, status, items, urgency, needed_by').eq('org_id', ORG_ID).eq('status', 'pending'),
      supabase.from('installer_earnings').select('amount').eq('org_id', ORG_ID).gte('created_at', month.start).lt('created_at', month.end),
      supabase.from('projects').select('id, title, vehicle_desc, pipe_stage, install_date, status').eq('org_id', ORG_ID).eq('pipe_stage', 'install').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('org_id', ORG_ID).eq('role', 'installer'),
    ])

    const uniqueInstallers = new Set((activeRes.data || []).map((a: any) => a.installer_id))
    const totalEarnings = (earningsRes.data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

    setStats({
      jobsThisWeek: (scheduleRes.data || []).length,
      activeInstallers: uniqueInstallers.size,
      pendingBids: (bidsRes.data || []).length,
      supplyRequests: (supplyRes.data || []).length,
      revenueMonth: totalEarnings,
    })

    setJobs(jobsRes.data || [])
    setInstallers(installersRes.data || [])

    // Load bids with joined data
    if (bidsRes.data && bidsRes.data.length > 0) {
      const projectIds = [...new Set(bidsRes.data.map((b: any) => b.project_id))]
      const installerIds = [...new Set(bidsRes.data.map((b: any) => b.installer_id))]
      const [projRes, instRes] = await Promise.all([
        supabase.from('projects').select('id, title').in('id', projectIds),
        supabase.from('profiles').select('id, name').in('id', installerIds),
      ])
      const projMap = Object.fromEntries((projRes.data || []).map((p: any) => [p.id, p]))
      const instMap = Object.fromEntries((instRes.data || []).map((i: any) => [i.id, i]))
      setBids(bidsRes.data.map((b: any) => ({ ...b, project: projMap[b.project_id], installer: instMap[b.installer_id] })))
    } else {
      setBids([])
    }

    // Load supply requests with requester info
    if (supplyRes.data && supplyRes.data.length > 0) {
      const requesterIds = [...new Set(supplyRes.data.map((s: any) => s.requested_by))]
      const reqRes = await supabase.from('profiles').select('id, name').in('id', requesterIds)
      const reqMap = Object.fromEntries((reqRes.data || []).map((r: any) => [r.id, r]))
      setSupplies(supplyRes.data.map((s: any) => ({ ...s, requester: reqMap[s.requested_by] })))
    } else {
      setSupplies([])
    }

    // Load assignments for jobs
    if (jobsRes.data && jobsRes.data.length > 0) {
      const jobIds = jobsRes.data.map((j: any) => j.id)
      const assignRes = await supabase.from('installer_assignments').select('id, project_id, installer_id, role, split_percentage, status').eq('org_id', ORG_ID).in('project_id', jobIds)
      if (assignRes.data && assignRes.data.length > 0) {
        const instIds = [...new Set(assignRes.data.map((a: any) => a.installer_id))]
        const instProfRes = await supabase.from('profiles').select('id, name, avatar_url').in('id', instIds)
        const instProfMap = Object.fromEntries((instProfRes.data || []).map((p: any) => [p.id, p]))
        const grouped: Record<string, Assignment[]> = {}
        for (const a of assignRes.data) {
          if (!grouped[a.project_id]) grouped[a.project_id] = []
          grouped[a.project_id].push({ ...a, installer: instProfMap[a.installer_id] })
        }
        setAssignments(grouped)
      }
    }

    setLoading(false)
  }, [supabase, getWeekBounds, getMonthBounds])

  useEffect(() => { loadData() }, [loadData])

  const filteredJobs = jobs.filter(j => {
    if (filter === 'unassigned') return !assignments[j.id] || assignments[j.id].length === 0
    if (filter === 'week') {
      const week = getWeekBounds()
      return j.install_date && j.install_date >= week.start.split('T')[0] && j.install_date < week.end.split('T')[0]
    }
    return true
  })

  const openAssignModal = (job: JobRow) => {
    setModalJob(job)
    const existing = (assignments[job.id] || []).map(a => ({
      installer_id: a.installer_id,
      name: a.installer?.name || 'Unknown',
      role: a.role || 'installer',
      split_percentage: a.split_percentage || 0,
    }))
    setModalAssignments(existing)
    setSearchQuery('')
  }

  const addInstaller = (inst: { id: string; name: string }) => {
    if (modalAssignments.find(a => a.installer_id === inst.id)) return
    setModalAssignments(prev => [...prev, { installer_id: inst.id, name: inst.name, role: 'installer', split_percentage: 0 }])
  }

  const removeAssignment = (installerId: string) => {
    setModalAssignments(prev => prev.filter(a => a.installer_id !== installerId))
  }

  const updateAssignment = (installerId: string, field: string, value: string | number) => {
    setModalAssignments(prev => prev.map(a => a.installer_id === installerId ? { ...a, [field]: value } : a))
  }

  const totalSplit = modalAssignments.reduce((s, a) => s + (a.split_percentage || 0), 0)

  const saveAssignments = async () => {
    if (!modalJob) return
    setSaving(true)
    // Delete existing assignments for this job
    await supabase.from('installer_assignments').delete().eq('project_id', modalJob.id).eq('org_id', ORG_ID)
    // Insert new ones
    if (modalAssignments.length > 0) {
      await supabase.from('installer_assignments').insert(
        modalAssignments.map(a => ({
          org_id: ORG_ID,
          project_id: modalJob.id,
          installer_id: a.installer_id,
          role: a.role,
          split_percentage: a.split_percentage,
          status: 'assigned',
          assigned_by: profile.id,
        }))
      )
    }
    setSaving(false)
    setModalJob(null)
    loadData()
  }

  const handleBidAction = async (bidId: string, action: 'approved' | 'denied') => {
    await supabase.from('installer_bids').update({ status: action }).eq('id', bidId)
    loadData()
  }

  const handleSupplyAction = async (supplyId: string, action: 'approved' | 'denied') => {
    const updates: any = { status: action }
    if (action === 'approved') { updates.approved_by = profile.id; updates.approved_at = new Date().toISOString() }
    await supabase.from('supply_requests').update(updates).eq('id', supplyId)
    loadData()
  }

  const statCards: StatCard[] = [
    { label: 'Jobs This Week', value: stats.jobsThisWeek, icon: <Calendar size={20} />, color: 'var(--accent)' },
    { label: 'Installers Active', value: stats.activeInstallers, icon: <Users size={20} />, color: 'var(--green)' },
    { label: 'Pending Bids', value: stats.pendingBids, icon: <FileText size={20} />, color: 'var(--amber)', badge: stats.pendingBids },
    { label: 'Supply Requests', value: stats.supplyRequests, icon: <Package size={20} />, color: 'var(--purple)' },
    { label: 'Revenue This Month', value: `$${stats.revenueMonth.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'var(--cyan)' },
  ]

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'week', label: 'This Week' },
    { key: 'unassigned', label: 'Unassigned' },
  ]

  const urgencyColor = (u: string) => u === 'critical' ? 'var(--red)' : u === 'urgent' ? 'var(--amber)' : 'var(--text2)'

  const filteredInstallers = installers.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !modalAssignments.find(a => a.installer_id === i.id)
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text2)' }}>
        <Clock size={20} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} /> Loading install dashboard...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
            <Wrench size={24} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent)' }} />
            Install Manager
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, margin: '4px 0 0' }}>Manage installer assignments, bids, and scheduling</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/install/schedule" style={{ padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Schedule
          </Link>
          <Link href="/install/bids" style={{ padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Bids
          </Link>
          <Link href="/install/earnings" style={{ padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={14} /> Earnings
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ color: card.color }}>{card.icon}</div>
              <span style={{ color: 'var(--text2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700, color: 'var(--text1)' }}>
              {card.value}
            </div>
            {card.badge && card.badge > 0 && (
              <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--amber)', color: '#000', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {card.badge}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* LEFT - Active Jobs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text1)', margin: 0 }}>Active Install Jobs</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {filterTabs.map(t => (
                <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === t.key ? 'var(--accent)' : 'var(--surface2)', color: filter === t.key ? '#fff' : 'var(--text2)' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredJobs.length === 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
                No jobs found for this filter
              </div>
            )}
            {filteredJobs.map(job => {
              const jobAssignments = assignments[job.id] || []
              return (
                <div key={job.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{job.title}</span>
                        <span style={{ background: 'var(--green)', color: '#000', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Install</span>
                      </div>
                      <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
                        {job.vehicle_desc || 'No vehicle'}
                        {job.install_date && <span style={{ marginLeft: 12, color: 'var(--text3)' }}><Calendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{job.install_date}</span>}
                      </div>
                      {jobAssignments.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                          {jobAssignments.map(a => (
                            <div key={a.id} title={a.installer?.name || 'Installer'} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', border: '2px solid var(--surface)' }}>
                              {(a.installer?.name || '?')[0].toUpperCase()}
                            </div>
                          ))}
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{jobAssignments.length} assigned</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openAssignModal(job)} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <UserPlus size={13} /> Manage
                      </button>
                      <Link href={`/projects/${job.id}`} style={{ padding: '6px 12px', background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={13} /> View
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT - Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pending Bids */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text1)', margin: 0 }}>Pending Bids</h3>
              <Link href="/install/bids" style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View All <ChevronRight size={12} />
              </Link>
            </div>
            {bids.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13, margin: 0 }}>No pending bids</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bids.slice(0, 5).map(bid => (
                <div key={bid.id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{bid.installer?.name || 'Unknown'}</div>
                      <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 2 }}>{bid.project?.title || 'Unknown Job'}</div>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>
                      ${bid.pay_amount?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => handleBidAction(bid.id, 'approved')} style={{ flex: 1, padding: '5px 0', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Approve
                    </button>
                    <button onClick={() => handleBidAction(bid.id, 'denied')} style={{ flex: 1, padding: '5px 0', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supply Requests */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text1)', margin: 0 }}>Supply Requests</h3>
              <Link href="/install/supplies" style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View All <ChevronRight size={12} />
              </Link>
            </div>
            {supplies.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13, margin: 0 }}>No pending requests</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {supplies.slice(0, 5).map(req => (
                <div key={req.id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{req.requester?.name || 'Unknown'}</div>
                      <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 2 }}>
                        {Array.isArray(req.items) ? req.items.length : 0} item(s)
                      </div>
                    </div>
                    <span style={{ color: urgencyColor(req.urgency), fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {req.urgency || 'normal'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => handleSupplyAction(req.id, 'approved')} style={{ flex: 1, padding: '5px 0', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Approve
                    </button>
                    <button onClick={() => handleSupplyAction(req.id, 'denied')} style={{ flex: 1, padding: '5px 0', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Installer Modal */}
      {modalJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalJob(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: 520, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>Assign Installers</h3>
              <button onClick={() => setModalJob(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{modalJob.title}</div>
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>{modalJob.vehicle_desc || 'No vehicle'}</div>
            </div>

            {/* Current Assignments */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Team</div>
              {modalAssignments.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>No installers assigned yet</p>}
              {modalAssignments.map(a => (
                <div key={a.installer_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {a.name[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1, color: 'var(--text1)', fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                  <select value={a.role} onChange={e => updateAssignment(a.installer_id, 'role', e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text1)', fontSize: 12 }}>
                    <option value="lead">Lead</option>
                    <option value="installer">Installer</option>
                    <option value="helper">Helper</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={0} max={100} value={a.split_percentage} onChange={e => updateAssignment(a.installer_id, 'split_percentage', Number(e.target.value))} style={{ width: 52, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text1)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }} />
                    <span style={{ color: 'var(--text3)', fontSize: 12 }}>%</span>
                  </div>
                  <button onClick={() => removeAssignment(a.installer_id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                </div>
              ))}
              {modalAssignments.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: totalSplit === 100 ? 'var(--green)' : 'var(--red)' }}>
                  Total: {totalSplit}%{totalSplit !== 100 && <AlertCircle size={12} style={{ marginLeft: 4 }} />}
                </div>
              )}
            </div>

            {/* Search and Add */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Installer</div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                <input type="text" placeholder="Search installers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 32px', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              {searchQuery && (
                <div style={{ maxHeight: 150, overflow: 'auto', marginTop: 4, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {filteredInstallers.length === 0 && <div style={{ padding: '10px 14px', color: 'var(--text3)', fontSize: 12 }}>No results</div>}
                  {filteredInstallers.map(inst => (
                    <button key={inst.id} onClick={() => { addInstaller(inst); setSearchQuery('') }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text1)', fontSize: 13, textAlign: 'left' }}>
                      <Plus size={13} style={{ color: 'var(--accent)' }} /> {inst.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalJob(null)} style={{ padding: '8px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveAssignments} disabled={saving || (modalAssignments.length > 0 && totalSplit !== 100)} style={{ padding: '8px 20px', background: (modalAssignments.length > 0 && totalSplit !== 100) ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
