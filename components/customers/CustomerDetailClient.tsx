'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, User, Calendar, Briefcase,
  Edit2, Save, X, ExternalLink,
  Activity, Link2, ClipboardList, StickyNote, FileText, DollarSign,
  Heart, Tag, Plus, Check, Star, TrendingUp, Clock, Trash2, ChevronRight,
  Car, Users, AlertCircle, CreditCard, Receipt, Truck, Loader2, Shield,
  Camera, Download, Filter,
} from 'lucide-react'
import CustomerLoyaltyPanel from '@/components/customers/CustomerLoyaltyPanel'
import ClickToCallButton from '@/components/phone/ClickToCallButton'
import CustomerSearchModal, { type CustomerRow } from '@/components/shared/CustomerSearchModal'
import type { Profile } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Existing interfaces ──────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  company_name?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  lead_source?: string
  notes?: string
  created_at: string
  org_id?: string
}

interface Project {
  id: string
  title: string
  vehicle_desc?: string
  status: string
  pipe_stage?: string
  revenue?: number
  created_at: string
  updated_at?: string
  type?: string
  priority?: string
}

interface Props {
  profile: Profile
  customer: Customer
  projects: Project[]
}

// ─── New interfaces for tabs ──────────────────────────────────────────────────

interface ActivityEntry {
  id: string
  type: 'job' | 'quote' | 'email' | 'call' | 'note' | 'payment' | 'appointment'
  description: string
  date: string
  icon: 'Briefcase' | 'FileText' | 'Mail' | 'Phone' | 'StickyNote' | 'DollarSign' | 'Calendar'
  meta?: string
}

interface CustomerTask {
  id: string
  title: string
  completed: boolean
  created_at: string
  due_date?: string
}

interface CustomerNote {
  id: string
  content: string
  author: string
  created_at: string
}

interface CustomerAppointment {
  id: string
  title: string
  date: string
  time: string
  description?: string
}

interface CustomerDocument {
  id: string
  type: 'estimate' | 'invoice' | 'contract' | 'sales_order'
  title: string
  status: string
  amount?: number
  created_at: string
}

interface CustomerPayment {
  id: string
  invoice_id: string
  invoice_title: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'partial'
  date: string
  method?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  inbound: '#22c07a', outbound: '#4f7fff', referral: '#8b5cf6',
  walk_in: '#22d3ee', repeat: '#f59e0b', cross_referral: '#f25a5a',
}

const STATUS_BADGE: Record<string, string> = {
  estimate: 'badge-gray', active: 'badge-accent', in_production: 'badge-green',
  install_scheduled: 'badge-cyan', installed: 'badge-green', qc: 'badge-amber',
  closing: 'badge-purple', closed: 'badge-gray', cancelled: 'badge-red',
}

const STATUS_LABEL: Record<string, string> = {
  estimate: 'Estimate', active: 'Active', in_production: 'In Production',
  install_scheduled: 'Install Sched.', installed: 'Installed', qc: 'QC',
  closing: 'Closing', closed: 'Closed', cancelled: 'Cancelled',
}

const LEAD_SOURCE_OPTIONS = [
  'inbound', 'outbound', 'referral', 'walk_in', 'repeat', 'cross_referral',
  'google', 'social_media', 'trade_show', 'website', 'yelp', 'other',
]

const ALL_TAGS = ['fleet', 'repeat', 'VIP', 'prospect', 'commercial', 'residential', 'referral'] as const
type CustomerTag = typeof ALL_TAGS[number]

const TAG_COLORS: Record<CustomerTag, string> = {
  fleet: '#4f7fff',
  repeat: '#22c07a',
  VIP: '#f59e0b',
  prospect: '#22d3ee',
  commercial: '#8b5cf6',
  residential: '#f25a5a',
  referral: '#f59e0b',
}

type TabKey = 'activity' | 'associations' | 'tasks' | 'notes' | 'appointments' | 'documents' | 'payments' | 'fleet' | 'photos'

const TAB_DEFS: { key: TabKey; label: string; Icon: typeof Activity }[] = [
  { key: 'activity', label: 'Activity', Icon: Activity },
  { key: 'photos', label: 'Photos', Icon: Camera },
  { key: 'fleet', label: 'Fleet', Icon: Truck },
  { key: 'associations', label: 'Associations', Icon: Link2 },
  { key: 'tasks', label: 'Tasks', Icon: ClipboardList },
  { key: 'notes', label: 'Notes', Icon: StickyNote },
  { key: 'appointments', label: 'Appointments', Icon: Calendar },
  { key: 'documents', label: 'Documents', Icon: FileText },
  { key: 'payments', label: 'Payments', Icon: DollarSign },
]

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: '#22c07a', pending: '#f59e0b', overdue: '#f25a5a', partial: '#22d3ee',
}

const ACTIVITY_ICONS: Record<string, typeof Briefcase> = {
  Briefcase, FileText, Mail, Phone, StickyNote, DollarSign, Calendar,
}

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ─── Demo data generators ─────────────────────────────────────────────────────

