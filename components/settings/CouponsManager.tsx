'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Coupon } from '@/types'
import {
  Tag,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit3,
  X,
  Check,
  Clock,
  Users,
  DollarSign,
  Percent,
  ToggleLeft,
  ToggleRight,
  FileText,
  ChevronDown,
} from 'lucide-react'

interface CouponsManagerProps {
  profile: Profile
  initialCoupons: any[]
  initialRedemptions: any[]
  customers: any[]
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
const fmtDate = (d: string | null) => {
  if (!d) return '--'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d }
}

const EMPTY_FORM = {
  code: '',
  title: '',
  description: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  max_discount_amount: '',
  valid_from: '',
  valid_until: '',
  usage_limit: '',
  is_template: false,
  customer_id: '',
}

export default function CouponsManager({ profile, initialCoupons, initialRedemptions, customers }: CouponsManagerProps) {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<any[]>(initialCoupons)
  const [redemptions] = useState<any[]>(initialRedemptions)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'template'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showRedemptions, setShowRedemptions] = useState(false)

  const now = new Date()

  const filteredCoupons = coupons.filter(c => {
    const matchSearch = !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    const isExpired = c.valid_until && new Date(c.valid_until) < now
    switch (filter) {
      case 'active': return c.active && !isExpired
      case 'inactive': return !c.active
      case 'expired': return isExpired
      case 'template': return c.is_template
      default: return true
    }
  })

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (coupon: any) => {
    setForm({
      code: coupon.code || '',
      title: coupon.title || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type || 'percent',
      discount_value: String(coupon.discount_value || ''),
      min_order_amount: coupon.min_order_amount ? String(coupon.min_order_amount) : '',
      max_discount_amount: coupon.max_discount_amount ? String(coupon.max_discount_amount) : '',
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 10) : '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      is_template: coupon.is_template || false,
      customer_id: coupon.customer_id || '',
    })
    setEditId(coupon.id)
    setShowForm(true)
  }

  const cloneTemplate = (coupon: any) => {
    setForm({
      code: '',
      title: coupon.title || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type || 'percent',
      discount_value: String(coupon.discount_value || ''),
      min_order_amount: coupon.min_order_amount ? String(coupon.min_order_amount) : '',
      max_discount_amount: coupon.max_discount_amount ? String(coupon.max_discount_amount) : '',
      valid_from: '',
      valid_until: '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      is_template: false,
      customer_id: '',
    })
    setEditId(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.discount_value) return
    setSaving(true)

    const payload: any = {
      org_id: profile.org_id,
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      is_template: form.is_template,
      customer_id: form.customer_id || null,
    }

    if (editId) {
      const { data } = await supabase.from('coupons').update(payload).eq('id', editId).select().single()
      if (data) setCoupons(prev => prev.map(c => c.id === editId ? data : c))
    } else {
      const { data } = await supabase.from('coupons').insert(payload).select().single()
      if (data) setCoupons(prev => [data, ...prev])
    }

    setShowForm(false)
    setEditId(null)
    setSaving(false)
  }

  const toggleActive = async (coupon: any) => {
    const { data } = await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id).select().single()
    if (data) setCoupons(prev => prev.map(c => c.id === coupon.id ? data : c))
  }

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: "'Barlow Condensed', sans-serif", margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={22} style={{ color: 'var(--accent)' }} />
            Coupons
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '4px 0 0' }}>Create and manage discount coupons for customers</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowRedemptions(!showRedemptions)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--surface2)', cursor: 'pointer',
            background: showRedemptions ? 'var(--surface2)' : 'transparent', color: 'var(--text2)',
            fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FileText size={14} /> History ({redemptions.length})
          </button>
          <button onClick={openCreate} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={14} /> New Coupon
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="text" placeholder="Search coupons..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface)', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
          />
        </div>
        {(['all', 'active', 'inactive', 'expired', 'template'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid var(--surface2)', cursor: 'pointer',
            background: filter === f ? 'var(--accent)' : 'transparent',
            color: filter === f ? '#fff' : 'var(--text2)',
            fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Redemptions Panel */}
      {showRedemptions && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--surface2)', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>Redemption History</div>
          {redemptions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>No redemptions yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {redemptions.slice(0, 20).map((r: any) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--surface2)' }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{r.coupon?.code || r.coupon?.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>{r.customer?.name || 'Customer'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(r.redeemed_at)}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(Number(r.discount_applied))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--surface2)', padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {editId ? 'Edit Coupon' : 'Create Coupon'}
            </div>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Code</label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. WELCOME10"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Title</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Display title"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description for customers"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Discount Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setForm(f => ({ ...f, discount_type: 'percent' }))} style={{
                  flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--surface2)',
                  background: form.discount_type === 'percent' ? 'var(--accent)' : 'var(--bg)',
                  color: form.discount_type === 'percent' ? '#fff' : 'var(--text2)',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}><Percent size={14} /> Percentage</button>
                <button onClick={() => setForm(f => ({ ...f, discount_type: 'fixed' }))} style={{
                  flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--surface2)',
                  background: form.discount_type === 'fixed' ? 'var(--accent)' : 'var(--bg)',
                  color: form.discount_type === 'fixed' ? '#fff' : 'var(--text2)',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}><DollarSign size={14} /> Fixed ($)</button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>
                Discount Value {form.discount_type === 'percent' ? '(%)' : '($)'}
              </label>
              <input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === 'percent' ? '10' : '50'}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Min Order Amount ($)</label>
              <input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} placeholder="0"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Max Discount ($)</label>
              <input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: e.target.value }))} placeholder="No limit"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Valid From</label>
              <input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Usage Limit</label>
              <input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="Unlimited"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Target Customer</label>
              <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                <option value="">All Customers</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--surface2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
              <input type="checkbox" checked={form.is_template} onChange={e => setForm(f => ({ ...f, is_template: e.target.checked }))} />
              Template (reusable base for creating targeted coupons)
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--surface2)', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 700 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.code.trim() || !form.discount_value} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
              opacity: saving || !form.code.trim() || !form.discount_value ? 0.5 : 1,
            }}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredCoupons.length === 0 ? (
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--surface2)', padding: '48px 20px', textAlign: 'center' }}>
            <Tag size={32} style={{ color: 'var(--text3)', marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>No Coupons Found</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Create your first coupon to get started.</div>
          </div>
        ) : (
          filteredCoupons.map((coupon: any) => {
            const isExpired = coupon.valid_until && new Date(coupon.valid_until) < now
            const usageInfo = coupon.usage_limit ? `${coupon.times_used}/${coupon.usage_limit}` : `${coupon.times_used} used`
            return (
              <div key={coupon.id} style={{
                background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--surface2)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                opacity: isExpired || !coupon.active ? 0.6 : 1,
              }}>
                {/* Discount badge */}
                <div style={{
                  width: 56, height: 56, borderRadius: 12, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: coupon.discount_type === 'percent' ? 'rgba(139,92,246,0.12)' : 'rgba(34,197,94,0.12)',
                  border: `1px solid ${coupon.discount_type === 'percent' ? 'rgba(139,92,246,0.25)' : 'rgba(34,197,94,0.25)'}`,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: coupon.discount_type === 'percent' ? 'var(--purple)' : 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{coupon.code}</span>
                    {coupon.is_template && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'var(--amber)', color: '#000' }}>TEMPLATE</span>}
                    {isExpired && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'var(--red)', color: '#fff' }}>EXPIRED</span>}
                    {!coupon.active && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'var(--text3)', color: '#fff' }}>INACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{coupon.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>{usageInfo}</span>
                    {coupon.valid_until && <span>Expires {fmtDate(coupon.valid_until)}</span>}
                    {coupon.customer_id && <span><Users size={10} style={{ marginRight: 2 }} />Targeted</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {coupon.is_template && (
                    <button onClick={() => cloneTemplate(coupon)} title="Clone template" style={{ padding: 6, borderRadius: 6, border: '1px solid var(--surface2)', cursor: 'pointer', background: 'transparent', color: 'var(--text3)' }}>
                      <Copy size={14} />
                    </button>
                  )}
                  <button onClick={() => openEdit(coupon)} title="Edit" style={{ padding: 6, borderRadius: 6, border: '1px solid var(--surface2)', cursor: 'pointer', background: 'transparent', color: 'var(--text3)' }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => toggleActive(coupon)} title={coupon.active ? 'Deactivate' : 'Activate'} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--surface2)', cursor: 'pointer', background: 'transparent', color: coupon.active ? 'var(--green)' : 'var(--text3)' }}>
                    {coupon.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button onClick={() => deleteCoupon(coupon.id)} title="Delete" style={{ padding: 6, borderRadius: 6, border: '1px solid var(--surface2)', cursor: 'pointer', background: 'transparent', color: 'var(--red)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
