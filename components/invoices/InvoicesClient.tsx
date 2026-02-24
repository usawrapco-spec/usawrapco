'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, FileText, Send, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, ChevronRight, AlertTriangle,
} from 'lucide-react'
import type { Profile, Invoice, InvoiceStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

// ─── Demo data when DB tables don't exist yet ────────────────────────────────
const DEMO_INVOICES = [
  {
    id: 'demo-inv-1', org_id: '', invoice_number: '2001', title: 'Ford F-150 Full Wrap',
    sales_order_id: null, customer_id: null, status: 'draft',
    invoice_date: '2026-02-18', due_date: '2026-03-04',
    subtotal: 3200, discount: 0, tax_rate: 0.0825, tax_amount: 264, total: 3464,
    amount_paid: 0, balance_due: 3464, notes: null, form_data: {},
    created_at: '2026-02-18T10:00:00Z', updated_at: '2026-02-18T10:00:00Z',
    customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
    sales_order: { id: 'so1', so_number: '3001' },
  },
  {
    id: 'demo-inv-2', org_id: '', invoice_number: '2002', title: 'Tesla Model 3 PPF + Tint',
    sales_order_id: null, customer_id: null, status: 'sent',
    invoice_date: '2026-02-12', due_date: '2026-02-26',
    subtotal: 4800, discount: 200, tax_rate: 0.0825, tax_amount: 379.50, total: 4979.50,
    amount_paid: 0, balance_due: 4979.50, notes: null, form_data: {},
    created_at: '2026-02-12T14:00:00Z', updated_at: '2026-02-13T09:00:00Z',
    customer: { id: 'c2', name: 'Sarah Chen', email: 'sarah@example.com' },
    sales_order: { id: 'so2', so_number: '3002' },
  },
  {
    id: 'demo-inv-3', org_id: '', invoice_number: '2003', title: 'Sprinter Van Commercial Wrap',
    sales_order_id: null, customer_id: null, status: 'paid',
    invoice_date: '2026-02-01', due_date: '2026-02-15',
    subtotal: 5600, discount: 300, tax_rate: 0.0825, tax_amount: 437.25, total: 5737.25,
    amount_paid: 5737.25, balance_due: 0, notes: null, form_data: {},
    created_at: '2026-02-01T11:00:00Z', updated_at: '2026-02-14T16:00:00Z',
    customer: { id: 'c3', name: 'ABC Plumbing LLC', email: 'info@abcplumbing.com' },
    sales_order: { id: 'so3', so_number: '3003' },
  },
  {
    id: 'demo-inv-4', org_id: '', invoice_number: '2004', title: 'BMW M4 Color Change',
    sales_order_id: null, customer_id: null, status: 'overdue',
    invoice_date: '2026-01-15', due_date: '2026-01-29',
    subtotal: 4200, discount: 0, tax_rate: 0.0825, tax_amount: 346.50, total: 4546.50,
    amount_paid: 1000, balance_due: 3546.50, notes: null, form_data: {},
    created_at: '2026-01-15T09:00:00Z', updated_at: '2026-02-02T00:00:00Z',
    customer: { id: 'c4', name: 'David Park', email: 'david@example.com' },
  },
  {
    id: 'demo-inv-5', org_id: '', invoice_number: '2005', title: 'Fleet Wraps - 3 Trucks',
    sales_order_id: null, customer_id: null, status: 'sent',
    invoice_date: '2026-02-19', due_date: '2026-03-05',
    subtotal: 9600, discount: 500, tax_rate: 0.0825, tax_amount: 750.75, total: 9850.75,
    amount_paid: 0, balance_due: 9850.75, notes: null, form_data: {},
    created_at: '2026-02-19T08:30:00Z', updated_at: '2026-02-19T08:30:00Z',
    customer: { id: 'c5', name: 'Quick Move Co', email: 'ops@quickmove.com' },
    sales_order: { id: 'so5', so_number: '3005' },
  },
] as Invoice[]

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:   { label: 'Draft',   color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  open:    { label: 'Open',    color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.15)' },
  sent:    { label: 'Sent',    color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  partial: { label: 'Partial', color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  paid:    { label: 'Paid',    color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  overdue: { label: 'Overdue', color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
  void:    { label: 'Void',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.10)' },
}

type TabFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'

interface Props {
  profile: Profile
  initialInvoices: Invoice[]
}

export default function InvoicesClient({ profile, initialInvoices }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const usingDemo = initialInvoices.length === 0
  const allInvoices = usingDemo ? DEMO_INVOICES : initialInvoices

  const [invoices] = useState<Invoice[]>(allInvoices)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [creating, setCreating] = useState(false)

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // Filter logic
  const filtered = useMemo(() => {
    let list = invoices
    if (tab !== 'all') list = list.filter(inv => inv.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(inv =>
        String(inv.title || '').toLowerCase().includes(q) ||
        inv.customer?.name?.toLowerCase().includes(q) ||
        inv.customer?.email?.toLowerCase().includes(q) ||
        String(inv.invoice_number).includes(q)
      )
    }
    return list
  }, [invoices, tab, search])

  // Stats
  const stats = useMemo(() => {
    const draft = invoices.filter(inv => inv.status === 'draft').length
    const sent = invoices.filter(inv => inv.status === 'sent').length
    const paid = invoices.filter(inv => inv.status === 'paid').length
    const overdue = invoices.filter(inv => inv.status === 'overdue').length
    const outstandingBalance = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((s, inv) => s + (inv.balance_due || 0), 0)
    const paidTotal = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((s, inv) => s + (inv.total || 0), 0)
    return { draft, sent, paid, overdue, outstandingBalance, paidTotal, total: invoices.length }
  }, [invoices])

  async function handleCreate() {
    if (!canWrite) return
    setCreating(true)
    try {
      const { data, error } = await supabase.from('invoices').insert({
        org_id: profile.org_id,
        title: 'New Invoice',
        status: 'draft',
        invoice_date: new Date().toISOString().split('T')[0],
      }).select().single()

      if (error) throw error
      if (data) router.push(`/invoices/${data.id}`)
    } catch (err) {
      console.error('Create invoice error:', err)
      router.push('/invoices/demo-inv-1')
    }
    setCreating(false)
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const fmtDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: invoices.length },
    { key: 'draft', label: 'Draft', count: stats.draft },
    { key: 'sent', label: 'Sent', count: stats.sent },
    { key: 'paid', label: 'Paid', count: stats.paid },
    { key: 'overdue', label: 'Overdue', count: stats.overdue },
  ]

  return (
    <div>
      {/* Demo banner */}
      {usingDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Showing demo data. Run the v6 migration SQL to enable live invoices.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', marginBottom: 4,
          }}>
            Invoices
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {stats.total} invoice{stats.total !== 1 ? 's' : ''} total
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary"
          >
            <Plus size={14} /> New Invoice
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={<FileText size={16} />} label="Draft" value={stats.draft} color="var(--text3)" />
        <StatCard icon={<Send size={16} />} label="Sent" value={stats.sent} color="var(--accent)" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Paid" value={stats.paid} color="var(--green)" />
        <StatCard icon={<DollarSign size={16} />} label="Outstanding" value={fmtCurrency(stats.outstandingBalance)} color="var(--amber)" isMono />
        <StatCard icon={<TrendingUp size={16} />} label="Paid Total" value={fmtCurrency(stats.paidTotal)} color="var(--green)" isMono />
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: tab === t.key ? 'var(--accent)' : 'var(--surface2)',
                color: tab === t.key ? '#fff' : 'var(--text2)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
              <span style={{
                marginLeft: 6, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                opacity: 0.7,
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="field"
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>INV#</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Status</th>
              <th>SO#</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Date</th>
              <th>Due</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                  {search ? 'No invoices match your search' : 'No invoices yet'}
                </td>
              </tr>
            ) : (
              filtered.map(inv => {
                const sc = STATUS_CONFIG[inv.status]
                return (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                        INV-{inv.invoice_number}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                      {inv.title}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {inv.customer?.name || '--'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                        borderRadius: 6, fontSize: 11, fontWeight: 700,
                        color: sc.color, background: sc.bg,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                    <td>
                      {inv.sales_order ? (
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text2)' }}>
                          SO-{inv.sales_order.so_number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>--</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                        {fmtCurrency(inv.total)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                        {fmtCurrency(inv.amount_paid)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{
                        fontSize: 13, fontWeight: 600,
                        color: Number(inv.balance_due ?? 0) > 0 ? 'var(--amber)' : 'var(--green)',
                      }}>
                        {fmtCurrency(Number(inv.balance_due ?? 0))}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtDate(inv.invoice_date)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtDate(inv.due_date)}
                    </td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, color, isMono,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string; isMono?: boolean
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: `${color}15`, color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{
          fontSize: 18, fontWeight: 800, color: 'var(--text1)',
          fontFamily: isMono ? 'JetBrains Mono, monospace' : 'Barlow Condensed, sans-serif',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}