function generateDemoActivity(projects: Project[], customerName: string): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  // Activity from real projects
  projects.forEach(p => {
    entries.push({
      id: `job-${p.id}`,
      type: 'job',
      description: `Job created: ${p.title}`,
      date: p.created_at,
      icon: 'Briefcase',
      meta: p.vehicle_desc || undefined,
    })
    if (p.status === 'closed' && p.revenue) {
      entries.push({
        id: `pay-${p.id}`,
        type: 'payment',
        description: `Payment received for ${p.title} - ${fmtMoney(p.revenue)}`,
        date: p.updated_at || p.created_at,
        icon: 'DollarSign',
      })
    }
  })

  // Fill in some demo entries if activity is sparse
  if (entries.length < 5) {
    const now = new Date()
    entries.push(
      {
        id: 'demo-email-1',
        type: 'email',
        description: `Follow-up email sent to ${customerName}`,
        date: new Date(now.getTime() - 2 * 86400000).toISOString(),
        icon: 'Mail',
      },
      {
        id: 'demo-call-1',
        type: 'call',
        description: `Introductory call with ${customerName}`,
        date: new Date(now.getTime() - 5 * 86400000).toISOString(),
        icon: 'Phone',
        meta: 'Duration: 12 min',
      },
      {
        id: 'demo-note-1',
        type: 'note',
        description: 'Interested in full fleet wrap for delivery vans',
        date: new Date(now.getTime() - 7 * 86400000).toISOString(),
        icon: 'StickyNote',
      },
      {
        id: 'demo-quote-1',
        type: 'quote',
        description: 'Estimate #1042 sent for review',
        date: new Date(now.getTime() - 10 * 86400000).toISOString(),
        icon: 'FileText',
        meta: '$4,500',
      },
      {
        id: 'demo-appt-1',
        type: 'appointment',
        description: 'Scheduled vehicle measurement appointment',
        date: new Date(now.getTime() - 14 * 86400000).toISOString(),
        icon: 'Calendar',
      }
    )
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function generateDemoDocuments(projects: Project[]): CustomerDocument[] {
  const docs: CustomerDocument[] = []
  projects.forEach(p => {
    docs.push({
      id: `est-${p.id}`,
      type: 'estimate',
      title: `Estimate - ${p.title}`,
      status: p.status === 'cancelled' ? 'declined' : 'approved',
      amount: p.revenue || 0,
      created_at: p.created_at,
    })
    if (!['estimate', 'cancelled'].includes(p.status)) {
      docs.push({
        id: `so-${p.id}`,
        type: 'sales_order',
        title: `Sales Order - ${p.title}`,
        status: 'confirmed',
        amount: p.revenue || 0,
        created_at: p.created_at,
      })
    }
    if (p.status === 'closed') {
      docs.push({
        id: `inv-${p.id}`,
        type: 'invoice',
        title: `Invoice - ${p.title}`,
        status: 'paid',
        amount: p.revenue || 0,
        created_at: p.updated_at || p.created_at,
      })
    }
  })
  if (docs.length === 0) {
    const now = new Date()
    docs.push(
      {
        id: 'demo-est-1',
        type: 'estimate',
        title: 'Estimate #1042 - Full Wrap',
        status: 'pending',
        amount: 4500,
        created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      },
      {
        id: 'demo-contract-1',
        type: 'contract',
        title: 'Service Agreement 2026',
        status: 'sent',
        amount: undefined,
        created_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
      }
    )
  }
  return docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function generateDemoPayments(projects: Project[]): CustomerPayment[] {
  const payments: CustomerPayment[] = []
  projects.forEach(p => {
    if (p.status === 'closed' && p.revenue) {
      payments.push({
        id: `pmt-${p.id}`,
        invoice_id: `inv-${p.id}`,
        invoice_title: `Invoice - ${p.title}`,
        amount: p.revenue,
        status: 'paid',
        date: p.updated_at || p.created_at,
        method: 'Credit Card',
      })
    } else if (!['cancelled', 'estimate'].includes(p.status) && p.revenue) {
      payments.push({
        id: `pmt-${p.id}`,
        invoice_id: `inv-${p.id}`,
        invoice_title: `Invoice - ${p.title}`,
        amount: p.revenue,
        status: 'pending',
        date: p.created_at,
      })
    }
  })
  if (payments.length === 0) {
    const now = new Date()
    payments.push(
      {
        id: 'demo-pmt-1',
        invoice_id: 'demo-inv-1',
        invoice_title: 'Invoice #1018 - Partial Wrap',
        amount: 2200,
        status: 'paid',
        date: new Date(now.getTime() - 30 * 86400000).toISOString(),
        method: 'ACH Transfer',
      },
      {
        id: 'demo-pmt-2',
        invoice_id: 'demo-inv-2',
        invoice_title: 'Invoice #1042 - Full Wrap',
        amount: 4500,
        status: 'pending',
        date: new Date(now.getTime() - 3 * 86400000).toISOString(),
      }
    )
  }
  return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ─── Health score calculator ──────────────────────────────────────────────────

function calcHealthScore(projects: Project[], totalRevenue: number): number {
  if (projects.length === 0) return 15

  // Recency: days since last activity (lower is better)
  const dates = projects.map(p => new Date(p.updated_at || p.created_at).getTime())
  const latestDate = Math.max(...dates)
  const daysSinceLast = Math.floor((Date.now() - latestDate) / 86400000)
  let recencyScore = 0
  if (daysSinceLast <= 7) recencyScore = 40
  else if (daysSinceLast <= 30) recencyScore = 30
  else if (daysSinceLast <= 90) recencyScore = 20
  else if (daysSinceLast <= 180) recencyScore = 10
  else recencyScore = 5

  // Frequency: number of projects
  let frequencyScore = 0
  if (projects.length >= 5) frequencyScore = 30
  else if (projects.length >= 3) frequencyScore = 25
  else if (projects.length >= 2) frequencyScore = 15
  else frequencyScore = 8

  // Value: total revenue
  let valueScore = 0
  if (totalRevenue >= 15000) valueScore = 30
  else if (totalRevenue >= 7500) valueScore = 25
  else if (totalRevenue >= 3000) valueScore = 18
  else if (totalRevenue >= 1000) valueScore = 10
  else valueScore = 5

  return Math.min(100, recencyScore + frequencyScore + valueScore)
}

function healthColor(score: number): string {
  if (score >= 70) return '#22c07a'
  if (score >= 40) return '#f59e0b'
  return '#f25a5a'
}

function healthLabel(score: number): string {
  if (score >= 70) return 'Healthy'
  if (score >= 40) return 'At Risk'
  return 'Needs Attention'
}

// ─── Customer Fleet Panel ─────────────────────────────────────────────────────

interface FleetVehicle {
  id: string
  year: string | null
  make: string | null
  model: string | null
  vin: string | null
  color: string | null
  wrap_status: string
}

function CustomerFleetPanel({ customerId, orgId }: { customerId: string; orgId: string }) {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ year: '', make: '', model: '', vin: '', color: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('fleet_vehicles')
      .select('id, year, make, model, vin, color, wrap_status')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    setVehicles(data || [])
    setLoading(false)
  }, [customerId, supabase])

  useEffect(() => { load() }, [load])

  const addVehicle = async () => {
    setSaving(true)
    await fetch('/api/fleet/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, customer_id: customerId, source: 'customer-onboarding' }),
    })
    setShowAdd(false)
    setAddForm({ year: '', make: '', model: '', vin: '', color: '' })
    setSaving(false)
    load()
  }

  const WRAP_BADGE: Record<string, { bg: string; color: string }> = {
    none: { bg: 'rgba(90,96,128,0.15)', color: 'var(--text3)' },
    quoted: { bg: 'rgba(245,158,11,0.15)', color: 'var(--amber)' },
    scheduled: { bg: 'rgba(79,127,255,0.15)', color: 'var(--accent)' },
    'in-progress': { bg: 'rgba(139,92,246,0.15)', color: 'var(--purple)' },
    wrapped: { bg: 'rgba(34,192,122,0.15)', color: 'var(--green)' },
  }

  const fs: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 12, outline: 'none',
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Privacy banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
        background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
        marginBottom: 16, fontSize: 12, color: 'var(--text2)',
      }}>
        <Shield size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        Privacy Mode: Only name and business name are stored for communication safety.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Customer Fleet ({vehicles.length})
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6,
            fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: '#fff',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add Vehicle
        </button>
      </div>

      {showAdd && (
        <div style={{
          padding: 12, borderRadius: 8, background: 'var(--surface2)', marginBottom: 12,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 8 }}>
            <input style={fs} placeholder="Year" value={addForm.year} onChange={e => setAddForm(f => ({ ...f, year: e.target.value }))} />
            <input style={fs} placeholder="Make" value={addForm.make} onChange={e => setAddForm(f => ({ ...f, make: e.target.value }))} />
            <input style={fs} placeholder="Model" value={addForm.model} onChange={e => setAddForm(f => ({ ...f, model: e.target.value }))} />
            <input style={{ ...fs, fontFamily: 'JetBrains Mono, monospace' }} placeholder="VIN" value={addForm.vin}
              onChange={e => setAddForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))} maxLength={17} />
            <input style={fs} placeholder="Color" value={addForm.color} onChange={e => setAddForm(f => ({ ...f, color: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12, background: 'none',
              border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={addVehicle} disabled={saving} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Add
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>
          <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text3)', fontSize: 13 }}>
          <Truck size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.3 }} />
          No vehicles in this customer&apos;s fleet yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {vehicles.map(v => {
            const wb = WRAP_BADGE[v.wrap_status] || WRAP_BADGE.none
            return (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface2)',
              }}>
                <Truck size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                    {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown'}
                    {v.color && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>{v.color}</span>}
                  </div>
                  {v.vin && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                      VIN: {v.vin}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: wb.bg, color: wb.color, textTransform: 'capitalize',
                }}>
                  {v.wrap_status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Customer Photos Tab ──────────────────────────────────────────────────────
interface AllPhoto {
  id: string
  source_type: string
  project_id: string | null
  customer_id: string | null
  photo_url: string | null
  caption: string | null
  category: string | null
  created_at: string
  uploaded_by: string | null
  job_title: string | null
  vehicle_desc: string | null
}

const PHOTO_CATS = ['all', 'before', 'after', 'design', 'vehicle'] as const
type PhotoCat = typeof PHOTO_CATS[number]

const CAT_COLORS: Record<string, string> = {
  before: '#f59e0b', after: '#22c07a', design: '#8b5cf6', vehicle: '#22d3ee',
}

function CustomerPhotosTab({ customerId }: { customerId: string }) {
  const supabase = createClient()
  const [photos, setPhotos] = useState<AllPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<PhotoCat>('all')
  const [filterJob, setFilterJob] = useState<string>('all')
  const [lightbox, setLightbox] = useState<AllPhoto | null>(null)

  useEffect(() => {
    supabase.from('customer_all_photos')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPhotos(data || []); setLoading(false) })
  }, [customerId])

  const jobs = Array.from(new Set(photos.map(p => p.job_title).filter(Boolean))) as string[]
  const filtered = photos.filter(p => {
    const catOk = filterCat === 'all' || (p.category || '').toLowerCase().includes(filterCat)
    const jobOk = filterJob === 'all' || p.job_title === filterJob
    return catOk && jobOk
  })

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
      <Loader2 size={24} className="animate-spin" style={{ opacity: 0.5, display: 'block', margin: '0 auto 8px' }} />
      Loading photos...
    </div>
  )
  if (!photos.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
      <Camera size={40} style={{ opacity: 0.25, display: 'block', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 15, fontWeight: 600 }}>No photos yet</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Photos from all jobs for this customer will appear here.</div>
    </div>
  )

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} style={{ color: 'var(--text3)' }} />
        {PHOTO_CATS.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
              background: filterCat === cat ? (CAT_COLORS[cat] || 'var(--accent)') : 'var(--surface2)',
              color: filterCat === cat ? '#fff' : 'var(--text2)',
            }}
          >
            {cat === 'all' ? `All (${photos.length})` : cat}
          </button>
        ))}
        {jobs.length > 1 && (
          <select
            value={filterJob}
            onChange={e => setFilterJob(e.target.value)}
            style={{
              padding: '4px 10px', borderRadius: 20, border: '1px solid var(--surface2)',
              background: 'var(--surface2)', color: 'var(--text2)', fontSize: 11, marginLeft: 8,
            }}
          >
            <option value="all">All Jobs</option>
            {jobs.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {filtered.map(photo => (
          <div
            key={`${photo.source_type}-${photo.id}`}
            onClick={() => setLightbox(photo)}
            style={{
              position: 'relative', borderRadius: 10, overflow: 'hidden',
              background: 'var(--surface2)', cursor: 'pointer',
              border: '1px solid var(--surface2)',
              aspectRatio: '4/3',
            }}
          >
            {photo.photo_url ? (
              <img
                src={photo.photo_url}
                alt={photo.caption || ''}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={24} style={{ opacity: 0.3 }} />
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '20px 8px 6px',
            }}>
              {photo.job_title && (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {photo.job_title}
                </div>
              )}
              {photo.category && (
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  color: CAT_COLORS[photo.category.toLowerCase()] || 'var(--text3)',
                }}>
                  {photo.category}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '100%' }}>
            {lightbox.photo_url && (
              <img
                src={lightbox.photo_url}
                alt={lightbox.caption || ''}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, display: 'block', margin: '0 auto' }}
              />
            )}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                {lightbox.job_title && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{lightbox.job_title}</div>
                )}
                {lightbox.caption && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{lightbox.caption}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {lightbox.photo_url && (
                  <a
                    href={lightbox.photo_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)', color: '#fff',
                      fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
                    }}
                  >
                    <Download size={13} /> Download
                  </a>
                )}
                <button
                  onClick={() => setLightbox(null)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerDetailClient({ profile, customer, projects }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // --- Existing state ---
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(!!customer.notes)
  const [form, setForm] = useState({
    name: customer.name || '',
    company_name: customer.company_name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    city: customer.city || '',
    state: customer.state || '',
    notes: customer.notes || '',
  })
  const [saved, setSaved] = useState(customer)

  // --- New state ---
  const [activeTab, setActiveTab] = useState<TabKey>('activity')
  const [leadSource, setLeadSource] = useState(customer.lead_source || '')
  const [tags, setTags] = useState<CustomerTag[]>(() => {
    // Initialize from local-demo or derive from projects
    const derived: CustomerTag[] = []
    if (projects.length >= 2) derived.push('repeat')
    if (projects.some(p => (p.revenue || 0) >= 5000)) derived.push('commercial')
    return derived
  })
  const [showTagPicker, setShowTagPicker] = useState(false)

  // Parent account state
  const [parentAccount, setParentAccount] = useState<CustomerRow | null>(
    (customer as any).linked_account_id
      ? { id: (customer as any).linked_account_id, name: (customer as any).linked_account_name || 'Parent Account', email: null, phone: null, company_name: null, lifetime_spend: null }
      : null
  )
  const [parentAccountModalOpen, setParentAccountModalOpen] = useState(false)

  async function handleSelectParentAccount(c: CustomerRow) {
    setParentAccount(c)
    setParentAccountModalOpen(false)
    await supabase.from('customers').update({ linked_account_id: c.id }).eq('id', customer.id).then(() => {}, () => {})
  }

  // Tasks state
  const [tasks, setTasks] = useState<CustomerTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loadedTasks, setLoadedTasks] = useState(false)

  // Notes state
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [loadedNotes, setLoadedNotes] = useState(false)

  // Appointments state
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([])
  const [newApptTitle, setNewApptTitle] = useState('')
  const [newApptDate, setNewApptDate] = useState('')
  const [newApptTime, setNewApptTime] = useState('')
  const [loadedAppointments, setLoadedAppointments] = useState(false)

  // --- Computed values ---
  const totalRevenue = projects.filter(p => p.status === 'closed').reduce((s, p) => s + (p.revenue || 0), 0)
  const activeJobs = projects.filter(p => !['closed', 'cancelled'].includes(p.status))
  const avgJobValue = projects.length > 0 ? totalRevenue / projects.length : 0
  const healthScore = calcHealthScore(projects, totalRevenue)

  // Unique vehicles from projects
  const vehicles = Array.from(new Set(projects.map(p => p.vehicle_desc).filter(Boolean))) as string[]

  // Generated tab data
  const activityEntries = generateDemoActivity(projects, saved.name)
  const documents = generateDemoDocuments(projects)
  const payments = generateDemoPayments(projects)

  // --- Load tasks from Supabase or fallback to demo ---
  const loadTasks = useCallback(async () => {
    if (loadedTasks) return
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        setTasks(data.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          title: (t.title as string) || (t.description as string) || '',
          completed: !!(t.completed || t.status === 'done'),
          created_at: t.created_at as string,
          due_date: (t.due_at || t.due_date) as string | undefined,
        })))
      } else {
        // Demo tasks
        const now = new Date()
        setTasks([
          { id: 'demo-t1', title: 'Follow up on wrap estimate', completed: false, created_at: new Date(now.getTime() - 86400000).toISOString(), due_date: new Date(now.getTime() + 2 * 86400000).toISOString() },
          { id: 'demo-t2', title: 'Schedule vehicle measurement', completed: false, created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
          { id: 'demo-t3', title: 'Send design mockup for review', completed: true, created_at: new Date(now.getTime() - 7 * 86400000).toISOString() },
        ])
      }
    } catch {
      const now = new Date()
      setTasks([
        { id: 'demo-t1', title: 'Follow up on wrap estimate', completed: false, created_at: new Date(now.getTime() - 86400000).toISOString(), due_date: new Date(now.getTime() + 2 * 86400000).toISOString() },
        { id: 'demo-t2', title: 'Schedule vehicle measurement', completed: false, created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
        { id: 'demo-t3', title: 'Send design mockup for review', completed: true, created_at: new Date(now.getTime() - 7 * 86400000).toISOString() },
      ])
    }
    setLoadedTasks(true)
  }, [customer.id, loadedTasks, supabase])

  // --- Load notes ---
  const loadNotes = useCallback(async () => {
    if (loadedNotes) return
    try {
      const { data, error } = await supabase
        .from('communication_log')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('type', 'note')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        setCustomerNotes(data.map((n: Record<string, unknown>) => ({
          id: n.id as string,
          content: (n.content as string) || (n.message as string) || '',
          author: (n.author_name as string) || profile.name || 'Team',
          created_at: n.created_at as string,
        })))
      } else {
        const now = new Date()
        setCustomerNotes([
          { id: 'demo-n1', content: 'Customer prefers matte finishes over gloss. Has a fleet of 8 delivery vans that may need wrapping over the next 6 months.', author: profile.name || 'Sales Team', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
          { id: 'demo-n2', content: 'Mentioned interest in storefront signage as well. Refer to signage dept when ready.', author: 'Admin', created_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
        ])
      }
    } catch {
      const now = new Date()
      setCustomerNotes([
        { id: 'demo-n1', content: 'Customer prefers matte finishes over gloss. Has a fleet of 8 delivery vans that may need wrapping over the next 6 months.', author: profile.name || 'Sales Team', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
        { id: 'demo-n2', content: 'Mentioned interest in storefront signage as well. Refer to signage dept when ready.', author: 'Admin', created_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
      ])
    }
    setLoadedNotes(true)
  }, [customer.id, loadedNotes, profile.name, supabase])

  // --- Load appointments ---
  const loadAppointments = useCallback(async () => {
    if (loadedAppointments) return
    // Demo data - no dedicated appointments table yet
    const now = new Date()
    setAppointments([
      { id: 'demo-a1', title: 'Vehicle Measurement', date: format(new Date(now.getTime() + 3 * 86400000), 'yyyy-MM-dd'), time: '10:00 AM', description: 'Measure delivery van for full wrap' },
      { id: 'demo-a2', title: 'Design Review', date: format(new Date(now.getTime() + 7 * 86400000), 'yyyy-MM-dd'), time: '2:00 PM', description: 'Review mockup designs with customer' },
      { id: 'demo-a3', title: 'Install Drop-off', date: format(new Date(now.getTime() + 14 * 86400000), 'yyyy-MM-dd'), time: '8:00 AM', description: 'Vehicle drop-off for wrap installation' },
    ])
    setLoadedAppointments(true)
  }, [loadedAppointments])

  // Load tab data on tab switch
  useEffect(() => {
    if (activeTab === 'tasks') loadTasks()
    if (activeTab === 'notes') loadNotes()
    if (activeTab === 'appointments') loadAppointments()
  }, [activeTab, loadTasks, loadNotes, loadAppointments])

  // --- Existing save function ---
  async function saveEdits() {
    setSaving(true)
    const { error } = await supabase.from('customers').update(form).eq('id', customer.id)
    if (!error) {
      setSaved({ ...saved, ...form })
      setEditing(false)
    }
    setSaving(false)
  }

  // --- New handler functions ---

  async function updateLeadSource(val: string) {
    setLeadSource(val)
    setSaved(prev => ({ ...prev, lead_source: val }))
    await supabase.from('customers').update({ lead_source: val }).eq('id', customer.id).then(() => {}, () => {})
  }

  function toggleTag(tag: CustomerTag) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addTask() {
    if (!newTaskTitle.trim()) return
    const id = crypto.randomUUID()
    const task: CustomerTask = {
      id,
      title: newTaskTitle.trim(),
      completed: false,
      created_at: new Date().toISOString(),
    }
    setTasks(prev => [task, ...prev])
    setNewTaskTitle('')
    // Fire-and-forget save attempt
    supabase.from('tasks').insert({
      id: task.id,
      title: task.title,
      org_id: customer.org_id,
      customer_id: customer.id,
      status: 'pending',
      created_at: task.created_at,
    }).then(() => {}, () => {})
  }

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    const task = tasks.find(t => t.id === id)
    if (task && !task.id.startsWith('demo-')) {
      supabase.from('tasks').update({ status: task.completed ? 'pending' : 'done' }).eq('id', id).then(() => {}, () => {})
    }
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (!id.startsWith('demo-')) {
      supabase.from('tasks').delete().eq('id', id).then(() => {}, () => {})
    }
  }

  async function addNote() {
    if (!newNoteContent.trim()) return
    const tempId = `note-${Date.now()}`
    const note: CustomerNote = {
      id: tempId,
      content: newNoteContent.trim(),
      author: profile.name || 'You',
      created_at: new Date().toISOString(),
    }
    setCustomerNotes(prev => [note, ...prev])
    setNewNoteContent('')
    const { data } = await supabase.from('communication_log').insert({
      customer_id: customer.id,
      org_id: customer.org_id,
      type: 'note',
      content: note.content,
      author_name: note.author,
      created_at: note.created_at,
    }).select('id').single()
    // Replace temp id with real DB id
    if (data?.id) {
      setCustomerNotes(prev => prev.map(n => n.id === tempId ? { ...n, id: data.id } : n))
    }
  }

  function addAppointment() {
    if (!newApptTitle.trim() || !newApptDate) return
    const appt: CustomerAppointment = {
      id: `appt-${Date.now()}`,
      title: newApptTitle.trim(),
      date: newApptDate,
      time: newApptTime || '9:00 AM',
    }
    setAppointments(prev => [appt, ...prev].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setNewApptTitle('')
    setNewApptDate('')
    setNewApptTime('')
  }

  // --- Activity icon renderer ---
  function renderActivityIcon(iconName: string) {
    const IconComp = ACTIVITY_ICONS[iconName] || Activity
    const colorMap: Record<string, string> = {
      Briefcase: 'var(--accent)', FileText: 'var(--purple)', Mail: 'var(--cyan)',
      Phone: 'var(--green)', StickyNote: 'var(--amber)', DollarSign: 'var(--green)',
      Calendar: 'var(--accent)',
    }
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: `${colorMap[iconName] || 'var(--accent)'}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComp size={14} style={{ color: colorMap[iconName] || 'var(--accent)' }} />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Enhanced stats
  const lifetimeValue = totalRevenue
  const lastActivity = projects.length > 0 ? projects[0].updated_at || projects[0].created_at : saved.created_at
  const customerSince = saved.created_at ? format(new Date(saved.created_at), 'MMM yyyy') : '\u2014'
  const healthColorVal = healthColor(healthScore)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Back nav */}
      <button
        onClick={() => router.push('/customers')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, fontWeight: 600, padding: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >
        <ArrowLeft size={14} /> Back to Customers
      </button>

      {/* Header card - GoHighLevel style */}
      <div style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(79,127,255,0.03) 100%)',
        border: '1px solid var(--card-border)', borderRadius: 20,
        marginBottom: 16, padding: '24px 28px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle gradient accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${healthColorVal}, transparent)`, opacity: 0.5,
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Avatar with health ring */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(79,127,255,0.12)',
                border: `2.5px solid ${healthColorVal}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: 'var(--accent)',
                fontFamily: headingFont,
              }}>
                {(saved.name || 'C').charAt(0).toUpperCase()}
              </div>
              {/* Health score badge */}
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 22, height: 22, borderRadius: '50%',
                background: healthColorVal, color: '#fff',
                fontSize: 8, fontWeight: 800, fontFamily: monoFont,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 2.5px var(--card-bg)',
              }}>
                {healthScore}
              </div>
            </div>
            <div>
              {editing ? (
                <input
                  className="field"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}
                />
              ) : (
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont }}>
                  {saved.name}
                </div>
              )}
              {editing ? (
                <input
                  className="field"
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Company name"
                  style={{ fontSize: 12 }}
                />
              ) : saved.company_name ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Building2 size={12} /> {saved.company_name}
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  <X size={13} /> Cancel
                </button>
                <button
                  onClick={saveEdits}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              (profile.role === 'owner' || profile.role === 'admin' || profile.role === 'sales_agent') && (
                <button
                  onClick={() => setEditing(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  <Edit2 size={13} /> Edit
                </button>
              )
            )}
          </div>
        </div>

        {/* Contact info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          {editing ? (
            <>
              <div>
                <label className="field-label">Email</label>
                <input className="field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="field-label">City</label>
                <input className="field" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Miami" />
              </div>
              <div>
                <label className="field-label">State</label>
                <input className="field" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="FL" />
              </div>
            </>
          ) : (
            <>
              {saved.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                  <Mail size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <a href={`mailto:${saved.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{saved.email}</a>
                </div>
              )}
              {saved.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                  <Phone size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <a href={`tel:${saved.phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{saved.phone}</a>
                  <ClickToCallButton toNumber={saved.phone} toName={saved.name} size="sm" />
                </div>
              )}
              {(saved.city || saved.state) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                  <MapPin size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  {[saved.city, saved.state].filter(Boolean).join(', ')}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                <Calendar size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                Customer since {format(new Date(saved.created_at), 'MMM d, yyyy')}
              </div>
            </>
          )}
        </div>

        {/* Notes */}
        {editing ? (
          <div>
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}
              >
                + Add Notes
              </button>
            ) : (
              <>
                <label className="field-label">Notes</label>
                <textarea className="field resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this customer..." />
              </>
            )}
          </div>
        ) : saved.notes ? (
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text2)', borderLeft: '3px solid var(--accent)' }}>
            {saved.notes}
          </div>
        ) : null}

        {/* Lead Source + Tags row */}
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {/* Lead Source dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={13} style={{ color: 'var(--text3)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Source:</span>
            <select
              value={leadSource}
              onChange={e => updateLeadSource(e.target.value)}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--text1)', fontSize: 12, padding: '4px 8px', cursor: 'pointer',
                fontWeight: 600, textTransform: 'capitalize',
              }}
            >
              <option value="">-- Select --</option>
              {LEAD_SOURCE_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag size={13} style={{ color: 'var(--text3)' }} />
            {tags.map(tag => (
              <span
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: `${TAG_COLORS[tag]}18`, color: TAG_COLORS[tag],
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {tag}
                <X size={10} />
              </span>
            ))}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: '1px dashed var(--border)',
                  background: 'none', color: 'var(--text3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Plus size={12} />
              </button>
              {showTagPicker && (
                <div style={{
                  position: 'absolute', top: 28, left: 0, zIndex: 20,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: 8, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {ALL_TAGS.filter(t => !tags.includes(t)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => { toggleTag(tag); setShowTagPicker(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 8px', borderRadius: 6, border: 'none',
                        background: 'none', color: TAG_COLORS[tag], fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: TAG_COLORS[tag] }} />
                      {tag}
                    </button>
                  ))}
                  {ALL_TAGS.filter(t => !tags.includes(t)).length === 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', padding: 4 }}>All tags applied</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Source badge (existing, only show if no lead source dropdown value) */}
        {saved.lead_source && !leadSource && (
          <div style={{ marginTop: 12 }}>
            <span style={{
              display: 'inline-flex', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: `${SOURCE_COLORS[saved.lead_source] || '#5a6080'}18`,
              color: SOURCE_COLORS[saved.lead_source] || '#5a6080',
              textTransform: 'capitalize',
            }}>
              {saved.lead_source.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Stats row - Tesla style */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Lifetime Value', value: fmtMoney(lifetimeValue), color: 'var(--green)', Icon: DollarSign },
          { label: 'Total Jobs', value: projects.length.toString(), color: 'var(--accent)', Icon: Briefcase },
          { label: 'Avg Job Value', value: fmtMoney(avgJobValue), color: 'var(--purple)', Icon: TrendingUp },
          { label: 'Last Activity', value: lastActivity ? formatDistanceToNow(new Date(lastActivity), { addSuffix: true }) : '\u2014', color: 'var(--amber)', Icon: Clock },
          { label: 'Customer Since', value: customerSince, color: 'var(--cyan)', Icon: Calendar },
        ].map(stat => (
          <div key={stat.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="metric-label">{stat.label}</span>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.Icon size={12} style={{ color: stat.color }} />
              </div>
            </div>
            <div style={{ fontSize: stat.label === 'Lifetime Value' ? 22 : 18, fontWeight: 800, color: stat.color, fontFamily: monoFont }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Loyalty */}
      <div style={{ marginBottom: 16 }}>
        <CustomerLoyaltyPanel
          customerId={customer.id}
          customerName={saved.name || 'Customer'}
        />
      </div>

      {/* ─── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 0, padding: '4px',
        background: 'var(--surface2)', borderRadius: 12,
        border: '1px solid var(--card-border)',
        overflowX: 'auto',
      }}>
        {TAB_DEFS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', border: 'none',
                background: 'none', cursor: 'pointer',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700,
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <tab.Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>

        {/* ── Activity Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Activity Timeline ({activityEntries.length})
            </div>
            {activityEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No activity recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activityEntries.map((entry, idx) => (
                  <div key={entry.id} style={{
                    display: 'flex', gap: 12, padding: '12px 0',
                    borderBottom: idx < activityEntries.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    {renderActivityIcon(entry.icon)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>
                        {entry.description}
                      </div>
                      {entry.meta && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{entry.meta}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                        {' '}&middot;{' '}
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)',
                      alignSelf: 'flex-start', whiteSpace: 'nowrap',
                    }}>
                      {entry.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Associations Tab ───────────────────────────────────────────────── */}
        {activeTab === 'associations' && (
          <div style={{ padding: '16px 20px' }}>
            {/* Linked Jobs */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Briefcase size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Linked Jobs ({projects.length})
                </span>
              </div>
              {projects.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 0' }}>No linked jobs.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {projects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {STATUS_LABEL[p.status] || p.status} {p.revenue ? `- ${fmtMoney(p.revenue)}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Vehicles */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Car size={14} style={{ color: 'var(--cyan)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Linked Vehicles ({vehicles.length})
                </span>
              </div>
              {vehicles.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 0' }}>No vehicles on file.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {vehicles.map(v => (
                    <div key={v} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)',
                      fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                    }}>
                      <Car size={13} style={{ color: 'var(--cyan)' }} />
                      {v}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Contacts */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={14} style={{ color: 'var(--purple)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Linked Contacts
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--purple)',
                  }}>
                    {(saved.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{saved.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Primary Contact {saved.email ? `- ${saved.email}` : ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent Account */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link2 size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Parent Account
                  </span>
                </div>
                {parentAccount && (
                  <button
                    onClick={() => setParentAccountModalOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Change
                  </button>
                )}
              </div>
              {parentAccount ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(79,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                  }}>
                    {parentAccount.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{parentAccount.name}</div>
                    {parentAccount.company_name && (
                      <div style={{ fontSize: 11, color: 'var(--cyan)' }}>{parentAccount.company_name}</div>
                    )}
                    {parentAccount.phone && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: monoFont }}>{parentAccount.phone}</div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setParentAccountModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px dashed var(--border)', background: 'transparent',
                    color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  <Link2 size={13} /> Link parent account
                </button>
              )}
            </div>

            <CustomerSearchModal
              open={parentAccountModalOpen}
              onClose={() => setParentAccountModalOpen(false)}
              orgId={customer.org_id || ''}
              onSelect={handleSelectParentAccount}
            />
          </div>
        )}

        {/* ── Tasks Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Tasks ({tasks.filter(t => !t.completed).length} open)
            </div>

            {/* Add task form */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="field"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Add a new task..."
                style={{ flex: 1, fontSize: 13 }}
              />
              <button
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: newTaskTitle.trim() ? 'var(--accent)' : 'var(--surface2)',
                  border: 'none', color: newTaskTitle.trim() ? '#fff' : 'var(--text3)',
                  fontSize: 12, fontWeight: 700, cursor: newTaskTitle.trim() ? 'pointer' : 'default',
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Task list */}
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No tasks yet. Add one above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {tasks.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    background: task.completed ? 'transparent' : 'var(--surface2)',
                    opacity: task.completed ? 0.6 : 1,
                  }}>
                    <button
                      onClick={() => toggleTask(task.id)}
                      style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: task.completed ? 'none' : '2px solid var(--border)',
                        background: task.completed ? 'var(--green)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: 0,
                      }}
                    >
                      {task.completed && <Check size={13} style={{ color: '#fff' }} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        {task.due_date && (
                          <span style={{ color: new Date(task.due_date) < new Date() && !task.completed ? 'var(--red)' : 'var(--text3)' }}>
                            {' '}&middot; Due {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        color: 'var(--text3)', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Notes Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Notes ({customerNotes.length})
            </div>

            {/* Add note */}
            <div style={{ marginBottom: 16 }}>
              <textarea
                className="field resize-none"
                rows={3}
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Add a note..."
                style={{ fontSize: 13, marginBottom: 8 }}
              />
              <button
                onClick={addNote}
                disabled={!newNoteContent.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: newNoteContent.trim() ? 'var(--accent)' : 'var(--surface2)',
                  border: 'none', color: newNoteContent.trim() ? '#fff' : 'var(--text3)',
                  fontSize: 12, fontWeight: 700, cursor: newNoteContent.trim() ? 'pointer' : 'default',
                }}
              >
                <Plus size={14} /> Add Note
              </button>
            </div>

            {/* Notes list */}
            {customerNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No notes yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customerNotes.map(note => (
                  <div key={note.id} style={{
                    padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)',
                    borderLeft: '3px solid var(--amber)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                        }}>
                          {note.author.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{note.author}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Appointments Tab ───────────────────────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Appointments ({appointments.length})
            </div>

            {/* Add appointment form */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8,
              marginBottom: 16, alignItems: 'end',
            }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Title</label>
                <input
                  className="field"
                  value={newApptTitle}
                  onChange={e => setNewApptTitle(e.target.value)}
                  placeholder="Appointment title..."
                  style={{ fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Date</label>
                <input
                  className="field"
                  type="date"
                  value={newApptDate}
                  onChange={e => setNewApptDate(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Time</label>
                <input
                  className="field"
                  value={newApptTime}
                  onChange={e => setNewApptTime(e.target.value)}
                  placeholder="10:00 AM"
                  style={{ fontSize: 13, width: 100 }}
                />
              </div>
              <button
                onClick={addAppointment}
                disabled={!newApptTitle.trim() || !newApptDate}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, height: 38,
                  background: (newApptTitle.trim() && newApptDate) ? 'var(--accent)' : 'var(--surface2)',
                  border: 'none', color: (newApptTitle.trim() && newApptDate) ? '#fff' : 'var(--text3)',
                  fontSize: 12, fontWeight: 700, cursor: (newApptTitle.trim() && newApptDate) ? 'pointer' : 'default',
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Appointments list */}
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No upcoming appointments.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {appointments.map(appt => {
                  const apptDate = new Date(appt.date)
                  const isPast = apptDate < new Date(new Date().toDateString())
                  return (
                    <div key={appt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)',
                      opacity: isPast ? 0.5 : 1,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 8,
                        background: isPast ? 'rgba(90,96,128,0.15)' : 'rgba(79,127,255,0.15)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isPast ? 'var(--text3)' : 'var(--accent)', fontFamily: monoFont, lineHeight: 1 }}>
                          {format(apptDate, 'd')}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: isPast ? 'var(--text3)' : 'var(--accent)', textTransform: 'uppercase' }}>
                          {format(apptDate, 'MMM')}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{appt.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          {appt.time}
                          {appt.description && <span> &middot; {appt.description}</span>}
                        </div>
                      </div>
                      {isPast && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Past</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Documents Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Documents ({documents.length})
            </div>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No documents linked to this customer.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {documents.map(doc => {
                  const typeColors: Record<string, string> = {
                    estimate: 'var(--accent)', invoice: 'var(--green)', contract: 'var(--purple)', sales_order: 'var(--cyan)',
                  }
                  const typeIcons: Record<string, typeof FileText> = {
                    estimate: FileText, invoice: Receipt, contract: FileText, sales_order: CreditCard,
                  }
                  const DocIcon = typeIcons[doc.type] || FileText
                  const statusColors: Record<string, string> = {
                    approved: '#22c07a', paid: '#22c07a', confirmed: '#4f7fff',
                    pending: '#f59e0b', sent: '#22d3ee', declined: '#f25a5a', draft: '#5a6080',
                  }
                  return (
                    <div key={doc.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, background: 'var(--surface2)',
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: `${typeColors[doc.type] || 'var(--accent)'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <DocIcon size={16} style={{ color: typeColors[doc.type] || 'var(--accent)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{doc.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          {doc.amount ? ` - ${fmtMoney(doc.amount)}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: `${statusColors[doc.status] || '#5a6080'}18`,
                          color: statusColors[doc.status] || '#5a6080',
                          textTransform: 'capitalize',
                        }}>
                          {doc.status}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: `${typeColors[doc.type] || 'var(--accent)'}18`,
                          color: typeColors[doc.type] || 'var(--accent)',
                          textTransform: 'capitalize',
                        }}>
                          {doc.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Payments Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Payments ({payments.length})
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: monoFont }}>
                Total: {fmtMoney(payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0))}
              </div>
            </div>

            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No payment records yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {payments.map(pmt => (
                  <div key={pmt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: `${PAYMENT_STATUS_COLORS[pmt.status]}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DollarSign size={16} style={{ color: PAYMENT_STATUS_COLORS[pmt.status] }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{pmt.invoice_title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {format(new Date(pmt.date), 'MMM d, yyyy')}
                        {pmt.method && <span> &middot; {pmt.method}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: PAYMENT_STATUS_COLORS[pmt.status], fontFamily: monoFont }}>
                        {fmtMoney(pmt.amount)}
                      </div>
                      <span style={{
                        display: 'inline-block', marginTop: 2,
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: `${PAYMENT_STATUS_COLORS[pmt.status]}18`,
                        color: PAYMENT_STATUS_COLORS[pmt.status],
                        textTransform: 'capitalize',
                      }}>
                        {pmt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment summary bar */}
            <div style={{
              marginTop: 16, padding: '12px 14px', borderRadius: 8,
              background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} style={{ color: 'var(--amber)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                  {payments.filter(p => p.status === 'pending' || p.status === 'overdue').length} outstanding invoice(s)
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', fontFamily: monoFont }}>
                {fmtMoney(payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <CustomerFleetPanel customerId={customer.id} orgId={customer.org_id || ''} />
        )}
        {activeTab === 'photos' && (
          <CustomerPhotosTab customerId={customer.id} />
        )}

      </div>

      {/* ─── Jobs table (existing, moved below tabs) ────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Job History ({projects.length})
        </div>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)', fontSize: 13 }}>
            No jobs linked to this customer yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th>Status</th>
                <th>Revenue</th>
                <th>Date</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>{p.title}</div>
                    {p.vehicle_desc && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{p.vehicle_desc}</div>}
                  </td>
                  <td><span className="badge badge-gray capitalize">{p.type || '---'}</span></td>
                  <td><span className={STATUS_BADGE[p.status] || 'badge-gray'}>{STATUS_LABEL[p.status] || p.status}</span></td>
                  <td style={{ fontFamily: monoFont, fontWeight: 600, color: 'var(--green)' }}>
                    {p.revenue ? fmtMoney(p.revenue) : '---'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </td>
                  <td>
                    <ExternalLink size={13} style={{ color: 'var(--text3)' }} />
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

