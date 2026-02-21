'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, FileText, PlayCircle, CheckCircle2, PauseCircle,
  DollarSign, TrendingUp, ChevronRight, AlertTriangle,
} from 'lucide-react'
import type { Profile, SalesOrder, SalesOrderStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

// ─── Demo data when DB tables don't exist yet ────────────────────────────────
const DEMO_ORDERS: SalesOrder[] = [
  {
    id: 'demo-so-1', org_id: '', so_number: 2001, title: 'Ford F-150 Full Wrap',
    estimate_id: 'demo-est-1', customer_id: null, status: 'new',
    sales_rep_id: null, production_manager_id: null, project_manager_id: null,
    designer_id: null, so_date: '2026-02-18', due_date: '2026-03-01', install_date: '2026-03-05',
    subtotal: 3200, discount: 0, tax_rate: 0.0825, tax_amount: 264, total: 3464,
    down_payment_pct: 50, payment_terms: 'Net 30', notes: 'Matte black full wrap', invoiced: false,
    form_data: {}, created_at: '2026-02-18T10:00:00Z', updated_at: '2026-02-18T10:00:00Z',
    customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
    estimate: { id: 'demo-est-1', estimate_number: 1001 },
  },
  {
    id: 'demo-so-2', org_id: '', so_number: 2002, title: 'Sprinter Van Commercial Wrap',
    estimate_id: 'demo-est-3', customer_id: null, status: 'in_progress',
    sales_rep_id: null, production_manager_id: null, project_manager_id: null,
    designer_id: null, so_date: '2026-02-14', due_date: '2026-02-25', install_date: '2026-02-28',
    subtotal: 5600, discount: 300, tax_rate: 0.0825, tax_amount: 437.25, total: 5737.25,
    down_payment_pct: 50, payment_terms: 'Net 15', notes: 'Full commercial wrap', invoiced: false,
    form_data: {}, created_at: '2026-02-14T16:00:00Z', updated_at: '2026-02-17T09:00:00Z',
    customer: { id: 'c3', name: 'ABC Plumbing LLC', email: 'info@abcplumbing.com' },
    sales_rep: { id: 's2', name: 'Amanda Cross' },
    estimate: { id: 'demo-est-3', estimate_number: 1003 },
  },
  {
    id: 'demo-so-3', org_id: '', so_number: 2003, title: 'Fleet Wraps - 3 Trucks',
    estimate_id: 'demo-est-5', customer_id: null, status: 'in_progress',
    sales_rep_id: null, production_manager_id: null, project_manager_id: null,
    designer_id: null, so_date: '2026-02-19', due_date: '2026-03-10', install_date: null,
    subtotal: 9600, discount: 500, tax_rate: 0.0825, tax_amount: 750.75, total: 9850.75,
    down_payment_pct: 40, payment_terms: 'Net 30', notes: 'Fleet branding', invoiced: false,
    form_data: {}, created_at: '2026-02-19T08:30:00Z', updated_at: '2026-02-20T14:00:00Z',
    customer: { id: 'c5', name: 'Quick Move Co', email: 'ops@quickmove.com' },
    sales_rep: { id: 's2', name: 'Amanda Cross' },
    estimate: { id: 'demo-est-5', estimate_number: 1005 },
  },
  {
    id: 'demo-so-4', org_id: '', so_number: 2004, title: 'Composite Deck Install',
    estimate_id: 'demo-est-6', customer_id: null, status: 'on_hold',
    sales_rep_id: null, production_manager_id: null, project_manager_id: null,
    designer_id: null, so_date: '2026-02-20', due_date: '2026-03-15', install_date: null,
    subtotal: 12400, discount: 0, tax_rate: 0.0825, tax_amount: 1023, total: 13423,
    down_payment_pct: 50, payment_terms: 'Net 30', notes: '400 sq ft deck', invoiced: false,
    form_data: {}, created_at: '2026-02-20T15:00:00Z', updated_at: '2026-02-20T15:00:00Z',
    customer: { id: 'c6', name: 'Jennifer Adams', email: 'jen@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
    estimate: { id: 'demo-est-6', estimate_number: 1006 },
  },
  {
    id: 'demo-so-5', org_id: '', so_number: 2005, title: 'Tesla Model Y PPF',
    estimate_id: null, customer_id: null, status: 'completed',
    sales_rep_id: null, production_manager_id: null, project_manager_id: null,
    designer_id: null, so_date: '2026-01-25', due_date: '2026-02-05', install_date: '2026-02-03',
    subtotal: 3800, discount: 0, tax_rate: 0.0825, tax_amount: 313.50, total: 4113.50,
    down_payment_pct: 50, payment_terms: 'Net 30', notes: 'Full front PPF', invoiced: true,
    form_data: {}, created_at: '2026-01-25T10:00:00Z', updated_at: '2026-02-05T16:00:00Z',
    customer: { id: 'c7', name: 'Lisa Wang', email: 'lisa@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
  },
]

const STATUS_CONFIG: Record<SalesOrderStatus, { label: string; color: string; bg: string }> = {
  new:         { label: 'New',         color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  in_progress: { label: 'In Progress', color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  completed:   { label: 'Completed',   color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  on_hold:     { label: 'On Hold',     color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  void:        { label: 'Void',        color: 'var(--text3)',  bg: 'rgba(90,96,128,0.10)' },
}

type TabFilter = 'all' | 'new' | 'in_progress' | 'completed'

interface Props {
  profile: Profile
  initialOrders: SalesOrder[]
}

export default function SalesOrdersClient({ profile, initialOrders }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const usingDemo = initialOrders.length === 0
  const allOrders = usingDemo ? DEMO_ORDERS : initialOrders

  const [orders] = useState<SalesOrder[]>(allOrders)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [creating, setCreating] = useState(false)

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // Filter logic
  const filtered = useMemo(() => {
    let list = orders
    if (tab !== 'all') list = list.filter(o => o.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.email?.toLowerCase().includes(q) ||
        String(o.so_number).includes(q)
      )
    }
    return list
  }, [orders, tab, search])

  // Stats
  const stats = useMemo(() => {
    const newCount = orders.filter(o => o.status === 'new').length
    const inProgress = orders.filter(o => o.status === 'in_progress').length
    const completed = orders.filter(o => o.status === 'completed').length
    const pipelineValue = orders
      .filter(o => o.status === 'new' || o.status === 'in_progress')
      .reduce((s, o) => s + (o.total || 0), 0)
    const wonValue = orders
      .filter(o => o.status === 'completed')
      .reduce((s, o) => s + (o.total || 0), 0)
    return { newCount, inProgress, completed, pipelineValue, wonValue, total: orders.length }
  }, [orders])

  async function handleCreate() {
    if (!canWrite) return
    setCreating(true)
    try {
      const { data, error } = await supabase.from('sales_orders').insert({
        org_id: profile.org_id,
        title: 'New Sales Order',
        status: 'new',
        sales_rep_id: profile.id,
        so_date: new Date().toISOString().split('T')[0],
      }).select().single()

      if (error) throw error
      if (data) router.push(`/sales-orders/${data.id}`)
    } catch (err) {
      console.error('Create SO error:', err)
      router.push('/sales-orders/demo-so-1')
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
    { key: 'all', label: 'All', count: orders.length },
    { key: 'new', label: 'New', count: stats.newCount },
    { key: 'in_progress', label: 'In Progress', count: stats.inProgress },
    { key: 'completed', label: 'Completed', count: stats.completed },
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
          <span>Showing demo data. Run the v6 migration SQL to enable live sales orders.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', marginBottom: 4,
          }}>
            Sales Orders
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {stats.total} order{stats.total !== 1 ? 's' : ''} total
          </p>
        </div>
        {canWrite && (
          <button onClick={handleCreate} disabled={creating} className="btn-primary">
            <Plus size={14} /> New Sales Order
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={<FileText size={16} />} label="New" value={stats.newCount} color="var(--text3)" />
        <StatCard icon={<PlayCircle size={16} />} label="In Progress" value={stats.inProgress} color="var(--accent)" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Completed" value={stats.completed} color="var(--green)" />
        <StatCard icon={<DollarSign size={16} />} label="Pipeline Value" value={fmtCurrency(stats.pipelineValue)} color="var(--amber)" isMono />
        <StatCard icon={<TrendingUp size={16} />} label="Won Value" value={fmtCurrency(stats.wonValue)} color="var(--green)" isMono />
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
            placeholder="Search sales orders..."
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
              <th style={{ width: 80 }}>SO#</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Rep</th>
              <th>Estimate#</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Date</th>
              <th>Due</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                  {search ? 'No sales orders match your search' : 'No sales orders yet'}
                </td>
              </tr>
            ) : (
              filtered.map(so => {
                const sc = STATUS_CONFIG[so.status]
                return (
                  <tr key={so.id} onClick={() => router.push(`/sales-orders/${so.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                        SO-{so.so_number}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                      {so.title}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {so.customer?.name || '--'}
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
                    <td style={{ fontSize: 13 }}>
                      {so.sales_rep?.name || '--'}
                    </td>
                    <td>
                      {so.estimate?.estimate_number ? (
                        <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                          EST-{so.estimate.estimate_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>--</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                        {fmtCurrency(so.total)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtDate(so.so_date)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtDate(so.due_date)}
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
