'use client'

import { useState } from 'react'
import {
  Receipt, DollarSign, Clock, CheckCircle, AlertCircle,
  FileText, CreditCard, Search, Plus, TrendingUp, Eye
} from 'lucide-react'
import Link from 'next/link'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  paid:    { label: 'Paid',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
  sent:    { label: 'Sent',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  draft:   { label: 'Draft',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  icon: FileText },
  void:    { label: 'Void',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    icon: AlertCircle },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: AlertCircle },
}

interface TransactionsClientProps {
  invoices: any[]
  payments: any[]
}

export default function TransactionsClient({ invoices, payments }: TransactionsClientProps) {
  const [tab, setTab] = useState<'invoices' | 'payments' | 'overview'>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalOutstanding = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.balance_due || 0), 0)
  const totalDraft = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + Number(i.total || 0), 0)

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.customers?.name || '').toLowerCase().includes(q) ||
      (inv.projects?.title || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  const statCards = [
    { label: 'Total Revenue', value: fmt(totalRevenue), icon: TrendingUp, color: '#4f7fff', count: `${invoices.length} invoices` },
    { label: 'Collected', value: fmt(totalPaid), icon: CheckCircle, color: '#22c55e', count: `${invoices.filter(i => i.status === 'paid').length} paid` },
    { label: 'Outstanding', value: fmt(totalOutstanding), icon: Clock, color: '#f59e0b', count: `${invoices.filter(i => i.status === 'sent').length} sent` },
    { label: 'Draft / WIP', value: fmt(totalDraft), icon: FileText, color: '#94a3b8', count: `${invoices.filter(i => i.status === 'draft').length} drafts` },
  ]

  return (
    <div style={{ padding: '24px 24px 100px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Transactions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            Invoices, payments & financial overview
          </p>
        </div>
        <Link href="/invoices/new" style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)',
          color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700,
          textDecoration: 'none'
        }}>
          <Plus size={15} /> New Invoice
        </Link>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ background: `${card.color}20`, borderRadius: 8, padding: 6 }}>
                <card.icon size={16} color={card.color} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {card.label}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: 'JetBrains Mono, monospace' }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{card.count}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface2)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'invoices', label: `Invoices (${invoices.length})` },
          { key: 'payments', label: `Payments (${payments.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            background: tab === t.key ? 'var(--surface)' : 'transparent',
            color: tab === t.key ? 'var(--text1)' : 'var(--text3)',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.2)' : 'none'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                placeholder="Search invoices, customers, jobs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 32px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box'
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text1)', fontSize: 13, padding: '9px 12px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="sent">Sent</option>
              <option value="draft">Draft</option>
              <option value="void">Void</option>
            </select>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Invoice #', 'Customer / Job', 'Date', 'Due', 'Amount', 'Status', ''].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: 10,
                        fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase',
                        letterSpacing: '.06em', whiteSpace: 'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, i) => {
                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
                    const StatusIcon = cfg.icon
                    return (
                      <tr key={inv.id} style={{
                        borderBottom: '1px solid var(--border)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                      }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                          {inv.invoice_number || '\u2014'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                            {inv.customers?.name || '\u2014'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {inv.projects?.title || inv.customers?.business_name || ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {fmtDate(inv.invoice_date)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {fmtDate(inv.due_date)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {fmt(Number(inv.total))}
                          </div>
                          {Number(inv.balance_due) > 0 && inv.status !== 'paid' && (
                            <div style={{ fontSize: 11, color: '#f59e0b' }}>Due: {fmt(Number(inv.balance_due))}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: cfg.bg, color: cfg.color,
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
                          }}>
                            <StatusIcon size={11} />
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Link href={`/invoices/${inv.id}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: 'var(--text3)', textDecoration: 'none',
                            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)'
                          }}>
                            <Eye size={11} /> View
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
                  No invoices match your search
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Invoice Breakdown</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'overdue').map(([status, cfg]) => {
              const statusInvs = invoices.filter(i => i.status === status)
              if (!statusInvs.length) return null
              const total = statusInvs.reduce((s, i) => s + Number(i.total || 0), 0)
              const StatusIcon = cfg.icon
              return (
                <div key={status} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{ background: cfg.bg, borderRadius: 8, padding: 8 }}>
                    <StatusIcon size={16} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{statusInvs.length} invoice{statusInvs.length > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: cfg.color, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(total)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <CreditCard size={32} style={{ color: 'var(--text3)', marginBottom: 8 }} />
          <div style={{ color: 'var(--text2)', fontWeight: 600 }}>Payment records</div>
          <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            {payments.length > 0
              ? `${payments.length} payments on file`
              : 'No payments recorded yet \u2014 payments will appear as invoices are collected'}
          </div>
        </div>
      )}
    </div>
  )
}
