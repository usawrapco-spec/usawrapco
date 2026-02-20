'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, Phone, MapPin, Building2, User, Calendar, Briefcase, Edit2, Save, X, ExternalLink } from 'lucide-react'
import type { Profile } from '@/types'
import { format } from 'date-fns'

interface Customer {
  id: string
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  source?: string
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

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function CustomerDetailClient({ profile, customer, projects }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contact_name: customer.contact_name || '',
    company_name: customer.company_name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    city: customer.city || '',
    state: customer.state || '',
    notes: customer.notes || '',
  })
  const [saved, setSaved] = useState(customer)

  const totalRevenue = projects.filter(p => p.status === 'closed').reduce((s, p) => s + (p.revenue || 0), 0)
  const activeJobs = projects.filter(p => !['closed', 'cancelled'].includes(p.status))

  async function saveEdits() {
    setSaving(true)
    const { error } = await supabase.from('customers').update(form).eq('id', customer.id)
    if (!error) {
      setSaved({ ...saved, ...form })
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back nav */}
      <button
        onClick={() => router.push('/customers')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, fontWeight: 600, padding: 0 }}
      >
        <ArrowLeft size={14} /> Back to Customers
      </button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(79,127,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: 'var(--accent)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {(saved.contact_name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <input
                  className="field"
                  value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}
                />
              ) : (
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {saved.contact_name}
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
            <label className="field-label">Notes</label>
            <textarea className="field resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this customer..." />
          </div>
        ) : saved.notes ? (
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text2)', borderLeft: '3px solid var(--accent)' }}>
            {saved.notes}
          </div>
        ) : null}

        {/* Source badge */}
        {saved.source && (
          <div style={{ marginTop: 12 }}>
            <span style={{
              display: 'inline-flex', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: `${SOURCE_COLORS[saved.source] || '#5a6080'}18`,
              color: SOURCE_COLORS[saved.source] || '#5a6080',
              textTransform: 'capitalize',
            }}>
              {saved.source.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Jobs', value: projects.length.toString(), color: 'var(--accent)', Icon: Briefcase },
          { label: 'Active Jobs', value: activeJobs.length.toString(), color: 'var(--green)', Icon: User },
          { label: 'Lifetime Revenue', value: fmtMoney(totalRevenue), color: 'var(--cyan)', Icon: Building2 },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <stat.Icon size={14} style={{ color: stat.color }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Jobs table */}
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
                  <td><span className="badge badge-gray capitalize">{p.type || '—'}</span></td>
                  <td><span className={STATUS_BADGE[p.status] || 'badge-gray'}>{STATUS_LABEL[p.status] || p.status}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--green)' }}>
                    {p.revenue ? fmtMoney(p.revenue) : '—'}
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
