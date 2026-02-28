'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Wrench, AlertTriangle, Check, X, Plus, Loader2, RefreshCw,
  Filter, DollarSign, ChevronRight, ChevronDown, Truck,
  CheckCircle2, Camera, Shield, ExternalLink, FolderPlus, ZoomIn,
} from 'lucide-react'

// ─── Company Vehicle Maintenance ─────────────────────────────────────────────

interface CompanyVehicle {
  id: string
  make: string
  model: string
  year: number | null
  plate: string | null
  current_mileage: number
}

interface VehicleMaint {
  id: string
  vehicle_id: string
  type: string
  description: string | null
  cost: number
  mileage_at_service: number | null
  next_service_due_miles: number | null
  next_service_due_date: string | null
  performed_by: string | null
  created_at: string
  vehicle?: CompanyVehicle | null
}

// ─── Customer Wrap Tickets ────────────────────────────────────────────────────

interface MaintenanceTicket {
  id: string; ticket_token: string; status: string; priority: string
  subject: string; description: string | null; photos: string[]
  ai_assessment: string | null; ai_severity: string | null; ai_recommended_action: string | null
  internal_notes: string | null; is_warranty_eligible: boolean; warranty_expiry: string | null
  vehicle_year: string | null; vehicle_make: string | null; vehicle_model: string | null
  affected_areas: string[] | null; install_date: string | null
  estimated_repair_cost: number | null; resolution_notes: string | null
  resolved_at: string | null; created_at: string; updated_at: string
  customer: { id: string; name: string; email: string; phone: string | null } | null
  project: { id: string; title: string } | null
}

const MAINT_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tires', label: 'Tires' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'registration', label: 'Registration' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: 'var(--amber)', reviewing: 'var(--cyan)', scheduled: 'var(--accent)',
  in_progress: 'var(--purple)', resolved: 'var(--green)', declined: 'var(--red)',
}
const TICKET_STATUSES = ['open', 'reviewing', 'scheduled', 'in_progress', 'resolved', 'declined']

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function statusBadge(days: number | null, milesLeft: number | null) {
  const overdue = (days !== null && days < 0) || (milesLeft !== null && milesLeft < 0)
  const dueSoon = !overdue && ((days !== null && days <= 30) || (milesLeft !== null && milesLeft < 1000))
  if (overdue) return { label: 'OVERDUE', color: 'var(--red)' }
  if (dueSoon) return { label: 'DUE SOON', color: 'var(--amber)' }
  return { label: 'OK', color: 'var(--green)' }
}

