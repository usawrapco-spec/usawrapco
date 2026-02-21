'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Send, CheckCircle2, XCircle, FileText, Plus,
  Trash2, Package, Car, Ruler, Paintbrush, ChevronDown, ChevronUp,
  ArrowRight, Copy, AlertTriangle, MoreHorizontal, FileDown, Ban,
  Layers, SlidersHorizontal, Shield,
} from 'lucide-react'
import type { Profile, Estimate, LineItem, LineItemSpecs, EstimateStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

// ─── Demo data ──────────────────────────────────────────────────────────────────
const DEMO_ESTIMATE: Estimate = {
  id: 'demo-est-1', org_id: '', estimate_number: 1001, title: 'Ford F-150 Full Wrap',
  customer_id: null, status: 'draft', sales_rep_id: null, production_manager_id: null,
  project_manager_id: null, quote_date: '2026-02-18', due_date: '2026-03-01',
  subtotal: 4450, discount: 0, tax_rate: 0.0825, tax_amount: 367.13, total: 4817.13,
  notes: 'Matte black full wrap with chrome delete', customer_note: 'Looking forward to seeing this!',
  division: 'wraps', form_data: {}, created_at: '2026-02-18T10:00:00Z',
  updated_at: '2026-02-18T10:00:00Z',
  customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
  sales_rep: { id: 's1', name: 'Tyler Reid' },
}

const DEMO_LINE_ITEMS: LineItem[] = [
  {
    id: 'li-1', parent_type: 'estimate', parent_id: 'demo-est-1', product_type: 'wrap',
    name: 'Full Body Wrap - Matte Black', description: '3M 2080 Matte Black full body wrap including bumpers and mirrors',
    quantity: 1, unit_price: 2800, unit_discount: 0, total_price: 2800,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'Truck', wrapType: 'Full Wrap',
      vinylType: '3M 2080 Matte Black', laminate: '3M 8910',
      windowPerf: false, vinylArea: 280, perfArea: 0, complexity: 3,
      materialCost: 850, laborCost: 1200, laborPrice: 1600, machineCost: 150,
    },
    sort_order: 0, created_at: '2026-02-18T10:00:00Z',
  },
  {
    id: 'li-2', parent_type: 'estimate', parent_id: 'demo-est-1', product_type: 'ppf',
    name: 'PPF - Full Front End', description: 'XPEL Ultimate Plus full front including hood, fenders, bumper, mirrors, headlights',
    quantity: 1, unit_price: 1650, unit_discount: 0, total_price: 1650,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'Truck', wrapType: 'Paint Protection Film',
      vinylType: 'XPEL Ultimate Plus', laminate: 'N/A',
      windowPerf: false, vinylArea: 65, perfArea: 0, complexity: 4,
      materialCost: 480, laborCost: 600, laborPrice: 850, machineCost: 120,
    },
    sort_order: 1, created_at: '2026-02-18T10:00:00Z',
  },
]

