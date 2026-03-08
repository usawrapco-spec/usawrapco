'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, ChevronRight, Briefcase, MessageSquare, X,
  User, Phone as PhoneIcon, Mail, Car, FileText, Save,
} from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  submitted:   { label: 'Submitted',     color: C.text2 },
  estimate:    { label: 'Estimating',    color: C.accent },
  approved:    { label: 'Approved',      color: C.cyan },
  deposit:     { label: 'Deposit In',    color: C.cyan },
  production:  { label: 'In Production', color: C.purple },
  install:     { label: 'Installing',    color: C.purple },
  complete:    { label: 'Complete',      color: C.green },
  paid:        { label: 'Paid',          color: C.green },
  cancelled:   { label: 'Cancelled',     color: C.red },
}

const SERVICE_TYPES = [
  { value: 'wrap', label: 'Full Wrap' },
  { value: 'partial_wrap', label: 'Partial Wrap' },
  { value: 'ppf', label: 'PPF' },
  { value: 'tint', label: 'Window Tint' },
  { value: 'lettering', label: 'Lettering/Decals' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'fleet', label: 'Fleet' },
  { value: 'other', label: 'Other' },
]

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: C.surface2, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

interface Referral {
  id: string; customer_name: string | null; customer_phone: string | null
  customer_email: string | null; vehicle_desc: string | null
  service_type: string; status: string; commission_amount: number | null
  notes: string | null; created_at: string
}

export default function ReferralList({
  referrals: initial,
  unreadCounts,
}: {
  referrals: Referral[]
  unreadCounts: Record<string, number>
}) {
  const router = useRouter()
  const [referrals, setReferrals] = useState(initial)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    vehicle_year: '', vehicle_make: '', vehicle_model: '',
    vehicle_desc: '', service_type: 'wrap', notes: '',
  })

  const active = referrals.filter(r => !['complete', 'paid', 'cancelled'].includes(r.status))
  const completed = referrals.filter(r => ['complete', 'paid'].includes(r.status))
  const totalEarned = completed.reduce((s, r) => s + (r.commission_amount ?? 0), 0)

  async function handleSubmit() {
    if (!form.customer_name.trim()) return
    setSaving(true)
    const res = await fetch('/api/sales-portal/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        vehicle_desc: [form.vehicle_year, form.vehicle_make, form.vehicle_model].filter(Boolean).join(' ') || form.vehicle_desc,
      }),
    })
    if (res.ok) {
      const newRef = await res.json()
      setReferrals(prev => [newRef, ...prev])
      setShowNew(false)
      setForm({
        customer_name: '', customer_phone: '', customer_email: '',
        vehicle_year: '', vehicle_make: '', vehicle_model: '',
        vehicle_desc: '', service_type: 'wrap', notes: '',
      })
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: 0, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
            Referrals & Jobs
          </h1>
          <p style={{ fontSize: 13, color: C.text3, margin: '4px 0 0' }}>
            Submit customers and track their jobs
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', background: C.green, color: '#fff',
            border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Submit Customer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Active', value: active.length, color: C.accent },
          { label: 'Completed', value: completed.length, color: C.green },
          { label: 'Earned', value: money(totalEarned), color: C.green },
        ].map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: C.text3, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Referral List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {referrals.map(r => {
          const meta = STATUS_META[r.status] ?? STATUS_META.submitted
          const unread = unreadCounts[r.id] || 0
          return (
            <Link key={r.id} href={`/sales-portal/referrals/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: meta.color, flexShrink: 0,
                  boxShadow: `0 0 6px ${meta.color}60`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>
                    {r.customer_name || 'Unnamed Customer'}
                  </div>
                  {r.vehicle_desc && (
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>{r.vehicle_desc}</div>
                  )}
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>
                    {r.service_type} &middot; {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                  {r.commission_amount && (
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      {money(r.commission_amount)}
                    </div>
                  )}
                  {unread > 0 && (
                    <div style={{
                      marginTop: 4, padding: '1px 6px', borderRadius: 8,
                      background: C.red, color: '#fff', fontSize: 9, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      <MessageSquare size={8} /> {unread}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} color={C.text3} />
              </div>
            </Link>
          )
        })}
      </div>

      {referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3 }}>
          <Briefcase size={36} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: C.text2, marginBottom: 6 }}>No referrals yet</div>
          <div style={{ fontSize: 12 }}>Submit your first customer to the shop</div>
        </div>
      )}

      {/* New Referral Modal */}
      {showNew && (
        <>
          <div onClick={() => setShowNew(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, width: '90vw', maxWidth: 480, maxHeight: '85vh',
            overflow: 'auto', zIndex: 110, padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text1, margin: 0, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
                Submit Customer
              </h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3 }}>
                <X size={20} />
              </button>
            </div>

            {/* Customer Info */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Customer Info
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 16 }}>
              <input style={inp} placeholder="Customer Name *" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={inp} placeholder="Phone" type="tel" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
                <input style={inp} placeholder="Email" type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
              </div>
            </div>

            {/* Vehicle Info */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Vehicle Info
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input style={inp} placeholder="Year" value={form.vehicle_year} onChange={e => setForm(f => ({ ...f, vehicle_year: e.target.value }))} />
              <input style={inp} placeholder="Make" value={form.vehicle_make} onChange={e => setForm(f => ({ ...f, vehicle_make: e.target.value }))} />
              <input style={inp} placeholder="Model" value={form.vehicle_model} onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={form.service_type}
                onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}
              >
                {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Notes */}
            <textarea
              style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 20 }}
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />

            <button
              onClick={handleSubmit}
              disabled={saving || !form.customer_name.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: form.customer_name.trim() ? C.green : C.surface2,
                color: form.customer_name.trim() ? '#fff' : C.text3,
                border: 'none', fontSize: 14, fontWeight: 800,
                cursor: form.customer_name.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Save size={16} /> {saving ? 'Submitting...' : 'Submit to Shop'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
