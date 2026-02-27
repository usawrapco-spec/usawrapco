'use client'

import { useState } from 'react'
import { CreditCard, DollarSign, CheckCircle, Clock, Search } from 'lucide-react'
import type { Profile } from '@/types'

interface Payment {
  id: string
  amount: number
  payment_date: string
  method?: string
  status?: string
  notes?: string
  invoices?: { id: string; invoice_number: string; customer_id: string } | null
  projects?: { id: string; title: string } | null
}

interface Props {
  profile: Profile
  payments: Payment[]
}

export default function PaymentsClient({ payments }: Props) {
  const [search, setSearch] = useState('')

  const filtered = payments.filter(p => {
    const q = search.toLowerCase()
    return !q ||
      p.invoices?.invoice_number?.toLowerCase().includes(q) ||
      p.projects?.title?.toLowerCase().includes(q) ||
      p.method?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q)
  })

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const paid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0)
  const pending = payments.filter(p => p.status !== 'completed').reduce((s, p) => s + (p.amount || 0), 0)

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-barlow)', letterSpacing: 1, marginBottom: 4 }}>
          PAYMENTS
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Track all incoming payments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {([
          { label: 'Total Collected', value: fmt(total), icon: DollarSign, color: 'var(--accent)' },
          { label: 'Completed', value: fmt(paid), icon: CheckCircle, color: 'var(--green)' },
          { label: 'Pending', value: fmt(pending), icon: Clock, color: 'var(--amber)' },
        ] as const).map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <stat.icon size={22} color={stat.color} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} color="var(--text3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search payments..."
          style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, color: 'var(--text1)', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface2)' }}>
              {['Date', 'Invoice', 'Project', 'Method', 'Amount', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
                  <CreditCard size={32} style={{ margin: '0 auto 8px' }} />
                  <div>No payments found</div>
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--surface2)' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text2)' }}>{fmtDate(p.payment_date)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text1)' }}>{p.invoices?.invoice_number || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text1)' }}>{p.projects?.title || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text2)', textTransform: 'capitalize' }}>{p.method || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(p.amount || 0)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
                    background: p.status === 'completed' ? 'rgba(34,192,122,0.15)' : 'rgba(245,158,11,0.15)',
                    color: p.status === 'completed' ? 'var(--green)' : 'var(--amber)',
                  }}>{p.status || 'pending'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
