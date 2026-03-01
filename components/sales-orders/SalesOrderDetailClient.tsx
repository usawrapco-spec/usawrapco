'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, CheckCircle2, XCircle, Plus, Trash2, Package,
  Car, Ruler, Paintbrush, ChevronDown, ChevronUp, ArrowRight,
  AlertTriangle, FileText, Download, MoreVertical, ClipboardList,
  StickyNote, Users, Calendar, Briefcase, DollarSign, Send, Link2,
  CreditCard, Copy, Mail,
} from 'lucide-react'
import PaymentSchedule from './PaymentSchedule'
import type { Profile, SalesOrder, LineItem, LineItemSpecs, SalesOrderStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import RelatedDocsPanel from '@/components/shared/RelatedDocsPanel'
import CustomerSearchModal, { type CustomerRow } from '@/components/shared/CustomerSearchModal'

// ─── Demo data ──────────────────────────────────────────────────────────────────
const DEMO_SO = {
  id: 'demo-so-1', org_id: '', so_number: '2001', title: 'Ford F-150 Full Wrap',
  estimate_id: 'demo-est-1', customer_id: null, status: 'new',
  sales_rep_id: null, production_manager_id: null, project_manager_id: null, designer_id: null,
  so_date: '2026-02-18', due_date: '2026-03-01', install_date: '2026-03-05',
  subtotal: 3200, discount: 0, tax_rate: 0.0825, tax_amount: 264, total: 3464,
  down_payment_pct: 50, payment_terms: 'net_30', notes: 'Matte black full wrap with chrome delete',
  invoiced: false, form_data: {},
  created_at: '2026-02-18T10:00:00Z', updated_at: '2026-02-18T10:00:00Z',
  customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
  sales_rep: { id: 's1', name: 'Tyler Reid' },
  estimate: { id: 'demo-est-1', estimate_number: '1001' },
} as SalesOrder

const DEMO_LINE_ITEMS: LineItem[] = [
  {
    id: 'soli-1', parent_type: 'sales_order', parent_id: 'demo-so-1', product_type: 'wrap',
    name: 'Full Body Wrap - Matte Black', description: '3M 2080 Matte Black',
    quantity: 1, unit_price: 2800, unit_discount: 0, total_price: 2800,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'Truck', wrapType: 'Full Wrap',
      vinylType: '3M 2080 Matte Black', laminate: '3M 8910',
      vinylArea: 280, complexity: 3, materialCost: 850, laborCost: 1200, laborPrice: 1600,
    },
    sort_order: 0, created_at: '2026-02-18T10:00:00Z',
  },
  {
    id: 'soli-2', parent_type: 'sales_order', parent_id: 'demo-so-1', product_type: 'wrap',
    name: 'Chrome Delete Package', description: 'Gloss black chrome delete - all trim',
    quantity: 1, unit_price: 400, unit_discount: 0, total_price: 400,
    specs: {
      wrapType: 'Chrome Delete', vinylType: '3M 2080 Gloss Black',
      vinylArea: 20, complexity: 2, materialCost: 60, laborCost: 200, laborPrice: 280,
    },
    sort_order: 1, created_at: '2026-02-18T10:00:00Z',
  },
]

