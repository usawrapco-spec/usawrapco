'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Users, Mail, Phone, MapPin, Building2, X, ExternalLink } from 'lucide-react'
import type { Profile } from '@/types'

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
}

interface Props {
  profile: Profile
  initialCustomers: Customer[]
}

export default function CustomersClient({ profile, initialCustomers }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({
    contact_name: '', company_name: '', email: '', phone: '',
    city: '', state: '', source: 'inbound', notes: '',
  })
  const supabase = createClient()
  const router = useRouter()

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q ||
      c.contact_name?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
  })

  async function save() {
    if (!form.contact_name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('customers').insert({ ...form, org_id: profile.org_id }).select().single()
    if (!error && data) {
      setCustomers(prev => [data as Customer, ...prev])
      setShowAdd(false)
      setForm({ contact_name: '', company_name: '', email: '', phone: '', city: '', state: '', source: 'inbound', notes: '' })
    }
    setSaving(false)
  }

  const sourceColors: Record<string, string> = {
    inbound: '#22c07a', outbound: '#4f7fff', referral: '#8b5cf6',
    walk_in: '#22d3ee', repeat: '#f59e0b', cross_referral: '#f25a5a',
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
            Customers
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>{customers.length} total customers</p>
        </div>
        {(profile.role === 'owner' || profile.role === 'admin' || profile.role === 'sales_agent') && (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Customer
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, company, email..."
          style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Customer cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Users size={40} style={{ color: 'var(--text3)', opacity: 0.4, margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>
            {search ? 'No customers match your search' : 'No customers yet. Add your first customer.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => router.push(`/customers/${c.id}`)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,127,255,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{c.contact_name}</div>
                  {c.company_name && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={11} /> {c.company_name}
                    </div>
                  )}
                </div>
                {c.source && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                    background: `${sourceColors[c.source] || '#5a6080'}18`,
                    color: sourceColors[c.source] || '#5a6080',
                    textTransform: 'capitalize',
                  }}>
                    {c.source.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {c.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                    <Mail size={11} style={{ color: 'var(--text3)' }} /> {c.email}
                  </div>
                )}
                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                    <Phone size={11} style={{ color: 'var(--text3)' }} /> {c.phone}
                  </div>
                )}
                {(c.city || c.state) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                    <MapPin size={11} style={{ color: 'var(--text3)' }} /> {[c.city, c.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                {c.email && (
                  <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                    Email
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                    Call
                  </a>
                )}
                <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
                <ExternalLink size={11} style={{ color: 'var(--text3)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Add Customer</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'contact_name', label: 'Contact Name *', placeholder: 'Full name' },
                { key: 'company_name', label: 'Company Name', placeholder: 'Business name (optional)' },
                { key: 'email', label: 'Email', placeholder: 'email@example.com' },
                { key: 'phone', label: 'Phone', placeholder: '(555) 000-0000' },
                { key: 'city', label: 'City', placeholder: 'City' },
                { key: 'state', label: 'State', placeholder: 'State' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                    {field.label}
                  </label>
                  <input
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Source</label>
                <select
                  value={form.source}
                  onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }}
                >
                  {['inbound', 'outbound', 'referral', 'walk_in', 'repeat', 'cross_referral'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowAdd(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!form.contact_name.trim() || saving}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