const STATUS_CONFIG: Record<EstimateStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  sent:     { label: 'Sent',     color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  accepted: { label: 'Accepted', color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  expired:  { label: 'Expired',  color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  rejected: { label: 'Rejected', color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
  void:     { label: 'Void',     color: 'var(--text3)',  bg: 'rgba(90,96,128,0.10)' },
}

interface Props {
  profile: Profile
  estimate: Estimate | null
  lineItems: LineItem[]
  team: Pick<Profile, 'id' | 'name' | 'role'>[]
  isDemo: boolean
  estimateId: string
}

export default function EstimateDetailClient({ profile, estimate, lineItems, team, isDemo, estimateId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isNew = !estimate && !isDemo
  const est = estimate || DEMO_ESTIMATE
  const items = lineItems.length > 0 ? lineItems : isDemo ? DEMO_LINE_ITEMS : []

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  const [title, setTitle] = useState(est.title)
  const [status, setStatus] = useState<EstimateStatus>(est.status)
  const [notes, setNotes] = useState(est.notes || '')
  const [customerNote, setCustomerNote] = useState(est.customer_note || '')
  const [discount, setDiscount] = useState(est.discount)
  const [taxRate, setTaxRate] = useState(est.tax_rate)
  const [quoteDate, setQuoteDate] = useState(est.quote_date || '')
  const [dueDate, setDueDate] = useState(est.due_date || '')
  const [lineItemsList, setLineItemsList] = useState<LineItem[]>(items)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Calculated totals
  const subtotal = useMemo(() => lineItemsList.reduce((s, li) => s + li.total_price, 0), [lineItemsList])
  const taxAmount = useMemo(() => (subtotal - discount) * taxRate, [subtotal, discount, taxRate])
  const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount])

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const fmtDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    if (!canWrite || isDemo) { showToast('Demo mode - cannot save'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('estimates').update({
        title, notes, customer_note: customerNote, discount, tax_rate: taxRate,
        subtotal, tax_amount: taxAmount, total, status,
        quote_date: quoteDate || null, due_date: dueDate || null,
      }).eq('id', estimateId)
      if (error) throw error
      showToast('Estimate saved')
    } catch (err) {
      console.error('Save error:', err)
      showToast('Error saving estimate')
    }
    setSaving(false)
  }

  async function handleLineItemSave(item: LineItem) {
    if (isDemo || item.id.startsWith('new-')) return
    try {
      await supabase.from('line_items').update({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_discount: item.unit_discount,
        total_price: item.total_price,
        specs: item.specs,
        sort_order: item.sort_order,
        product_type: item.product_type,
      }).eq('id', item.id)
    } catch (err) {
      console.error('Line item save error:', err)
    }
  }

  async function handleStatusChange(newStatus: EstimateStatus) {
    if (!canWrite) return
    setStatus(newStatus)
    setMenuOpen(false)
    if (!isDemo) {
      try {
        await supabase.from('estimates').update({ status: newStatus }).eq('id', estimateId)
        showToast(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
      } catch {}
    } else {
      showToast(`Status changed to ${STATUS_CONFIG[newStatus].label} (demo)`)
    }
  }

  async function handleConvertToSO() {
    if (!canWrite) return
    setMenuOpen(false)
    showToast('Converting to Sales Order...')
    try {
      const { data, error } = await supabase.from('sales_orders').insert({
        org_id: est.org_id || profile.org_id,
        title: est.title,
        estimate_id: isDemo ? null : estimateId,
        customer_id: est.customer_id,
        sales_rep_id: est.sales_rep_id || profile.id,
        subtotal, discount, tax_rate: taxRate, tax_amount: taxAmount, total,
        notes: est.notes,
        so_date: new Date().toISOString().split('T')[0],
      }).select().single()

      if (error) throw error
      if (data) {
        // Copy line items to new SO
        if (lineItemsList.length > 0 && !isDemo) {
          const soItems = lineItemsList.map(li => ({
            parent_type: 'sales_order' as const,
            parent_id: data.id,
            product_type: li.product_type,
            name: li.name,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            unit_discount: li.unit_discount,
            total_price: li.total_price,
            specs: li.specs,
            sort_order: li.sort_order,
          }))
          await supabase.from('line_items').insert(soItems)
        }
        if (!isDemo) {
          await supabase.from('estimates').update({ status: 'accepted' }).eq('id', estimateId)
        }
        router.push(`/sales-orders/${data.id}`)
      }
    } catch (err) {
      console.error('Convert error:', err)
      showToast('Could not convert. Run the v6 migration first.')
    }
  }

  function handleExportPDF() {
    setMenuOpen(false)
    showToast('PDF export coming soon')
  }

  const sc = STATUS_CONFIG[status]

  return (
    <div>
      {/* Demo banner */}
      {isDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Showing demo data. Run the v6 migration to enable live data.</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/estimates')} className="btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
              color: 'var(--text1)', margin: 0, lineHeight: 1,
            }}>
              EST-{est.estimate_number}
            </h1>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '3px 12px',
            borderRadius: 6, fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg,
            letterSpacing: '0.03em',
          }}>
            {sc.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canWrite && (
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {/* "..." Action Menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn-ghost btn-sm"
              style={{ padding: '6px 8px' }}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 200, zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {canWrite && (status === 'draft' || status === 'sent') && (
                  <MenuButton
                    icon={<ArrowRight size={13} style={{ color: 'var(--green)' }} />}
                    label="To Sales Order"
                    onClick={handleConvertToSO}
                  />
                )}
                {canWrite && status === 'draft' && (
                  <MenuButton
                    icon={<Send size={13} style={{ color: 'var(--accent)' }} />}
                    label="Mark as Sent"
                    onClick={() => handleStatusChange('sent')}
                  />
                )}
                {canWrite && status !== 'accepted' && (
                  <MenuButton
                    icon={<CheckCircle2 size={13} style={{ color: 'var(--green)' }} />}
                    label="Mark as Accepted"
                    onClick={() => handleStatusChange('accepted')}
                  />
                )}
                <MenuButton
                  icon={<FileDown size={13} style={{ color: 'var(--accent)' }} />}
                  label="Export PDF"
                  onClick={handleExportPDF}
                />
                {canWrite && status !== 'void' && (
                  <>
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                    <MenuButton
                      icon={<Ban size={13} style={{ color: 'var(--red)' }} />}
                      label="Void"
                      onClick={() => handleStatusChange('void')}
                      danger
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column: Details + Line Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Estimate info card */}
          <div className="card">
            <div className="section-label">Estimate Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleSave}
                  className="field"
                  disabled={!canWrite}
                />
              </div>
              <div>
                <label className="field-label">Customer</label>
                <input
                  value={est.customer?.name || ''}
                  className="field"
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
              <div>
                <label className="field-label">Sales Rep</label>
                <input
                  value={est.sales_rep?.name || profile.name}
                  className="field"
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
              <div>
                <label className="field-label">Quote Date</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={e => setQuoteDate(e.target.value)}
                  onBlur={handleSave}
                  className="field"
                  disabled={!canWrite}
                />
              </div>
              <div>
                <label className="field-label">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  onBlur={handleSave}
                  className="field"
                  disabled={!canWrite}
                />
              </div>
              <div>
                <label className="field-label">Division</label>
                <input
                  value={est.division === 'wraps' ? 'Wraps' : 'Decking'}
                  className="field"
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="section-label" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
                Line Items ({lineItemsList.length})
              </div>
              {canWrite && (
                <button
                  className="btn-ghost btn-xs"
                  onClick={() => {
                    const newItem: LineItem = {
                      id: `new-${Date.now()}`, parent_type: 'estimate', parent_id: estimateId,
                      product_type: 'wrap', name: '', description: null,
                      quantity: 1, unit_price: 0, unit_discount: 0, total_price: 0,
                      specs: {}, sort_order: lineItemsList.length, created_at: new Date().toISOString(),
                    }
                    setLineItemsList(prev => [...prev, newItem])
                    setExpandedItem(newItem.id)
                  }}
                >
                  <Plus size={12} /> Add New Line Item
                </button>
              )}
            </div>

            {lineItemsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>
                No line items yet. Click &quot;Add New Line Item&quot; to start building this estimate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lineItemsList.map((li, idx) => (
                  <LineItemCard
                    key={li.id}
                    item={li}
                    index={idx}
                    isExpanded={expandedItem === li.id}
                    onToggle={() => setExpandedItem(expandedItem === li.id ? null : li.id)}
                    canWrite={canWrite}
                    onChange={(updated) => {
                      setLineItemsList(prev => prev.map(x => x.id === li.id ? updated : x))
                    }}
                    onBlurSave={(updated) => handleLineItemSave(updated)}
                    onRemove={() => {
                      setLineItemsList(prev => prev.filter(x => x.id !== li.id))
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card">
            <div className="section-label">Notes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={handleSave}
                  className="field"
                  rows={4}
                  disabled={!canWrite}
                  placeholder="Internal notes (not visible to customer)..."
                />
              </div>
              <div>
                <label className="field-label">Customer Note</label>
                <textarea
                  value={customerNote}
                  onChange={e => setCustomerNote(e.target.value)}
                  onBlur={handleSave}
                  className="field"
                  rows={4}
                  disabled={!canWrite}
                  placeholder="Note visible to customer..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Pricing summary + Actions */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="section-label">Pricing Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PricingRow label="Subtotal" value={fmtCurrency(subtotal)} />
              <div>
                <label className="field-label">Discount</label>
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  onBlur={handleSave}
                  className="field mono"
                  disabled={!canWrite}
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <label className="field-label">Tax Rate</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    value={(taxRate * 100).toFixed(2)}
                    onChange={e => setTaxRate(Number(e.target.value) / 100)}
                    onBlur={handleSave}
                    className="field mono"
                    disabled={!canWrite}
                    min={0}
                    max={100}
                    step={0.01}
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
                </div>
              </div>
              <PricingRow label="Tax" value={fmtCurrency(taxAmount)} />
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                <PricingRow label="Total" value={fmtCurrency(total)} isTotal />
              </div>
            </div>
          </div>

          {/* Convert to Sales Order button */}
          {canWrite && (status === 'draft' || status === 'sent' || status === 'accepted') && (
            <button
              onClick={handleConvertToSO}
              className="btn-primary"
              style={{
                background: 'var(--green)', width: '100%', justifyContent: 'center',
                padding: '12px 20px', fontSize: 14, fontWeight: 700,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              <ArrowRight size={15} /> Convert to Sales Order
            </button>
          )}

          {/* Status actions */}
          {canWrite && (
            <div className="card">
              <div className="section-label">Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {status === 'draft' && (
                  <button onClick={() => handleStatusChange('sent')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <Send size={13} style={{ color: 'var(--accent)' }} /> Mark as Sent
                  </button>
                )}
                {status !== 'accepted' && (
                  <button onClick={() => handleStatusChange('accepted')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--green)' }} /> Mark as Accepted
                  </button>
                )}
                {status !== 'rejected' && (
                  <button onClick={() => handleStatusChange('rejected')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <XCircle size={13} style={{ color: 'var(--red)' }} /> Mark as Rejected
                  </button>
                )}
                {status !== 'void' && (
                  <button onClick={() => handleStatusChange('void')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <Ban size={13} style={{ color: 'var(--text3)' }} /> Void Estimate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Menu Button ────────────────────────────────────────────────────────────
function MenuButton({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
        background: 'transparent', color: danger ? 'var(--red)' : 'var(--text1)',
        fontSize: 13, fontWeight: 500, textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Line Item Card ──────────────────────────────────────────────────────────
function LineItemCard({
  item, index, isExpanded, onToggle, canWrite, onChange, onBlurSave, onRemove,
}: {
  item: LineItem; index: number; isExpanded: boolean; onToggle: () => void
  canWrite: boolean; onChange: (item: LineItem) => void; onBlurSave: (item: LineItem) => void; onRemove: () => void
}) {
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  // Track the latest item for blur saves
  const latestRef = useRef(item)
  latestRef.current = item

  function updateField<K extends keyof LineItem>(key: K, value: LineItem[K]) {
    const updated = { ...latestRef.current, [key]: value }
    if (key === 'quantity' || key === 'unit_price' || key === 'unit_discount') {
      updated.total_price = (updated.quantity * updated.unit_price) - updated.unit_discount
    }
    onChange(updated)
  }

  function updateSpec(key: string, value: unknown) {
    const updated = { ...latestRef.current, specs: { ...latestRef.current.specs, [key]: value } }
    onChange(updated)
  }

  function handleBlur() {
    onBlurSave(latestRef.current)
  }

  const specs = item.specs as LineItemSpecs
  const productTypeLabel: Record<string, string> = {
    wrap: 'Wrap', ppf: 'PPF', decking: 'Decking', design: 'Design',
  }

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {index + 1}.
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
            borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: item.product_type === 'ppf' ? 'var(--cyan)' : item.product_type === 'wrap' ? 'var(--accent)' : 'var(--text3)',
            background: item.product_type === 'ppf' ? 'rgba(34,211,238,0.12)' : item.product_type === 'wrap' ? 'rgba(79,127,255,0.12)' : 'rgba(90,96,128,0.12)',
          }}>
            {productTypeLabel[item.product_type] || item.product_type}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
            {item.name || 'Untitled Item'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Qty {item.quantity}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            @ {fmtCurrency(item.unit_price)}
          </span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
            {fmtCurrency(item.total_price)}
          </span>
          {isExpanded
            ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
          }
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {/* Core fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
            <div>
              <label className="field-label">Name</label>
              <input value={item.name} onChange={e => updateField('name', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} />
            </div>
            <div>
              <label className="field-label">Product Type</label>
              <select
                value={item.product_type}
                onChange={e => updateField('product_type', e.target.value as LineItem['product_type'])}
                onBlur={handleBlur}
                className="field"
                disabled={!canWrite}
              >
                <option value="wrap">Wrap</option>
                <option value="ppf">PPF</option>
                <option value="decking">Decking</option>
                <option value="design">Design</option>
              </select>
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input type="number" value={item.quantity} onChange={e => updateField('quantity', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} step={1} />
            </div>
            <div>
              <label className="field-label">Unit Price</label>
              <input type="number" value={item.unit_price} onChange={e => updateField('unit_price', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} step={0.01} />
            </div>
          </div>

          {/* Vehicle specs */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Car size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Info</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div>
                <label className="field-label">Year</label>
                <input value={specs.vehicleYear || ''} onChange={e => updateSpec('vehicleYear', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} placeholder="2024" />
              </div>
              <div>
                <label className="field-label">Make</label>
                <input value={specs.vehicleMake || ''} onChange={e => updateSpec('vehicleMake', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} placeholder="Ford" />
              </div>
              <div>
                <label className="field-label">Model</label>
                <input value={specs.vehicleModel || ''} onChange={e => updateSpec('vehicleModel', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} placeholder="F-150" />
              </div>
              <div>
                <label className="field-label">Color</label>
                <input value={specs.vehicleColor || ''} onChange={e => updateSpec('vehicleColor', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} placeholder="White" />
              </div>
            </div>
          </div>

          {/* Wrap / Material specs */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Paintbrush size={13} style={{ color: 'var(--purple)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Material Specs</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div>
                <label className="field-label">Wrap Type</label>
                <input value={specs.wrapType || ''} onChange={e => updateSpec('wrapType', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Vinyl Type</label>
                <input value={specs.vinylType || ''} onChange={e => updateSpec('vinylType', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Laminate</label>
                <input value={specs.laminate || ''} onChange={e => updateSpec('laminate', e.target.value)} onBlur={handleBlur} className="field" disabled={!canWrite} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
              <div>
                <label className="field-label">Window Perf</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => { if (canWrite) updateSpec('windowPerf', !specs.windowPerf) }}
                    onBlur={handleBlur}
                    style={{
                      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      background: specs.windowPerf ? 'var(--green)' : 'var(--surface)',
                      position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 2,
                      left: specs.windowPerf ? 18 : 2,
                      transition: 'left 0.2s',
                    }} />
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {specs.windowPerf ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div>
                <label className="field-label">Vinyl Area (sqft)</label>
                <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} />
              </div>
              <div>
                <label className="field-label">Perf Area (sqft)</label>
                <input type="number" value={specs.perfArea || ''} onChange={e => updateSpec('perfArea', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} />
              </div>
            </div>
          </div>

          {/* Complexity slider */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <SlidersHorizontal size={13} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complexity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={specs.complexity || 1}
                onChange={e => updateSpec('complexity', Number(e.target.value))}
                onBlur={handleBlur}
                disabled={!canWrite}
                style={{
                  flex: 1, height: 6, appearance: 'none', WebkitAppearance: 'none',
                  borderRadius: 3, background: `linear-gradient(to right, var(--green) 0%, var(--amber) 50%, var(--red) 100%)`,
                  cursor: canWrite ? 'pointer' : 'default', opacity: canWrite ? 1 : 0.5,
                }}
              />
              <span className="mono" style={{
                fontSize: 16, fontWeight: 800,
                color: (specs.complexity || 1) <= 2 ? 'var(--green)' : (specs.complexity || 1) <= 3 ? 'var(--amber)' : 'var(--red)',
                minWidth: 28, textAlign: 'center',
              }}>
                {specs.complexity || 1}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ 5</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ruler size={13} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing Breakdown</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div>
                <label className="field-label">Material Cost</label>
                <input type="number" value={specs.materialCost || ''} onChange={e => updateSpec('materialCost', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} step={0.01} />
              </div>
              <div>
                <label className="field-label">Labor Cost</label>
                <input type="number" value={specs.laborCost || ''} onChange={e => updateSpec('laborCost', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} step={0.01} />
              </div>
              <div>
                <label className="field-label">Labor Price</label>
                <input type="number" value={specs.laborPrice || ''} onChange={e => updateSpec('laborPrice', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} step={0.01} />
              </div>
              <div>
                <label className="field-label">Machine Cost</label>
                <input type="number" value={specs.machineCost || ''} onChange={e => updateSpec('machineCost', Number(e.target.value))} onBlur={handleBlur} className="field mono" disabled={!canWrite} min={0} step={0.01} />
              </div>
            </div>
          </div>

          {/* Description for Customer + Notes */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="field-label">Description for Customer</label>
                <textarea
                  value={item.description || ''}
                  onChange={e => updateField('description', e.target.value)}
                  onBlur={handleBlur}
                  className="field"
                  rows={3}
                  disabled={!canWrite}
                  placeholder="Description visible on the estimate..."
                />
              </div>
              <div>
                <label className="field-label">Internal Notes</label>
                <textarea
                  value={specs.notes || ''}
                  onChange={e => updateSpec('notes', e.target.value)}
                  onBlur={handleBlur}
                  className="field"
                  rows={3}
                  disabled={!canWrite}
                  placeholder="Internal notes for this line item..."
                />
              </div>
            </div>
          </div>

          {canWrite && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onRemove} className="btn-ghost btn-xs" style={{ color: 'var(--red)' }}>
                <Trash2 size={12} /> Remove Item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Pricing Row ─────────────────────────────────────────────────────────────
function PricingRow({ label, value, isTotal }: { label: string; value: string; isTotal?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: isTotal ? 14 : 13, color: isTotal ? 'var(--text1)' : 'var(--text2)', fontWeight: isTotal ? 700 : 400 }}>
        {label}
      </span>
      <span className="mono" style={{
        fontSize: isTotal ? 18 : 14, color: isTotal ? 'var(--green)' : 'var(--text1)',
        fontWeight: isTotal ? 800 : 600,
      }}>
        {value}
      </span>
    </div>
  )
}
