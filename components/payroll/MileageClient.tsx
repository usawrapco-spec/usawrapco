'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  MapPin, Navigation, Plus, Check, X, Clock, Car, Truck,
  ChevronDown, ChevronUp, AlertTriangle, Upload, Eye, Filter,
  DollarSign, FileText, Loader2, StopCircle, Download,
} from 'lucide-react'

interface MileageLog {
  id: string
  user_id: string
  date: string
  entry_type: 'manual' | 'gps'
  from_address: string | null
  to_address: string | null
  miles: number
  rate_per_mile: number
  total_amount: number
  purpose: string | null
  vehicle_type: 'personal' | 'company'
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  approved_at: string | null
  rejection_reason: string | null
  notes: string | null
  user?: { id: string; name: string; avatar_url: string | null }
  job?: { id: string; title: string } | null
  approver?: { id: string; name: string } | null
  created_at: string
}

interface Job { id: string; title: string }

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--amber)',
  approved: 'var(--green)',
  rejected: 'var(--red)',
  paid: 'var(--accent)',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', paid: 'Paid',
}

// Haversine formula: distance in miles between two lat/lng points
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function totalMiles(route: { lat: number; lng: number }[]): number {
  if (route.length < 2) return 0
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += haversine(route[i - 1].lat, route[i - 1].lng, route[i].lat, route[i].lng)
  }
  return Math.round(total * 100) / 100
}