function fmt(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function fmtAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return fmt(d)
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid #2a2d3a',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }

interface Props {
  isAdmin: boolean
  initialVehicles: CompanyVehicle[]
  initialRecords: VehicleMaint[]
}

export default function FleetMaintenanceClient({ isAdmin, initialVehicles, initialRecords }: Props) {
  const [tab, setTab] = useState<'fleet' | 'tickets'>('fleet')

  // Fleet service state
  const [vehicles] = useState(initialVehicles)
  const [records, setRecords] = useState(initialRecords)
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    vehicle_id: '', type: 'oil_change', description: '', cost: '',
    mileage_at_service: '', next_service_due_miles: '', next_service_due_date: '',
    performed_by: '',
  })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Ticket state
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [ticketsLoaded, setTicketsLoaded] = useState(false)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null)
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null)
  const [ticketUpdating, setTicketUpdating] = useState(false)
  const [internalNotes, setInternalNotes] = useState('')
  const [resolution, setResolution] = useState('')
  const [showInternalNotes, setShowInternalNotes] = useState(false)

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true)
    const qs = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
    const res = await fetch(`/api/portal/maintenance${qs}`)
    const data = await res.json()
    setTickets(data.tickets || [])
    setTicketsLoaded(true)
    setTicketsLoading(false)
  }, [filterStatus])

  const handleTabChange = (t: 'fleet' | 'tickets') => {
    setTab(t)
    if (t === 'tickets' && !ticketsLoaded) loadTickets()
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    if (!addForm.vehicle_id) { setAddError('Select a vehicle'); return }
    setAddSaving(true)
    const res = await fetch('/api/vehicle-maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, cost: parseFloat(addForm.cost) || 0 }),
    })
    const data = await res.json()
    setAddSaving(false)
    if (!res.ok) { setAddError(data.error || 'Failed'); return }
    setRecords(prev => [{ ...data.record, vehicle: vehicles.find(v => v.id === addForm.vehicle_id) }, ...prev])
    setShowAdd(false)
    setAddForm({ vehicle_id: '', type: 'oil_change', description: '', cost: '', mileage_at_service: '', next_service_due_miles: '', next_service_due_date: '', performed_by: '' })
  }

  async function updateTicket(id: string, updates: Record<string, unknown>) {
    setTicketUpdating(true)
    await fetch('/api/portal/maintenance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    await loadTickets()
    if (selectedTicket?.id === id) setSelectedTicket(t => t ? { ...t, ...updates } as MaintenanceTicket : t)
    setTicketUpdating(false)
  }

  // ─── Compute fleet service status per vehicle+type ──────────────────────────
  // Group latest record per vehicle+type
  const serviceMap = new Map<string, VehicleMaint>()
  records.forEach(r => {
    const key = `${r.vehicle_id}_${r.type}`
    if (!serviceMap.has(key)) serviceMap.set(key, r)
  })
  const serviceRows = Array.from(serviceMap.values())

  const filteredRows = serviceRows.filter(r => {
    if (filterVehicle && r.vehicle_id !== filterVehicle) return false
    if (filterOverdue) {
      const veh = vehicles.find(v => v.id === r.vehicle_id)
      const days = daysUntil(r.next_service_due_date)
      const milesLeft = r.next_service_due_miles != null && veh ? r.next_service_due_miles - veh.current_mileage : null
      const overdue = (days !== null && days < 0) || (milesLeft !== null && milesLeft < 0)
      if (!overdue) return false
    }
    return true
  })

  // Cost totals
  const now = new Date()
  const monthCost = records
    .filter(r => { const d = new Date(r.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((s, r) => s + (r.cost || 0), 0)
  const yearCost = records
    .filter(r => new Date(r.created_at).getFullYear() === now.getFullYear())
    .reduce((s, r) => s + (r.cost || 0), 0)
  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0)

  const overdueCount = serviceRows.filter(r => {
    const veh = vehicles.find(v => v.id === r.vehicle_id)
    const days = daysUntil(r.next_service_due_date)
    const milesLeft = r.next_service_due_miles != null && veh ? r.next_service_due_miles - veh.current_mileage : null
    return (days !== null && days < 0) || (milesLeft !== null && milesLeft < 0)
  }).length

  const ticketCounts = TICKET_STATUSES.reduce((acc, s) => { acc[s] = tickets.filter(t => t.status === s).length; return acc }, {} as Record<string, number>)
  const filteredTickets = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Photo lightbox */}
      {photoLightbox && (
        <div onClick={() => setPhotoLightbox(null)} style={{ position: 'fixed', inset: 0, background: '#000000e0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={photoLightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setPhotoLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: '#ffffff20', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={22} />
          </button>
        </div>
      )}

      {/* Ticket detail panel */}
      {selectedTicket && (
        <>
          <div onClick={() => setSelectedTicket(null)} style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 40 }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 540, background: 'var(--surface)', borderLeft: '1px solid #2a2d3a', zIndex: 50, overflow: 'auto', maxWidth: '100vw' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2d3a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text1)', marginBottom: 8 }}>{selectedTicket.subject}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${TICKET_STATUS_COLORS[selectedTicket.status] || 'var(--text2)'}20`, color: TICKET_STATUS_COLORS[selectedTicket.status] || 'var(--text2)' }}>
                    {selectedTicket.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {selectedTicket.is_warranty_eligible && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--green)20', color: 'var(--green)' }}>WARRANTY ELIGIBLE</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 14, background: 'var(--surface2)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 6 }}>CUSTOMER</div>
                  <div style={{ fontWeight: 700, color: 'var(--text1)' }}>{selectedTicket.customer?.name || '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{selectedTicket.customer?.email}</div>
                </div>
                <div style={{ padding: 14, background: 'var(--surface2)', borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 6 }}>VEHICLE</div>
                  <div style={{ fontWeight: 700, color: 'var(--text1)' }}>{[selectedTicket.vehicle_year, selectedTicket.vehicle_make, selectedTicket.vehicle_model].filter(Boolean).join(' ') || '—'}</div>
                  {selectedTicket.install_date && <div style={{ fontSize: 13, color: 'var(--text2)' }}>Installed: {fmt(selectedTicket.install_date)}</div>}
                  {selectedTicket.warranty_expiry && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Shield size={12} color={new Date() < new Date(selectedTicket.warranty_expiry) ? 'var(--green)' : 'var(--text3)'} />
                      <span style={{ fontSize: 12, color: new Date() < new Date(selectedTicket.warranty_expiry) ? 'var(--green)' : 'var(--text3)' }}>
                        Warranty until {fmt(selectedTicket.warranty_expiry)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {selectedTicket.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>DESCRIPTION</div>
                  <div style={{ color: 'var(--text2)', lineHeight: 1.6, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10 }}>{selectedTicket.description}</div>
                </div>
              )}
              {selectedTicket.photos?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 10 }}>PHOTOS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {selectedTicket.photos.map((url, i) => (
                      <div key={i} onClick={() => setPhotoLightbox(url)} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'var(--surface2)', position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: '#00000060', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0')}>
                          <ZoomIn size={20} color="#fff" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 10 }}>UPDATE STATUS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TICKET_STATUSES.map(s => {
                    const active = selectedTicket.status === s
                    const color = TICKET_STATUS_COLORS[s] || 'var(--text2)'
                    return (
                      <button key={s} onClick={() => updateTicket(selectedTicket.id, { status: s })} disabled={ticketUpdating}
                        style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${active ? color : '#2a2d3a'}`, background: active ? `${color}20` : 'var(--surface2)', color: active ? color : 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400 }}>
                        {s.replace('_', ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>
              {selectedTicket.status === 'resolved' && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>RESOLUTION NOTES</div>
                  <textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how this was resolved…"
                    style={{ width: '100%', minHeight: 80, padding: '10px 12px', background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 10, color: 'var(--text1)', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => updateTicket(selectedTicket.id, { resolution_notes: resolution })} disabled={ticketUpdating}
                    style={{ marginTop: 8, padding: '8px 16px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    Save Resolution
                  </button>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                {!showInternalNotes ? (
                  <button onClick={() => setShowInternalNotes(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                    + Add Internal Notes
                  </button>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>INTERNAL NOTES</div>
                    <textarea value={internalNotes || selectedTicket.internal_notes || ''} onChange={e => setInternalNotes(e.target.value)} placeholder="Private notes for staff…"
                      style={{ width: '100%', minHeight: 80, padding: '10px 12px', background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 10, color: 'var(--text1)', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                    <button onClick={() => updateTicket(selectedTicket.id, { internal_notes: internalNotes || selectedTicket.internal_notes || '' })} disabled={ticketUpdating}
                      style={{ marginTop: 8, padding: '8px 16px', background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 8, cursor: 'pointer', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>
                      Save Notes
                    </button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedTicket.project && (
                  <Link href={`/projects/${selectedTicket.project.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 12, color: 'var(--text1)', textDecoration: 'none' }}>
                    <ExternalLink size={18} color="var(--accent)" />
                    <div><div style={{ fontWeight: 600 }}>View Original Job</div><div style={{ fontSize: 13, color: 'var(--text2)' }}>{selectedTicket.project.title}</div></div>
                  </Link>
                )}
                <Link href={`/estimates/new?customer_id=${selectedTicket.customer?.id || ''}&vehicle=${encodeURIComponent([selectedTicket.vehicle_year, selectedTicket.vehicle_make, selectedTicket.vehicle_model].filter(Boolean).join(' '))}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--accent)15', border: '1px solid var(--accent)40', borderRadius: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                  <FolderPlus size={18} />
                  <div><div style={{ fontWeight: 600 }}>Create Job From Ticket</div><div style={{ fontSize: 13, color: 'var(--text2)' }}>Pre-fills vehicle + customer info</div></div>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-barlow)', color: 'var(--text1)', margin: 0 }}>Maintenance</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Fleet service schedule + customer wrap tickets</p>
        </div>
        {tab === 'fleet' && isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={15} /> Log Service
          </button>
        )}
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {[
          ['fleet', 'Fleet Service'],
          ['tickets', `Wrap Tickets${tickets.length > 0 ? ` (${tickets.filter(t => t.status === 'open').length})` : ''}`],
        ].map(([key, label]) => (
          <button key={key} onClick={() => handleTabChange(key as 'fleet' | 'tickets')} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 14,
          }}>{label}</button>
        ))}
      </div>

      {/* ── FLEET SERVICE TAB ────────────────────────────────────────── */}
      {tab === 'fleet' && (
        <div>
          {/* Cost stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'This Month', value: `$${monthCost.toFixed(2)}`, color: 'var(--cyan)' },
              { label: 'This Year', value: `$${yearCost.toFixed(2)}`, color: 'var(--amber)' },
              { label: 'Total Spent', value: `$${totalCost.toFixed(2)}`, color: 'var(--text1)' },
              { label: 'Overdue', value: overdueCount.toString(), color: overdueCount > 0 ? 'var(--red)' : 'var(--green)' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2d3a' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
              <option value="">All Vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}{v.plate ? ` (${v.plate})` : ''}</option>)}
            </select>
            <button onClick={() => setFilterOverdue(f => !f)} style={{
              padding: '9px 14px', borderRadius: 8, border: `1px solid ${filterOverdue ? 'var(--red)' : '#2a2d3a'}`,
              background: filterOverdue ? 'var(--red)22' : 'transparent', color: filterOverdue ? 'var(--red)' : 'var(--text2)',
              cursor: 'pointer', fontSize: 13, fontWeight: filterOverdue ? 700 : 400, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <AlertTriangle size={14} /> Overdue Only
            </button>
          </div>

          {/* Table */}
          {filteredRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a' }}>
              <Wrench size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>{filterOverdue ? 'No overdue service items.' : 'No service records yet.'}</div>
              {!filterOverdue && isAdmin && <div style={{ fontSize: 13, marginTop: 8 }}>Log the first service to start tracking.</div>}
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                    {['Vehicle', 'Service Type', 'Last Done', 'Mileage', 'Next Due', 'Cost', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(rec => {
                    const veh = vehicles.find(v => v.id === rec.vehicle_id)
                    const milesLeft = rec.next_service_due_miles != null && veh ? rec.next_service_due_miles - veh.current_mileage : null
                    const days = daysUntil(rec.next_service_due_date)
                    const badge = statusBadge(days, milesLeft)
                    return (
                      <tr key={rec.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>
                            {veh ? `${veh.year} ${veh.make} ${veh.model}` : '—'}
                          </div>
                          {veh?.plate && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{veh.plate}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>
                          {MAINT_TYPES.find(t => t.value === rec.type)?.label ?? rec.type}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {rec.created_at.split('T')[0]}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text1)', whiteSpace: 'nowrap' }}>
                          {rec.mileage_at_service ? Number(rec.mileage_at_service).toLocaleString() + ' mi' : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {rec.next_service_due_date ? rec.next_service_due_date : ''}
                          {rec.next_service_due_miles ? <div style={{ fontFamily: 'var(--font-mono)' }}>{Number(rec.next_service_due_miles).toLocaleString()} mi</div> : ''}
                          {!rec.next_service_due_date && !rec.next_service_due_miles && '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                          ${Number(rec.cost).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {(rec.next_service_due_date || rec.next_service_due_miles) ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${badge.color}20`, color: badge.color, whiteSpace: 'nowrap' }}>
                              {badge.label}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── WRAP TICKETS TAB ─────────────────────────────────────────── */}
      {tab === 'tickets' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {['all', ...TICKET_STATUSES].map(s => {
              const count = s === 'all' ? tickets.length : ticketCounts[s] || 0
              const active = filterStatus === s
              const color = s === 'all' ? 'var(--accent)' : TICKET_STATUS_COLORS[s] || 'var(--text2)'
              return (
                <button key={s} onClick={() => { setFilterStatus(s); if (!ticketsLoaded) loadTickets() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1px solid ${active ? color : '#2a2d3a'}`, background: active ? `${color}20` : 'var(--surface2)', color: active ? color : 'var(--text2)', cursor: 'pointer', fontWeight: active ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                  <span style={{ background: active ? `${color}30` : 'var(--surface)', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: active ? color : 'var(--text3)' }}>{count}</span>
                </button>
              )
            })}
            <button onClick={loadTickets} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 20, cursor: 'pointer', color: 'var(--text2)', fontSize: 13 }}>
              <RefreshCw size={14} />
            </button>
          </div>

          {ticketsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : !ticketsLoaded ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
              <button onClick={loadTickets} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Load Tickets</button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text3)' }}>
              <CheckCircle2 size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>No tickets</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTickets.map(t => {
                const sc = TICKET_STATUS_COLORS[t.status] || 'var(--text2)'
                return (
                  <div key={t.id} onClick={() => { setSelectedTicket(t); setInternalNotes(t.internal_notes || ''); setResolution(t.resolution_notes || ''); setShowInternalNotes(!!(t.internal_notes)) }}
                    style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid #2a2d3a', borderRadius: 14, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)60')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#2a2d3a')}>
                    <div style={{ width: 4, borderRadius: 2, background: sc, alignSelf: 'stretch', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{t.subject}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${sc}20`, color: sc, flexShrink: 0, marginLeft: 12 }}>
                          {t.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--text2)' }}>
                        {t.customer && <span>{t.customer.name}</span>}
                        {(t.vehicle_year || t.vehicle_make) && <span style={{ color: 'var(--text3)' }}>· {[t.vehicle_year, t.vehicle_make, t.vehicle_model].filter(Boolean).join(' ')}</span>}
                        <span style={{ color: 'var(--text3)' }}>{fmtAgo(t.created_at)}</span>
                      </div>
                      {t.photos?.length > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                          <Camera size={12} /> {t.photos.length} photo{t.photos.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ADD SERVICE MODAL ─────────────────────────────────────────── */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: 500, border: '1px solid #2a2d3a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Log Service</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddService}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Vehicle *</label>
                <select value={addForm.vehicle_id} onChange={e => setAddForm(p => ({ ...p, vehicle_id: e.target.value }))} style={inputStyle} required>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}{v.plate ? ` (${v.plate})` : ''}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Service Type *</label>
                <select value={addForm.type} onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  {MAINT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={labelStyle}>Cost ($)</label><input type="number" step="0.01" value={addForm.cost} onChange={e => setAddForm(p => ({ ...p, cost: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Mileage at Service</label><input type="number" value={addForm.mileage_at_service} onChange={e => setAddForm(p => ({ ...p, mileage_at_service: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Next Due (miles)</label><input type="number" value={addForm.next_service_due_miles} onChange={e => setAddForm(p => ({ ...p, next_service_due_miles: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Next Due (date)</label><input type="date" value={addForm.next_service_due_date} onChange={e => setAddForm(p => ({ ...p, next_service_due_date: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 12 }}><label style={labelStyle}>Description</label><input value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} style={inputStyle} /></div>
              <div style={{ marginBottom: 16 }}><label style={labelStyle}>Performed By</label><input value={addForm.performed_by} onChange={e => setAddForm(p => ({ ...p, performed_by: e.target.value }))} placeholder="Shop or mechanic name" style={inputStyle} /></div>
              {addError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{addError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={addSaving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                  {addSaving ? 'Saving...' : 'Log Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
