'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/client'

interface AddAffiliateModalProps {
  type: 'dealer' | 'sales_agent'
  onClose: () => void
  onCreated: (record: any) => void
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none',
}

export default function AddAffiliateModal({ type, onClose, onCreated }: AddAffiliateModalProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' })

  const label = type === 'dealer' ? 'Dealer' : 'Sales Agent'

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    const code = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) + '-' + Math.random().toString(36).slice(2, 6)

    const { data, error: err } = await supabase.from('affiliates').insert({
      org_id: ORG_ID,
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      type,
      status: 'active',
      code,
      unique_code: code,
      unique_link: `/ref/${code}`,
      commission_structure: { type: 'percent_gp', rate: type === 'dealer' ? 10 : 7 },
    }).select().single()

    if (err) {
      setError(err.message)
    } else if (data) {
      onCreated(data)
    }
    setSaving(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: 440, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            New {label}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Name *</div>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder={type === 'dealer' ? 'Harbor Marine & Auto' : 'John Smith'} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Company</div>
            <input style={inp} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Email</div>
            <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Phone</div>
            <input style={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" />
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 8, padding: '12px 20px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Creating...' : `Create ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