const STATUS_CONFIG: Record<SalesOrderStatus, { label: string; color: string; bg: string }> = {
  new:         { label: 'New',         color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  in_progress: { label: 'In Progress', color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  completed:   { label: 'Completed',   color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  cancelled:   { label: 'Cancelled',   color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
  on_hold:     { label: 'On Hold',     color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  void:        { label: 'Void',        color: 'var(--text3)',  bg: 'rgba(90,96,128,0.10)' },
}

const STATUS_FLOW: SalesOrderStatus[] = ['new', 'in_progress', 'completed', 'on_hold']

const PAYMENT_TERMS_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: '50_50', label: '50/50 Split' },
]

const LABOR_RATE_SO = 30
const DESIGN_FEE_DEFAULT_SO = 150
const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const SO_COMMISSION_RATES: Record<string, { base: number; max: number; bonuses: boolean }> = {
  inbound:  { base: 0.045, max: 0.075, bonuses: true },
  outbound: { base: 0.07,  max: 0.10,  bonuses: true },
  presold:  { base: 0.05,  max: 0.05,  bonuses: false },
}

function calcSOItemCOGS(item: LineItem): { material: number; labor: number; design: number; misc: number } {
  const s = item.specs as Record<string, unknown>
  const material = (s.materialCost as number) || 0
  const labor    = (s.laborCost as number) || ((s.estimatedHours as number) || 0) * LABOR_RATE_SO
  const design   = (s.designFee as number) ?? DESIGN_FEE_DEFAULT_SO
  const misc     = (s.machineCost as number) || 0
  return { material, labor, design, misc }
}

type DetailTab = 'items' | 'payment_schedule' | 'tasks' | 'notes'

// ─── Team Multi-Select Component ─────────────────────────────────────────────

function TeamMultiSelect({
  label,
  members,
  selectedIds,
  onChange,
  canWrite,
  accentColor = '#4f7fff',
}: {
  label: string
  members: Pick<Profile, 'id' | 'name' | 'role'>[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  canWrite: boolean
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = members.filter(m => selectedIds.includes(m.id))
  const available = members.filter(m => !selectedIds.includes(m.id))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <label className="field-label">{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4, minHeight: 22 }}>
        {selected.map(m => (
          <span
            key={m.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 600, padding: '2px 7px',
              borderRadius: 4, background: `${accentColor}20`, color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {m.name}
            {canWrite && (
              <button
                onClick={() => toggle(m.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: accentColor, padding: 0, lineHeight: 1, fontSize: 13, marginLeft: 1 }}
              >×</button>
            )}
          </span>
        ))}
        {selected.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>None</span>
        )}
      </div>
      {canWrite && (
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--text3)', cursor: 'pointer',
              background: 'none', border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 5, padding: '2px 8px',
            }}
          >
            <Plus size={10} /> Add
          </button>
          {open && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 300, minWidth: 160,
            }}>
              {available.length === 0 ? (
                <p style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text3)' }}>All assigned</p>
              ) : available.map(m => (
                <button
                  key={m.id}
                  onClick={() => { toggle(m.id); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 12px', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text1)',
                    fontSize: 12, textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `${accentColor}20`, color: accentColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{m.name?.[0]?.toUpperCase()}</span>
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  profile: Profile
  salesOrder: SalesOrder | null
  lineItems: LineItem[]
  team: Pick<Profile, 'id' | 'name' | 'role'>[]
  isDemo: boolean
  orderId: string
}

export default function SalesOrderDetailClient({ profile, salesOrder, lineItems, team, isDemo, orderId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const so = salesOrder || DEMO_SO
  const items = lineItems.length > 0 ? lineItems : isDemo ? DEMO_LINE_ITEMS : []

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // State
  const [title, setTitle] = useState(so.title)
  const [status, setStatus] = useState<SalesOrderStatus>(so.status)
  const [notes, setNotes] = useState(so.notes || '')
  const [showNotes, setShowNotes] = useState(!!so.notes)
  const [discount, setDiscount] = useState(so.discount)
  const [taxRate, setTaxRate] = useState(so.tax_rate)
  const [soDate, setSoDate] = useState(so.so_date || '')
  const [dueDate, setDueDate] = useState(so.due_date || '')
  const [installDate, setInstallDate] = useState(so.install_date || '')
  const [paymentTerms, setPaymentTerms] = useState(so.payment_terms || 'net_30')
  const [downPaymentPct, setDownPaymentPct] = useState<number>(so.down_payment_pct ?? 0)
  const [lineItemsList, setLineItemsList] = useState<LineItem[]>(items)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('items')
  const [leadType, setLeadType] = useState<string>((so.form_data?.leadType as string) || 'inbound')
  const [torqBonus, setTorqBonus] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerRow | null>(
    so.customer ? { id: so.customer.id, name: so.customer.name, email: so.customer.email ?? null, phone: null, company_name: null, lifetime_spend: null } : null
  )
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  // Vehicle fields — read from DB columns, fall back to form_data for older records
  const [vehicleYear, setVehicleYear] = useState<string>(so.vehicle_year || (so.form_data?.vehicleYear as string) || '')
  const [vehicleMake, setVehicleMake] = useState<string>(so.vehicle_make || (so.form_data?.vehicleMake as string) || '')
  const [vehicleModel, setVehicleModel] = useState<string>(so.vehicle_model || (so.form_data?.vehicleModel as string) || '')
  const [vehicleVin, setVehicleVin] = useState<string>(so.vehicle_vin || '')
  const [vehicleColor, setVehicleColor] = useState<string>(so.vehicle_color || '')

  // Team multi-select arrays — fall back to single legacy values
  const [salesRepIds, setSalesRepIds] = useState<string[]>(
    so.sales_rep_ids?.length ? so.sales_rep_ids : so.sales_rep_id ? [so.sales_rep_id] : []
  )
  const [installerIds, setInstallerIds] = useState<string[]>(so.installer_ids || [])
  const [designerIds, setDesignerIds] = useState<string[]>(
    so.designer_ids?.length ? so.designer_ids : so.designer_id ? [so.designer_id] : []
  )
  const [productionMgrIds, setProductionMgrIds] = useState<string[]>(
    so.production_manager_ids?.length ? so.production_manager_ids : so.production_manager_id ? [so.production_manager_id] : []
  )

  // Calculated totals
  const subtotal = useMemo(() => lineItemsList.reduce((s, li) => s + li.total_price, 0), [lineItemsList])
  const taxAmount = useMemo(() => (subtotal - discount) * taxRate, [subtotal, discount, taxRate])
  const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount])
  const downPayment = useMemo(() => total * ((downPaymentPct ?? 0) / 100), [total, downPaymentPct])

  // Unified financial panel calculations
  const cogsBreakdown = useMemo(() => lineItemsList.reduce((acc, li) => {
    const c = calcSOItemCOGS(li)
    acc.material += c.material
    acc.labor    += c.labor
    acc.design   += c.design
    acc.misc     += c.misc
    return acc
  }, { material: 0, labor: 0, design: 0, misc: 0 }), [lineItemsList])
  const totalCOGS = useMemo(() => cogsBreakdown.material + cogsBreakdown.labor + cogsBreakdown.design + cogsBreakdown.misc, [cogsBreakdown])
  const totalGP   = useMemo(() => subtotal - totalCOGS, [subtotal, totalCOGS])
  const overallGPM = useMemo(() => subtotal > 0 ? (totalGP / subtotal) * 100 : 0, [totalGP, subtotal])
  const commRate = useMemo(() => {
    const rates = SO_COMMISSION_RATES[leadType] || SO_COMMISSION_RATES.inbound
    if (!rates.bonuses || overallGPM < 65) return rates.base
    let rate = rates.base
    if (overallGPM >= 73) rate += 0.02
    if (torqBonus) rate += 0.01
    return Math.min(rate, rates.max)
  }, [leadType, overallGPM, torqBonus])
  const estCommission = useMemo(() => Math.max(0, totalGP * commRate), [totalGP, commRate])

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  function showToastMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    if (!canWrite || isDemo) { showToastMsg('Demo mode - cannot save'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('sales_orders').update({
        title, notes, discount, tax_rate: taxRate,
        subtotal, tax_amount: taxAmount, total, status,
        so_date: soDate || null, due_date: dueDate || null,
        install_date: installDate || null,
        payment_terms: paymentTerms, down_payment_pct: downPaymentPct,
        vehicle_year: vehicleYear || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_vin: vehicleVin || null,
        vehicle_color: vehicleColor || null,
        sales_rep_id: salesRepIds[0] || null,
        sales_rep_ids: salesRepIds,
        installer_ids: installerIds,
        designer_ids: designerIds,
        designer_id: designerIds[0] || null,
        production_manager_id: productionMgrIds[0] || null,
        production_manager_ids: productionMgrIds,
        project_manager_id: null,
        form_data: { ...so.form_data, vehicleYear: vehicleYear || undefined, vehicleMake: vehicleMake || undefined, vehicleModel: vehicleModel || undefined },
      }).eq('id', orderId)
      if (error) throw error
      showToastMsg('Sales order saved')
    } catch (err) {
      console.error('Save error:', err)
      showToastMsg('Error saving sales order')
    }
    setSaving(false)
  }

  async function handleStatusChange(newStatus: SalesOrderStatus) {
    if (!canWrite) return
    setStatus(newStatus)
    if (!isDemo) {
      try {
        await supabase.from('sales_orders').update({ status: newStatus }).eq('id', orderId)
        showToastMsg(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
      } catch {}
    }
  }

  async function handleCreateJob(mode: 'single' | 'per_item') {
    if (!canWrite) return
    showToastMsg(mode === 'single' ? 'Creating single job...' : 'Creating jobs per line item...')
    try {
      if (mode === 'single') {
        const { data, error } = await supabase.from('projects').insert({
          org_id: so.org_id || profile.org_id,
          title: so.title,
          type: 'wrap',
          status: 'active',
          pipe_stage: 'sales_in',
          customer_id: so.customer_id,
          agent_id: salesRepIds[0] || so.sales_rep_id || profile.id,
          revenue: total,
          due_date: dueDate || null,
          install_date: installDate || null,
          division: 'wraps',
          form_data: { sales_order_id: isDemo ? null : orderId },
        }).select().single()
        if (error) throw error
        if (data) router.push(`/projects/${data.id}`)
      } else {
        const inserts = lineItemsList.map(li => ({
          org_id: so.org_id || profile.org_id,
          title: li.name || so.title,
          type: li.product_type || 'wrap',
          status: 'active' as const,
          pipe_stage: 'sales_in' as const,
          customer_id: so.customer_id,
          agent_id: salesRepIds[0] || so.sales_rep_id || profile.id,
          revenue: li.total_price,
          due_date: dueDate || null,
          install_date: installDate || null,
          division: 'wraps' as const,
          vehicle_desc: li.specs?.vehicleYear
            ? `${li.specs.vehicleYear} ${li.specs.vehicleMake || ''} ${li.specs.vehicleModel || ''}`.trim()
            : null,
          form_data: { sales_order_id: isDemo ? null : orderId, line_item_id: li.id },
        }))
        const { error } = await supabase.from('projects').insert(inserts)
        if (error) throw error
        showToastMsg(`${inserts.length} job(s) created`)
        router.push('/pipeline')
      }
    } catch (err) {
      console.error('Create job error:', err)
      showToastMsg('Could not create job. Check permissions.')
    }
  }

  async function handleConvertToInvoice() {
    if (!canWrite) return
    showToastMsg('Creating invoice...')
    try {
      const { data, error } = await supabase.from('invoices').insert({
        org_id: so.org_id || profile.org_id,
        title: so.title,
        so_id: isDemo ? null : orderId,
        customer_id: so.customer_id,
        status: 'draft',
        subtotal, discount, tax_rate: taxRate, tax_amount: taxAmount, total,
        amount_paid: 0, balance_due: total,
        invoice_date: new Date().toISOString().split('T')[0],
        notes: so.notes,
      }).select().single()

      if (error) throw error
      if (data) {
        if (lineItemsList.length > 0 && !isDemo) {
          const invItems = lineItemsList.map(li => ({
            org_id: so.org_id || profile.org_id,
            parent_type: 'invoice' as const,
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
          await supabase.from('line_items').insert(invItems)
        }
        if (!isDemo) {
          await supabase.from('sales_orders').update({ invoiced: true }).eq('id', orderId)
        }
        router.push(`/invoices/${data.id}`)
      }
    } catch (err) {
      console.error('Invoice conversion error:', err)
      showToastMsg('Could not create invoice. Run the v6 migration first.')
    }
  }

  const sc = STATUS_CONFIG[status]

  const DETAIL_TABS: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: 'items', label: 'Items', icon: <Package size={13} /> },
    { key: 'payment_schedule', label: 'Payment Schedule', icon: <DollarSign size={13} /> },
    { key: 'tasks', label: 'Tasks', icon: <ClipboardList size={13} /> },
    { key: 'notes', label: 'Notes', icon: <StickyNote size={13} /> },
  ]

  // Invoice status
  const invoiceStatusConfig = so.invoiced
    ? { label: 'Invoiced', color: 'var(--green)', bg: 'rgba(34,192,122,0.15)' }
    : { label: 'Not Invoiced', color: 'var(--text3)', bg: 'rgba(90,96,128,0.10)' }

  // Portal link handler
  async function handleCopyPortalLink() {
    const token = (so as any).portal_token || orderId
    const link = `${window.location.origin}/portal/quote/${token}`
    try {
      await navigator.clipboard.writeText(link)
      showToastMsg('Portal link copied to clipboard')
    } catch {
      showToastMsg(link)
    }
  }

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
          <span>Viewing demo sales order. Run the v6 migration to enable live data.</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/sales-orders')} className="btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>
                SO #{so.so_number}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: 6, fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg,
              }}>
                {sc.label}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: 6, fontSize: 11, fontWeight: 700,
                color: invoiceStatusConfig.color, background: invoiceStatusConfig.bg,
              }}>
                {invoiceStatusConfig.label}
              </span>
            </div>
            {so.estimate?.estimate_number && (
              <button
                onClick={() => router.push(`/estimates/${so.estimate_id}`)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 12, color: 'var(--text3)', marginTop: 2,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ArrowLeft size={10} />
                <span className="mono">QT #{so.estimate?.estimate_number}</span>
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canWrite && (
            <button onClick={() => handleCreateJob('single')} className="btn-primary btn-sm" style={{ background: 'var(--green)' }}>
              <Briefcase size={13} /> Create Job
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => window.print()}
              className="btn-ghost btn-sm"
              title="Print this sales order"
            >
              <Download size={13} /> Print Sales Order
            </button>
          )}
          {canWrite && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowActions(!showActions)}
                className="btn-ghost btn-sm"
                style={{ padding: '6px 8px' }}
              >
                <MoreVertical size={14} />
              </button>
              {showActions && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 4, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}>
                  <button
                    onClick={() => { handleCreateJob('per_item'); setShowActions(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Package size={13} style={{ color: 'var(--accent)' }} /> Create Job Per Line Item
                  </button>
                  <button
                    onClick={() => { handleConvertToInvoice(); setShowActions(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <FileText size={13} style={{ color: 'var(--green)' }} /> To Invoice
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setActiveTab('payment_schedule'); setShowActions(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <DollarSign size={13} style={{ color: 'var(--green)' }} /> Payment Schedule
                  </button>
                  <button
                    onClick={() => { handleCopyPortalLink(); setShowActions(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Link2 size={13} style={{ color: 'var(--cyan)' }} /> Send to Customer Portal
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <a
                    href={`/api/pdf/quote/${orderId}`}
                    onClick={() => setShowActions(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Download size={13} style={{ color: 'var(--accent)' }} /> Download Quote PDF
                  </a>
                  <a
                    href={`/api/pdf/down-payment/${orderId}`}
                    onClick={() => setShowActions(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <CreditCard size={13} style={{ color: 'var(--amber)' }} /> Down Payment Invoice
                  </a>
                  <button
                    onClick={() => { showToastMsg('Email sent to customer'); setShowActions(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none',
                      color: 'var(--text1)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Mail size={13} style={{ color: 'var(--purple)' }} /> Email Down Payment Invoice
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  {status !== 'void' && (
                    <button
                      onClick={() => { handleStatusChange('void'); setShowActions(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '8px 12px', border: 'none', background: 'none',
                        color: 'var(--red)', fontSize: 13, cursor: 'pointer', borderRadius: 6,
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <XCircle size={13} /> Void Order
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {canWrite && (
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Status flow */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24, padding: '12px 16px',
        background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
      }}>
        {STATUS_FLOW.map((s, i) => {
          const conf = STATUS_CONFIG[s]
          const isActive = s === status
          const isPast = STATUS_FLOW.indexOf(status) > i
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <button
                onClick={() => canWrite && handleStatusChange(s)}
                disabled={!canWrite}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                  fontSize: 12, fontWeight: 700, cursor: canWrite ? 'pointer' : 'default',
                  background: isActive ? conf.bg : isPast ? 'rgba(34,192,122,0.08)' : 'var(--surface2)',
                  color: isActive ? conf.color : isPast ? 'var(--green)' : 'var(--text3)',
                  transition: 'all 0.15s',
                  outline: isActive ? `2px solid ${conf.color}` : 'none',
                  outlineOffset: -2,
                }}
              >
                {conf.label}
              </button>
              {i < STATUS_FLOW.length - 1 && (
                <ArrowRight size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* SO info card */}
          <div className="card">
            <div className="section-label">Sales Order Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                />
              </div>
              <div>
                <label className="field-label">Customer</label>
                {linkedCustomer ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{linkedCustomer.name}</div>
                    {linkedCustomer.company_name && <div style={{ fontSize: 11, color: 'var(--cyan)' }}>{linkedCustomer.company_name}</div>}
                    {linkedCustomer.phone && <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{linkedCustomer.phone}</div>}
                    {linkedCustomer.email && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{linkedCustomer.email}</div>}
                    {canWrite && (
                      <button onClick={() => setCustomerModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600, textAlign: 'left', marginTop: 2 }}>Change</button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setCustomerModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,127,255,0.1)', border: '1px dashed rgba(79,127,255,0.3)', borderRadius: 6, padding: '8px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}
                  >
                    <Plus size={12} /> Add Customer
                  </button>
                )}
                <CustomerSearchModal
                  open={customerModalOpen}
                  onClose={() => setCustomerModalOpen(false)}
                  orgId={profile.org_id}
                  onSelect={async (c) => {
                    setLinkedCustomer(c)
                    setCustomerModalOpen(false)
                    if (!isDemo) await supabase.from('sales_orders').update({ customer_id: c.id }).eq('id', orderId)
                  }}
                />
              </div>
              <div>
                <label className="field-label">Year</label>
                <input
                  value={vehicleYear}
                  onChange={e => setVehicleYear(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="2024"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="field-label">Make</label>
                <input
                  value={vehicleMake}
                  onChange={e => setVehicleMake(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="Ford"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Model</label>
                <input
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="Transit 350"
                />
              </div>
              <div>
                <label className="field-label">Color</label>
                <input
                  value={vehicleColor}
                  onChange={e => setVehicleColor(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="White"
                />
              </div>
              <div>
                <label className="field-label">VIN</label>
                <input
                  value={vehicleVin}
                  onChange={e => setVehicleVin(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="1FTFW1E8..."
                />
              </div>
            </div>
          </div>

          {/* Detail tabs */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border)',
            }}>
              {DETAIL_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px',
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: 'none',
                    color: activeTab === t.key ? 'var(--accent)' : 'var(--text3)',
                    borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 16 }}>
              {/* Items tab */}
              {activeTab === 'items' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Line Items ({lineItemsList.length})
                    </div>
                    {canWrite && (
                      <button
                        className="btn-ghost btn-xs"
                        onClick={() => {
                          const newItem: LineItem = {
                            id: `new-${Date.now()}`, parent_type: 'sales_order', parent_id: orderId,
                            product_type: 'wrap', name: '', description: null,
                            quantity: 1, unit_price: 0, unit_discount: 0, total_price: 0,
                            specs: {}, sort_order: lineItemsList.length, created_at: new Date().toISOString(),
                          }
                          setLineItemsList(prev => [...prev, newItem])
                          setExpandedItem(newItem.id)
                        }}
                      >
                        <Plus size={12} /> Add Item
                      </button>
                    )}
                  </div>

                  {lineItemsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>
                      No line items yet. Click &quot;Add Item&quot; to start building this order.
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
                          onRemove={() => {
                            setLineItemsList(prev => prev.filter(x => x.id !== li.id))
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Schedule tab */}
              {activeTab === 'payment_schedule' && (
                <PaymentSchedule
                  salesOrderId={orderId}
                  total={total}
                  canWrite={canWrite}
                  isDemo={isDemo}
                />
              )}

              {/* Tasks tab */}
              {activeTab === 'tasks' && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
                  <ClipboardList size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No tasks linked to this sales order yet.</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>Tasks will appear here once a job is created.</div>
                </div>
              )}

              {/* Notes tab */}
              {activeTab === 'notes' && (
                <div>
                  {!showNotes && (
                    <button
                      onClick={() => setShowNotes(true)}
                      style={{
                        background: 'transparent', border: 'none', color: 'var(--accent)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0',
                      }}
                    >
                      + Add Internal Notes
                    </button>
                  )}
                  {showNotes && (
                    <>
                      <label className="field-label">Internal Notes</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="field"
                        rows={6}
                        disabled={!canWrite}
                        placeholder="Internal notes (not visible to customer)..."
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Unified Financial Panel ─────────────────────────────────── */}
          <div style={{ background: 'var(--card-bg, var(--surface))', border: '1px solid var(--card-border, var(--border))', borderRadius: 16, overflow: 'hidden' }}>

            {/* ── REVENUE ─────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Revenue</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Sale Price</span>
                <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{fmtCurrency(subtotal)}</span>
              </div>
            </div>

            {/* ── COSTS ───────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Costs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {cogsBreakdown.material > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Material</span>
                    <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.material)}</span>
                  </div>
                )}
                {cogsBreakdown.labor > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Install Labor</span>
                    <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.labor)}</span>
                  </div>
                )}
                {cogsBreakdown.design > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Design Fees</span>
                    <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.design)}</span>
                  </div>
                )}
                {cogsBreakdown.misc > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Production Bonus</span>
                    <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.misc)}</span>
                  </div>
                )}
                <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Total COGS</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{fmtCurrency(totalCOGS)}</span>
                </div>
              </div>
            </div>

            {/* ── PROFIT ──────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Profit</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Gross Profit</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: totalGP >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtCurrency(totalGP)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>GPM</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 900, color: overallGPM >= 73 ? 'var(--green)' : overallGPM >= 65 ? 'var(--amber)' : 'var(--red)' }}>{overallGPM.toFixed(1)}%</span>
                </div>
                {overallGPM < 65 && subtotal > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)' }}>
                    <AlertTriangle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Low Margin — below 65%</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── COMMISSION PREVIEW ──────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Commission Preview</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont }}>Lead Type</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {(['inbound', 'outbound', 'presold'] as const).map(lt => (
                  <button key={lt} onClick={() => setLeadType(lt)} style={{ flex: 1, padding: '5px 2px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em', border: leadType === lt ? '2px solid var(--accent)' : '1px solid var(--border)', background: leadType === lt ? 'rgba(79,127,255,0.12)' : 'var(--bg)', color: leadType === lt ? 'var(--accent)' : 'var(--text3)' }}>
                    {lt === 'presold' ? 'Pre-Sold' : lt === 'inbound' ? 'In' : 'Out'}
                  </button>
                ))}
              </div>
              {(SO_COMMISSION_RATES[leadType] || SO_COMMISSION_RATES.inbound).bonuses && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: torqBonus ? 'var(--text1)' : 'var(--text2)', marginBottom: 8 }}>
                  <input type="checkbox" checked={torqBonus} onChange={() => setTorqBonus(!torqBonus)} />
                  Torq Training Bonus (+1%)
                </label>
              )}
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Commission Rate</span>
                  <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text1)' }}>{(commRate * 100).toFixed(1)}%</span>
                </div>
                {overallGPM < 65 && subtotal > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--amber)', fontStyle: 'italic' }}>Low margin — base rate only</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Est. Commission</span>
                  <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{fmtCurrency(estCommission)}</span>
                </div>
              </div>
            </div>

            {/* ── TOTALS ──────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 10 }}>Totals</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Subtotal</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>{fmtCurrency(subtotal)}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont }}>Discount</label>
                  <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="field mono" disabled={!canWrite} min={0} step={0.01} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont }}>Tax Rate</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" value={(taxRate * 100).toFixed(2)} onChange={e => setTaxRate(Number(e.target.value) / 100)} className="field mono" disabled={!canWrite} min={0} max={100} step={0.01} style={{ flex: 1 }} />
                    <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>{fmtCurrency(taxAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Total</span>
                  <span style={{ fontFamily: monoFont, fontSize: 16, fontWeight: 800, color: 'var(--text1)' }}>{fmtCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* ── PAYMENT ─────────────────────────────── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 10 }}>Payment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont }}>Terms</label>
                  <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="field" disabled={!canWrite}>
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont }}>Down Payment %</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" value={downPaymentPct ?? 0} onChange={e => setDownPaymentPct(Number(e.target.value))} className="field mono" disabled={!canWrite} min={0} max={100} step={5} style={{ flex: 1 }} />
                    <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Down Payment</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>{fmtCurrency(downPayment)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Balance</span>
                  <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>{fmtCurrency(total - downPayment)}</span>
                </div>
              </div>
            </div>

            {/* ── ACTION BUTTONS ───────────────────────── */}
            {canWrite && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => handleCreateJob('single')} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: headingFont, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Briefcase size={14} /> Create Job
                </button>
                <button onClick={handleConvertToInvoice} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontFamily: headingFont, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FileText size={14} /> To Invoice
                </button>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="card">
            <div className="section-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} /> Dates
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="field-label">SO Date</label>
                <input
                  type="date"
                  value={soDate}
                  onChange={e => setSoDate(e.target.value)}
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
                  className="field"
                  disabled={!canWrite}
                />
              </div>
              <div>
                <label className="field-label">Install Date</label>
                <input
                  type="date"
                  value={installDate}
                  onChange={e => setInstallDate(e.target.value)}
                  className="field"
                  disabled={!canWrite}
                />
              </div>
            </div>
          </div>

          {/* Team Assignments */}
          <div className="card">
            <div className="section-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} /> Team
              </div>
            </div>
            <TeamMultiSelect
              label="Sales Rep(s)"
              members={team.filter(m => ['owner', 'admin', 'sales_agent'].includes(m.role))}
              selectedIds={salesRepIds}
              onChange={setSalesRepIds}
              canWrite={canWrite}
              accentColor="#4f7fff"
            />
            <TeamMultiSelect
              label="Installer(s)"
              members={team.filter(m => m.role === 'installer')}
              selectedIds={installerIds}
              onChange={setInstallerIds}
              canWrite={canWrite}
              accentColor="#22c07a"
            />
            <TeamMultiSelect
              label="Designer(s)"
              members={team.filter(m => ['designer', 'admin', 'owner'].includes(m.role))}
              selectedIds={designerIds}
              onChange={setDesignerIds}
              canWrite={canWrite}
              accentColor="#8b5cf6"
            />
            <TeamMultiSelect
              label="Prod Mgr(s)"
              members={team.filter(m => ['production', 'admin', 'owner'].includes(m.role))}
              selectedIds={productionMgrIds}
              onChange={setProductionMgrIds}
              canWrite={canWrite}
              accentColor="#f59e0b"
            />
          </div>

          {/* Actions */}
          {canWrite && (
            <div className="card">
              <div className="section-label">Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {status !== 'in_progress' && (
                  <button onClick={() => handleStatusChange('in_progress')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <ArrowRight size={13} style={{ color: 'var(--accent)' }} /> Mark In Progress
                  </button>
                )}
                {status !== 'completed' && (
                  <button onClick={() => handleStatusChange('completed')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--green)' }} /> Mark Completed
                  </button>
                )}
                {status !== 'on_hold' && (
                  <button onClick={() => handleStatusChange('on_hold')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <AlertTriangle size={13} style={{ color: 'var(--amber)' }} /> Put On Hold
                  </button>
                )}
                <button onClick={() => handleCreateJob('single')} className="btn-primary btn-sm" style={{ background: 'var(--green)', justifyContent: 'flex-start' }}>
                  <Briefcase size={13} /> Create Job (Single)
                </button>
                <button onClick={() => handleCreateJob('per_item')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <Package size={13} style={{ color: 'var(--cyan)' }} /> Create Job Per Line Item
                </button>
                <button onClick={handleConvertToInvoice} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                  <FileText size={13} style={{ color: 'var(--purple)' }} /> To Invoice
                </button>
              </div>
            </div>
          )}

          {/* Related Documents */}
          <RelatedDocsPanel
            projectId={(so as any).project_id}
            customerId={so.customer_id}
            currentDocId={orderId}
            currentDocType="sales_order"
          />
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

// ─── Line Item Card ──────────────────────────────────────────────────────────
function LineItemCard({
  item, index, isExpanded, onToggle, canWrite, onChange, onRemove,
}: {
  item: LineItem; index: number; isExpanded: boolean; onToggle: () => void
  canWrite: boolean; onChange: (item: LineItem) => void; onRemove: () => void
}) {
  const [showDescription, setShowDescription] = useState(!!item.description)
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  function updateField<K extends keyof LineItem>(key: K, value: LineItem[K]) {
    const updated = { ...item, [key]: value }
    if (key === 'quantity' || key === 'unit_price' || key === 'unit_discount') {
      updated.total_price = (updated.quantity * updated.unit_price) - updated.unit_discount
    }
    onChange(updated)
  }

  function updateSpec(key: string, value: unknown) {
    onChange({ ...item, specs: { ...item.specs, [key]: value } })
  }

  const specs = item.specs as LineItemSpecs

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header */}
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
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
            {item.name || 'Untitled Item'}
          </span>
          <span className="badge-gray" style={{ fontSize: 10 }}>
            {item.product_type}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
            {fmtCurrency(item.total_price)}
          </span>
          {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
            <div>
              <label className="field-label">Name</label>
              <input value={item.name} onChange={e => updateField('name', e.target.value)} className="field" disabled={!canWrite} />
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input type="number" value={item.quantity} onChange={e => updateField('quantity', Number(e.target.value))} className="field mono" disabled={!canWrite} min={0} step={1} />
            </div>
            <div>
              <label className="field-label">Unit Price</label>
              <input type="number" value={item.unit_price} onChange={e => updateField('unit_price', Number(e.target.value))} className="field mono" disabled={!canWrite} min={0} step={0.01} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {!showDescription && (
              <button
                onClick={() => setShowDescription(true)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0',
                }}
              >
                + Add Description
              </button>
            )}
            {showDescription && (
              <>
                <label className="field-label">Description</label>
                <textarea value={item.description || ''} onChange={e => updateField('description', e.target.value)} className="field" rows={2} disabled={!canWrite} />
              </>
            )}
          </div>

          {/* Vehicle specs */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Car size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Info</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div>
                <label className="field-label">Year</label>
                <input value={specs.vehicleYear || ''} onChange={e => updateSpec('vehicleYear', e.target.value)} className="field" disabled={!canWrite} placeholder="2024" />
              </div>
              <div>
                <label className="field-label">Make</label>
                <input value={specs.vehicleMake || ''} onChange={e => updateSpec('vehicleMake', e.target.value)} className="field" disabled={!canWrite} placeholder="Ford" />
              </div>
              <div>
                <label className="field-label">Model</label>
                <input value={specs.vehicleModel || ''} onChange={e => updateSpec('vehicleModel', e.target.value)} className="field" disabled={!canWrite} placeholder="F-150" />
              </div>
              <div>
                <label className="field-label">Color</label>
                <input value={specs.vehicleColor || ''} onChange={e => updateSpec('vehicleColor', e.target.value)} className="field" disabled={!canWrite} placeholder="White" />
              </div>
            </div>
          </div>

          {/* Wrap specs */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Paintbrush size={13} style={{ color: 'var(--purple)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Material Specs</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div>
                <label className="field-label">Wrap Type</label>
                <input value={specs.wrapType || ''} onChange={e => updateSpec('wrapType', e.target.value)} className="field" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Vinyl Type</label>
                <input value={specs.vinylType || ''} onChange={e => updateSpec('vinylType', e.target.value)} className="field" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Laminate</label>
                <input value={specs.laminate || ''} onChange={e => updateSpec('laminate', e.target.value)} className="field" disabled={!canWrite} />
              </div>
            </div>
          </div>

          {/* Costs */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ruler size={13} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Breakdown</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div>
                <label className="field-label">Vinyl Area (sqft)</label>
                <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} className="field mono" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Material Cost</label>
                <input type="number" value={specs.materialCost || ''} onChange={e => updateSpec('materialCost', Number(e.target.value))} className="field mono" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Labor Cost</label>
                <input type="number" value={specs.laborCost || ''} onChange={e => updateSpec('laborCost', Number(e.target.value))} className="field mono" disabled={!canWrite} />
              </div>
              <div>
                <label className="field-label">Complexity (1-5)</label>
                <input type="number" value={specs.complexity || ''} onChange={e => updateSpec('complexity', Number(e.target.value))} className="field mono" disabled={!canWrite} min={1} max={5} />
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