export default function MileageClient({
  profile,
  employees,
  jobs,
}: {
  profile: Profile
  employees: any[]
  jobs: Job[]
}) {
  const supabase = createClient()
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  const [tab, setTab] = useState<'log' | 'history' | 'pending'>('log')
  const [logs, setLogs] = useState<MileageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // GPS tracking state
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsRoute, setGpsRoute] = useState<{ lat: number; lng: number; ts: number }[]>([])
  const [gpsMiles, setGpsMiles] = useState(0)
  const [gpsElapsed, setGpsElapsed] = useState(0)
  const [gpsError, setGpsError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const gpsStartRef = useRef<number>(0)

  // Manual entry form
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    from_address: '',
    to_address: '',
    miles: '',
    purpose: '',
    vehicle_type: 'personal',
    job_id: '',
    notes: '',
    odometer_start: '',
    odometer_end: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Admin approval
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterUser && isAdmin) params.set('user_id', filterUser)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    const res = await fetch(`/api/mileage?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    setLoading(false)
  }, [filterStatus, filterUser, filterFrom, filterTo, isAdmin])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // GPS tracking
  const startGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser')
      return
    }
    setGpsError('')
    setGpsRoute([])
    setGpsMiles(0)
    gpsStartRef.current = Date.now()
    setGpsActive(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: pos.timestamp }
        setGpsRoute(prev => {
          const updated = [...prev, point]
          setGpsMiles(totalMiles(updated))
          return updated
        })
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    )

    timerRef.current = setInterval(() => {
      setGpsElapsed(Math.floor((Date.now() - gpsStartRef.current) / 1000))
    }, 1000)
  }

  const stopGPS = async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    setGpsActive(false)

    if (gpsRoute.length > 1 && gpsMiles > 0) {
      setSaving(true)
      const res = await fetch('/api/mileage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'gps',
          date: new Date().toISOString().split('T')[0],
          miles: gpsMiles,
          route_data: gpsRoute,
          purpose: form.purpose || 'GPS tracked drive',
          vehicle_type: form.vehicle_type,
          job_id: form.job_id || null,
        }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        fetchLogs()
      }
      setSaving(false)
    }

    setGpsRoute([])
    setGpsMiles(0)
    setGpsElapsed(0)
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    if (!form.miles || parseFloat(form.miles) <= 0) {
      setSaveError('Miles must be greater than 0')
      return
    }
    setSaving(true)
    const res = await fetch('/api/mileage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        miles: parseFloat(form.miles),
        entry_type: 'manual',
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveError(data.error || 'Failed to save'); return }
    setSaveSuccess(true)
    setForm({ date: new Date().toISOString().split('T')[0], from_address: '', to_address: '',
      miles: '', purpose: '', vehicle_type: 'personal', job_id: '', notes: '', odometer_start: '', odometer_end: '' })
    setTimeout(() => setSaveSuccess(false), 3000)
    fetchLogs()
  }

  const handleApprove = async (logId: string) => {
    setActionLoading(logId + '_approve')
    await fetch(`/api/mileage/${logId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setActionLoading(null)
    fetchLogs()
  }

  const handleReject = async (logId: string) => {
    setActionLoading(logId + '_reject')
    await fetch(`/api/mileage/${logId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason[logId] || 'Rejected by manager' }),
    })
    setActionLoading(null)
    setRejectionReason(prev => { const n = { ...prev }; delete n[logId]; return n })
    fetchLogs()
  }

  const fmtTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`
  }

  const exportCSV = () => {
    const IRS_RATE = 0.67
    const headers = ['Date', 'Driver', 'From', 'To', 'Miles', 'Rate/Mi', 'Amount', 'Purpose', 'Vehicle', 'Entry Type', 'Status']
    const rows = logs.map(l => [
      l.date,
      l.user?.name || '',
      l.from_address || '',
      l.to_address || '',
      l.miles.toFixed(2),
      l.vehicle_type === 'company' ? '0.00' : l.rate_per_mile.toFixed(4),
      l.total_amount.toFixed(2),
      l.purpose || '',
      l.vehicle_type,
      l.entry_type,
      l.status,
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mileage-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pendingCount = logs.filter(l => l.status === 'pending').length

  const pill = (status: string) => (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: STATUS_COLOR[status] + '22', color: STATUS_COLOR[status], textTransform: 'uppercase'
    }}>{STATUS_LABEL[status]}</span>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid #2a2d3a',
    borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 14, outline: 'none'
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-barlow)', color: 'var(--text1)', margin: 0 }}>
            Mileage Tracking
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
            Log drives and track reimbursements
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>IRS Rate</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            $0.67<span style={{ fontSize: 14, color: 'var(--text2)' }}>/mi</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {([
          ['log', 'Log Mileage'],
          ['history', 'My History'],
          ...(isAdmin ? [['pending', `Pending Approval${pendingCount > 0 ? ` (${pendingCount})` : ''}`]] : []),
        ] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 14, transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {/* ── LOG MILEAGE TAB ──────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* GPS Tracker */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid #2a2d3a' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={18} color="var(--accent)" /> GPS Auto-Track
            </h3>

            {gpsActive ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--red)22', border: '3px solid var(--red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pulse 1.5s infinite' }}>
                  <Navigation size={32} color="var(--red)" />
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>
                  {gpsMiles.toFixed(2)} mi
                </div>
                <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8 }}>{fmtTime(gpsElapsed)} elapsed</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                  {gpsRoute.length} GPS points recorded
                </div>
                <button onClick={stopGPS} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  <StopCircle size={18} /> Stop & Save Drive
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
                  GPS tracks your route in real-time. Miles are calculated automatically from your path.
                </p>
                {gpsError && (
                  <div style={{ background: 'var(--red)22', border: '1px solid var(--red)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
                    <AlertTriangle size={14} style={{ marginRight: 6 }} />{gpsError}
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Purpose (optional)</label>
                  <input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                    placeholder="e.g. Job site visit" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Link to Job (optional)</label>
                  <select value={form.job_id} onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))} style={inputStyle}>
                    <option value="">No job linked</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
                {saveSuccess && (
                  <div style={{ background: 'var(--green)22', border: '1px solid var(--green)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> Drive saved successfully!
                  </div>
                )}
                <button onClick={startGPS} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  <Navigation size={18} /> Start Drive
                </button>
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid #2a2d3a' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--amber)" /> Manual Entry
            </h3>
            <form onSubmit={handleManualSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Miles *</label>
                  <input type="number" step="0.1" min="0.1" value={form.miles}
                    onChange={e => setForm(p => ({ ...p, miles: e.target.value }))}
                    placeholder="0.0" style={inputStyle} required />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>From</label>
                <input value={form.from_address} onChange={e => setForm(p => ({ ...p, from_address: e.target.value }))}
                  placeholder="Starting address" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>To</label>
                <input value={form.to_address} onChange={e => setForm(p => ({ ...p, to_address: e.target.value }))}
                  placeholder="Destination address" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Purpose</label>
                <input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                  placeholder="Reason for trip" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Vehicle</label>
                  <select value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))} style={inputStyle}>
                    <option value="personal">Personal Vehicle</option>
                    <option value="company">Company Vehicle</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Job (optional)</label>
                  <select value={form.job_id} onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))} style={inputStyle}>
                    <option value="">No job</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Odometer Start</label>
                  <input type="number" value={form.odometer_start} onChange={e => setForm(p => ({ ...p, odometer_start: e.target.value }))}
                    placeholder="Miles" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Odometer End</label>
                  <input type="number" value={form.odometer_end} onChange={e => setForm(p => ({ ...p, odometer_end: e.target.value }))}
                    placeholder="Miles" style={inputStyle} />
                </div>
              </div>
              {saveError && (
                <div style={{ background: 'var(--red)22', border: '1px solid var(--red)', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13, color: 'var(--red)' }}>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{ background: 'var(--green)22', border: '1px solid var(--green)', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> Entry saved!
                </div>
              )}
              <button type="submit" disabled={saving} style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: saving ? 'var(--surface2)' : 'var(--accent)', color: '#fff', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                {saving ? 'Saving...' : 'Log Mileage'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {/* Filters + Export */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
            {isAdmin && (
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
                <option value="">All Employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            <span style={{ color: 'var(--text2)', lineHeight: '38px' }}>to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            <div style={{ flex: 1 }} />
            {logs.length > 0 && (
              <button onClick={exportCSV} style={{
                padding: '9px 14px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer',
                background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Download size={14} /> Export CSV
              </button>
            )}
          </div>

          {/* Summary stats */}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Miles', value: logs.reduce((s, l) => s + l.miles, 0).toFixed(1) + ' mi' },
                { label: 'Pending', value: logs.filter(l => l.status === 'pending').length, color: 'var(--amber)' },
                { label: 'Approved', value: logs.filter(l => l.status === 'approved').length, color: 'var(--green)' },
                { label: 'Est. Reimbursement', value: '$' + logs.filter(l => l.status !== 'rejected').reduce((s, l) => s + l.total_amount, 0).toFixed(2), color: 'var(--green)' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2d3a' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: stat.color || 'var(--text1)' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <div>Loading logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>No mileage logs found</div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                    {['Date', 'Route', 'Miles', 'Rate', 'Amount', 'Type', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)' }}>{log.date}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)', maxWidth: 180 }}>
                        {log.from_address && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.from_address}</div>}
                        {log.to_address && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text3)' }}>{log.to_address}</div>}
                        {log.purpose && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{log.purpose}</div>}
                        {isAdmin && log.user && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{log.user.name}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{log.miles.toFixed(1)}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text2)' }}>
                        {log.vehicle_type === 'company' ? '$0.00' : `$${log.rate_per_mile.toFixed(4)}`}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                        ${log.total_amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text2)' }}>
                          {log.entry_type === 'gps' ? <Navigation size={12} color="var(--accent)" /> : <FileText size={12} />}
                          {log.vehicle_type === 'company' ? <Truck size={12} color="var(--cyan)" /> : <Car size={12} />}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{pill(log.status)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {log.status === 'rejected' && log.rejection_reason && (
                          <span style={{ fontSize: 11, color: 'var(--red)' }} title={log.rejection_reason}>
                            <AlertTriangle size={12} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PENDING APPROVAL TAB (admin only) ────────────────────────────── */}
      {tab === 'pending' && isAdmin && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Loading...</div>
          ) : logs.filter(l => l.status === 'pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
              <Check size={36} color="var(--green)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>All caught up!</div>
              <div style={{ fontSize: 13 }}>No mileage entries pending approval</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.filter(l => l.status === 'pending').map(log => (
                <div key={log.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid #2a2d3a' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                        {log.user?.name || 'Employee'} — {log.miles.toFixed(1)} miles
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                        {log.date} · {log.purpose || 'No purpose specified'}
                      </div>
                      {log.from_address && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{log.from_address} → {log.to_address}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                        ${log.total_amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>${log.rate_per_mile}/mi × {log.miles} mi</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      value={rejectionReason[log.id] || ''}
                      onChange={e => setRejectionReason(p => ({ ...p, [log.id]: e.target.value }))}
                      placeholder="Rejection reason (optional)"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => handleReject(log.id)} disabled={actionLoading === log.id + '_reject'} style={{
                      padding: '9px 16px', borderRadius: 8, border: '1px solid var(--red)', cursor: 'pointer',
                      background: 'transparent', color: 'var(--red)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      {actionLoading === log.id + '_reject' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={14} />} Reject
                    </button>
                    <button onClick={() => handleApprove(log.id)} disabled={actionLoading === log.id + '_approve'} style={{
                      padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--green)', color: '#fff', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      {actionLoading === log.id + '_approve' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Approve
                    </button>
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
