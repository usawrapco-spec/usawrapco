'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { X, User, Phone, Mail, Building2, DollarSign, Edit2, Check, ExternalLink } from 'lucide-react'
import CustomerSearchModal, { type CustomerRow } from '@/components/shared/CustomerSearchModal'
import Link from 'next/link'

interface Props {
  customerId: string
  orgId: string
  projectId: string
  onClose: () => void
  onCustomerChange?: (c: CustomerRow) => void
}

interface CustomerDetail extends CustomerRow {
  recentJobs?: Array<{ id: string; title: string | null; pipe_stage: string | null; vehicle_desc: string | null }>
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales', production: 'Production', install: 'Install',
  prod_review: 'QC', sales_close: 'Close', done: 'Done',
}

const fmtC = (n: number | null) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

export default function CustomerSlideOver({ customerId, orgId, projectId, onClose, onCustomerChange }: Props) {
  const supabase = createClient()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, company_name, lifetime_spend')
        .eq('id', customerId)
        .single()
      const { data: jobs } = await supabase
        .from('projects')
        .select('id, title, pipe_stage, vehicle_desc')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) {
        const c: CustomerDetail = { ...data, recentJobs: jobs || [] }
        setCustomer(c)
        setName(c.name || '')
        setPhone(c.phone || '')
        setEmail(c.email || '')
        setCompany(c.company_name || '')
      }
      setLoading(false)
    }
    load()
  }, [customerId])

  async function handleSave() {
    if (!customer) return
    setSaving(true)
    const updates = { name, phone: phone || null, email: email || null, company_name: company || null }
    await supabase.from('customers').update(updates).eq('id', customerId)
    setCustomer(prev => prev ? { ...prev, ...updates } : null)
    onCustomerChange?.({ id: customerId, name, email: email || null, phone: phone || null, company_name: company || null, lifetime_spend: customer.lifetime_spend })
    setSaving(false)
    setEditing(false)
  }

  async function handleCustomerSwitch(newCustomer: CustomerRow) {
    await supabase.from('projects').update({ customer_id: newCustomer.id }).eq('id', projectId)
    onCustomerChange?.(newCustomer)
    setSearchOpen(false)
    onClose()
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, zIndex: 9001,
          background: 'var(--surface)', borderLeft: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--surface2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
              >
                <Edit2 size={12} /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
        ) : !customer ? (
          <div style={{ padding: 24, color: 'var(--text3)', fontSize: 13 }}>Customer not found.</div>
        ) : (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Main info */}
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Name', value: name, set: setName },
                    { label: 'Phone', value: phone, set: setPhone },
                    { label: 'Email', value: email, set: setEmail },
                    { label: 'Company', value: company, set: setCompany },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                      <input
                        value={value}
                        onChange={e => set(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setName(customer.name || ''); setPhone(customer.phone || ''); setEmail(customer.email || ''); setCompany(customer.company_name || '') }}
                      style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid var(--surface2)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>{customer.name}</div>
                  {customer.company_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
                      <Building2 size={13} style={{ color: 'var(--text3)' }} /> {customer.company_name}
                    </div>
                  )}
                  {customer.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
                      <Phone size={13} style={{ color: 'var(--text3)' }} /> {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
                      <Mail size={13} style={{ color: 'var(--text3)' }} /> {customer.email}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
                    <DollarSign size={13} style={{ color: 'var(--text3)' }} />
                    Lifetime spend: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--green)' }}>{fmtC(customer.lifetime_spend)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Full profile link */}
            <Link
              href={`/customers/${customerId}`}
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
            >
              <ExternalLink size={13} /> View Full Customer Profile
            </Link>

            {/* Recent jobs */}
            {(customer.recentJobs?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent Jobs</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {customer.recentJobs!.map(job => (
                    <Link
                      key={job.id}
                      href={`/projects/${job.id}`}
                      onClick={onClose}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title || job.vehicle_desc || `Job ${job.id.slice(-6)}`}</div>
                        {job.vehicle_desc && job.title && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{job.vehicle_desc}</div>}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'var(--surface)', color: 'var(--text2)', border: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {STAGE_LABELS[job.pipe_stage || ''] || job.pipe_stage || '—'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Switch customer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
              <button
                onClick={() => setSearchOpen(true)}
                style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Link a Different Customer
              </button>
            </div>
          </div>
        )}
      </div>

      {searchOpen && (
        <CustomerSearchModal
          open={searchOpen}
          orgId={orgId}
          onSelect={handleCustomerSwitch}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>,
    document.body
  )
}
