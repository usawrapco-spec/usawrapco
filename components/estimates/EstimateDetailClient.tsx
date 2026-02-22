'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Save, Send, CheckCircle2, FileText, Plus,
  Trash2, Car, Paintbrush, ChevronDown, ChevronRight,
  ArrowRight, Copy, AlertTriangle, MoreHorizontal, FileDown, Ban,
  Layers, Mail, Calendar, User, Users, Briefcase, DollarSign,
  ClipboardList, Activity,
  Link2, ToggleLeft, ToggleRight, Image, Wrench, CircleDot,
  TrendingUp, Calculator, Settings,
} from 'lucide-react'
import type { Profile, Estimate, LineItem, LineItemSpecs, EstimateStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import EmailComposeModal, { type EmailData } from '@/components/shared/EmailComposeModal'

// ─── Constants ──────────────────────────────────────────────────────────────────

const LABOR_RATE = 30
const DESIGN_FEE_DEFAULT = 150
const DEFAULT_TAX_RATE = 0.0825

interface VehicleCategory {
  label: string
  flatRate: number
  estimatedHours: number
  group: string
}

const VEHICLE_CATEGORIES: Record<string, VehicleCategory> = {
  small_car:    { label: 'Small Car',     flatRate: 500,  estimatedHours: 14, group: 'Cars' },
  med_car:      { label: 'Med Car',       flatRate: 550,  estimatedHours: 16, group: 'Cars' },
  full_car:     { label: 'Full Car',      flatRate: 600,  estimatedHours: 17, group: 'Cars' },
  sm_truck:     { label: 'Sm Truck',      flatRate: 525,  estimatedHours: 15, group: 'Trucks' },
  med_truck:    { label: 'Med Truck',     flatRate: 565,  estimatedHours: 16, group: 'Trucks' },
  full_truck:   { label: 'Full Truck',    flatRate: 600,  estimatedHours: 17, group: 'Trucks' },
  med_van:      { label: 'Med Van',       flatRate: 525,  estimatedHours: 15, group: 'Vans' },
  large_van:    { label: 'Large Van',     flatRate: 600,  estimatedHours: 17, group: 'Vans' },
  box_truck:    { label: 'Box Truck',     flatRate: 0,    estimatedHours: 0,  group: 'Commercial' },
  trailer:      { label: 'Trailer',       flatRate: 0,    estimatedHours: 0,  group: 'Commercial' },
  marine:       { label: 'Marine',        flatRate: 0,    estimatedHours: 0,  group: 'Specialty' },
  ppf:          { label: 'PPF',           flatRate: 0,    estimatedHours: 0,  group: 'Specialty' },
  custom:       { label: 'Custom',        flatRate: 0,    estimatedHours: 0,  group: 'Other' },
}

const STATUS_CONFIG: Record<EstimateStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'DRAFT',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.18)' },
  sent:     { label: 'SENT',     color: 'var(--accent)', bg: 'rgba(79,127,255,0.18)' },
  accepted: { label: 'ACCEPTED', color: 'var(--green)',  bg: 'rgba(34,192,122,0.18)' },
  expired:  { label: 'EXPIRED',  color: 'var(--amber)',  bg: 'rgba(245,158,11,0.18)' },
  rejected: { label: 'REJECTED', color: 'var(--red)',    bg: 'rgba(242,90,90,0.18)' },
  void:     { label: 'VOID',     color: 'var(--text3)',  bg: 'rgba(90,96,128,0.12)' },
}

type TabKey = 'items' | 'tasks' | 'assets' | 'notes' | 'related' | 'emails' | 'activity'

// ─── Demo data ──────────────────────────────────────────────────────────────────

const DEMO_ESTIMATE: Estimate = {
  id: 'demo-est-1', org_id: '', estimate_number: 1001, title: 'Ford F-150 Full Wrap + PPF',
  customer_id: null, status: 'draft', sales_rep_id: null, production_manager_id: null,
  project_manager_id: null, quote_date: '2026-02-18', due_date: '2026-03-01',
  subtotal: 5000, discount: 0, tax_rate: DEFAULT_TAX_RATE, tax_amount: 412.50, total: 5412.50,
  notes: 'Matte black full wrap with chrome delete + PPF hood and fenders', customer_note: null,
  division: 'wraps', form_data: {}, created_at: '2026-02-18T10:00:00Z',
  updated_at: '2026-02-18T10:00:00Z',
  customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
  sales_rep: { id: 's1', name: 'Tyler Reid' },
}

const DEMO_LINE_ITEMS: LineItem[] = [
  {
    id: 'li-1', parent_type: 'estimate', parent_id: 'demo-est-1', product_type: 'wrap',
    name: 'Printed Vehicle Wrap', description: 'Full printed wrap on 2024 Ford F-150',
    quantity: 1, unit_price: 3200, unit_discount: 0, total_price: 3200,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'full_truck', wrapType: 'Full Wrap',
      vinylType: '3M IJ180Cv3', laminate: '3M 8910',
      windowPerf: false, vinylArea: 280, perfArea: 0, complexity: 3,
      materialCost: 450, laborCost: 510, laborPrice: 510, machineCost: 0,
      estimatedHours: 17, designFee: 150,
    },
    sort_order: 0, created_at: '2026-02-18T10:00:00Z',
  },
  {
    id: 'li-2', parent_type: 'estimate', parent_id: 'demo-est-1', product_type: 'ppf',
    name: 'PPF -- Hood & Fenders Package', description: 'XPEL Ultimate Plus hood and fender protection',
    quantity: 1, unit_price: 1800, unit_discount: 0, total_price: 1800,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'ppf', wrapType: 'Paint Protection Film',
      vinylType: 'XPEL Ultimate Plus', laminate: 'N/A',
      windowPerf: false, vinylArea: 45, perfArea: 0, complexity: 4,
      materialCost: 600, laborCost: 120, laborPrice: 120, machineCost: 0,
      estimatedHours: 4, designFee: 0,
    },
    sort_order: 1, created_at: '2026-02-18T10:00:00Z',
  },
]

// ─── Style Constants ────────────────────────────────────────────────────────────

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 0,
  overflow: 'hidden',
}

const sectionPad: React.CSSProperties = {
  padding: '16px 20px',
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: 4,
  fontFamily: headingFont,
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}

const fieldSelectStyle: React.CSSProperties = {
  ...fieldInputStyle,
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299b5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
}

const monoStyle: React.CSSProperties = {
  fontFamily: monoFont,
  fontVariantNumeric: 'tabular-nums',
}

// ─── Helper Functions ───────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)
}

function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

const COMMISSION_RATES: Record<string, { base: number; max: number; bonuses: boolean }> = {
  inbound:  { base: 0.045, max: 0.075, bonuses: true },
  outbound: { base: 0.07,  max: 0.10,  bonuses: true },
  presold:  { base: 0.05,  max: 0.05,  bonuses: false },
  referral: { base: 0.045, max: 0.075, bonuses: true },
  walk_in:  { base: 0.045, max: 0.075, bonuses: true },
}

function calcGPM(item: LineItem, source: string = 'inbound'): { sale: number; materialCost: number; laborCost: number; designFee: number; miscCost: number; cogs: number; gp: number; gpm: number; commission: number; commissionRate: number; estimatedHours: number } {
  const specs = item.specs
  const sale = item.unit_price * item.quantity
  const estimatedHours = (specs.estimatedHours as number) || 0
  const materialCost = specs.materialCost || 0
  const laborCost = estimatedHours * LABOR_RATE
  const designFee = (specs.designFee as number) ?? DESIGN_FEE_DEFAULT
  const miscCost = specs.machineCost || 0
  const cogs = materialCost + laborCost + designFee + miscCost
  const gp = sale - cogs
  const gpm = sale > 0 ? (gp / sale) * 100 : 0
  const rates = COMMISSION_RATES[source] || COMMISSION_RATES.inbound
  // Protection: if GPM < 65%, base rate only, no bonuses
  const protected_ = gpm < 65
  let commissionRate = rates.base
  // Apply bonuses if eligible and not protected
  if (!protected_ && rates.bonuses) {
    if (gpm > 73) commissionRate += 0.02  // +2% high GPM bonus
    commissionRate = Math.min(commissionRate, rates.max)
  }
  const commission = Math.max(0, gp * commissionRate)
  return { sale, materialCost, laborCost, designFee, miscCost, cogs, gp, gpm, commission, commissionRate, estimatedHours }
}

function gpmBadge(gpm: number): { label: string; color: string; bg: string } {
  if (gpm >= 73) return { label: 'Excellent', color: 'var(--green)', bg: 'rgba(34,192,122,0.15)' }
  if (gpm >= 60) return { label: 'Good', color: 'var(--amber)', bg: 'rgba(245,158,11,0.15)' }
  return { label: 'Low', color: 'var(--red)', bg: 'rgba(242,90,90,0.15)' }
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  profile: Profile
  estimate: Estimate | null
  employees: any[]
  customers: any[]
  isNew?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EstimateDetailClient({ profile, estimate, employees, customers, isNew }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isNewEstimate = isNew || searchParams.get('new') === 'true'

  const isDemo = !estimate && !isNew
  const est = isNew ? {
    ...DEMO_ESTIMATE,
    id: `new-${Date.now()}`,
    title: 'New Estimate',
    estimate_number: 0,
    subtotal: 0, discount: 0, tax_rate: DEFAULT_TAX_RATE, tax_amount: 0, total: 0,
    notes: '', customer_note: null, customer: null, sales_rep: null,
    sales_rep_id: profile.id, org_id: profile.org_id,
    quote_date: new Date().toISOString().split('T')[0],
    line_items: [],
  } : (estimate || DEMO_ESTIMATE)
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : est.id)
  const estimateId = savedId || est.id
  const team = employees as Pick<Profile, 'id' | 'name' | 'role'>[]
  const initialLineItems = est.line_items && est.line_items.length > 0
    ? est.line_items
    : isDemo ? DEMO_LINE_ITEMS : []

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // ─── State ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(est.title)
  const [status, setStatus] = useState<EstimateStatus>(est.status)
  const [notes, setNotes] = useState(est.notes || '')
  const [customerNote, setCustomerNote] = useState(est.customer_note || '')
  const [discount, setDiscount] = useState(est.discount)
  const [taxRate, setTaxRate] = useState(est.tax_rate)
  const [quoteDate, setQuoteDate] = useState(est.quote_date || '')
  const [dueDate, setDueDate] = useState(est.due_date || '')
  const [lineItemsList, setLineItemsList] = useState<LineItem[]>(initialLineItems)
  const [activeTab, setActiveTab] = useState<TabKey>('items')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [showAllInfo, setShowAllInfo] = useState(false)
  const [proposalMode, setProposalMode] = useState(false)
  const [proposalOptions, setProposalOptions] = useState<{ label: string; itemIds: string[] }[]>(
    (est.form_data?.proposalOptions as { label: string; itemIds: string[] }[]) || []
  )
  const [salesRepId, setSalesRepId] = useState(est.sales_rep_id || '')
  const [prodMgrId, setProdMgrId] = useState(est.production_manager_id || '')
  const [projMgrId, setProjMgrId] = useState(est.project_manager_id || '')
  const [leadType, setLeadType] = useState<string>((est.form_data?.leadType as string) || 'inbound')
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailModalType, setEmailModalType] = useState<'estimate' | 'invoice' | 'proof' | 'general'>('estimate')

  // Collapsible sections per line item
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({})

  const moreMenuRef = useRef<HTMLDivElement>(null)
  const pdfMenuRef = useRef<HTMLDivElement>(null)

  // ─── Auto-add first line item for new estimates ────────────────────────────
  const didAutoAdd = useRef(false)
  useEffect(() => {
    if (isNewEstimate && !isDemo && lineItemsList.length === 0 && !didAutoAdd.current) {
      didAutoAdd.current = true
      addNewLineItem()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewEstimate, isDemo])

  // ─── Close menus on outside click ───────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setPdfMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Calculations ───────────────────────────────────────────────────────────
  const subtotal = useMemo(() => lineItemsList.reduce((s, li) => s + li.total_price, 0), [lineItemsList])
  const taxAmount = useMemo(() => (subtotal - discount) * taxRate, [subtotal, discount, taxRate])
  const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount])

  // ─── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Section toggle helper ────────────────────────────────────────────────
  function toggleSection(itemId: string, section: string) {
    setExpandedSections(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [section]: !prev[itemId]?.[section] },
    }))
  }

  function isSectionOpen(itemId: string, section: string): boolean {
    return expandedSections[itemId]?.[section] ?? false
  }

  // ─── Save handlers ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canWrite || isDemo) { showToast('Demo mode -- cannot save'); return }
    setSaving(true)
    try {
      const payload = {
        title, notes, customer_note: customerNote, discount, tax_rate: taxRate,
        subtotal, tax_amount: taxAmount, total, status,
        quote_date: quoteDate || null, due_date: dueDate || null,
        sales_rep_id: salesRepId || null,
        production_manager_id: prodMgrId || null,
        project_manager_id: projMgrId || null,
        form_data: { ...est.form_data, leadType, proposalOptions: proposalMode ? proposalOptions : undefined },
      }
      if (!savedId) {
        // First save — create estimate in DB
        const { data, error } = await supabase.from('estimates').insert({
          org_id: profile.org_id,
          division: 'wraps',
          ...payload,
        }).select().single()
        if (error) throw error
        if (data) {
          setSavedId(data.id)
          // Save any pending line items
          const pendingItems = lineItemsList.filter(li => li.id.startsWith('new-'))
          if (pendingItems.length > 0) {
            const dbItems = pendingItems.map(li => ({
              parent_type: 'estimate' as const,
              parent_id: data.id,
              product_type: li.product_type,
              name: li.name, description: li.description,
              quantity: li.quantity, unit_price: li.unit_price,
              unit_discount: li.unit_discount, total_price: li.total_price,
              specs: li.specs, sort_order: li.sort_order,
            }))
            const { data: savedItems } = await supabase.from('line_items').insert(dbItems).select()
            if (savedItems) {
              setLineItemsList(prev => prev.map((li, i) => {
                const saved = savedItems[i]
                return saved ? { ...li, id: saved.id, parent_id: data.id } : li
              }))
            }
          }
          showToast('Estimate created')
          router.replace(`/estimates/${data.id}`)
        }
      } else {
        const { error } = await supabase.from('estimates').update(payload).eq('id', savedId)
        if (error) throw error
        showToast('Estimate saved')
      }
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
        name: item.name, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price,
        unit_discount: item.unit_discount, total_price: item.total_price,
        specs: item.specs, sort_order: item.sort_order, product_type: item.product_type,
      }).eq('id', item.id)
    } catch (err) {
      console.error('Line item save error:', err)
    }
  }

  async function handleStatusChange(newStatus: EstimateStatus) {
    if (!canWrite) return
    setStatus(newStatus)
    setMoreMenuOpen(false)
    if (!isDemo) {
      try {
        await supabase.from('estimates').update({ status: newStatus }).eq('id', estimateId)
        showToast(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
      } catch { /* swallow */ }
    } else {
      showToast(`Status changed to ${STATUS_CONFIG[newStatus].label} (demo)`)
    }
  }

  async function handleConvertToSO() {
    if (!canWrite) return
    setMoreMenuOpen(false)
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
        if (lineItemsList.length > 0 && !isDemo) {
          const soItems = lineItemsList.map(li => ({
            parent_type: 'sales_order' as const,
            parent_id: data.id,
            product_type: li.product_type,
            name: li.name, description: li.description,
            quantity: li.quantity, unit_price: li.unit_price,
            unit_discount: li.unit_discount, total_price: li.total_price,
            specs: li.specs, sort_order: li.sort_order,
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

  async function handleConvertToInvoice() {
    setMoreMenuOpen(false)
    showToast('Convert to Invoice -- coming soon')
  }

  function handleDuplicate() {
    setMoreMenuOpen(false)
    showToast('Duplicate for New Customer -- coming soon')
  }

  function handleCreateCopy() {
    setMoreMenuOpen(false)
    showToast('Create Copy -- coming soon')
  }

  function handleSaveAsTemplate() {
    setMoreMenuOpen(false)
    showToast('Save as Template -- coming soon')
  }

  async function handleDelete() {
    setMoreMenuOpen(false)
    if (isDemo) { showToast('Cannot delete demo estimate'); return }
    if (!confirm('Are you sure you want to delete this estimate? This cannot be undone.')) return
    try {
      await supabase.from('line_items').delete().eq('parent_type', 'estimate').eq('parent_id', estimateId)
      await supabase.from('estimates').delete().eq('id', estimateId)
      router.push('/estimates')
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Error deleting estimate')
    }
  }

  function addNewLineItem() {
    const newItem: LineItem = {
      id: `new-${Date.now()}`, parent_type: 'estimate', parent_id: estimateId,
      product_type: 'wrap', name: '', description: null,
      quantity: 1, unit_price: 0, unit_discount: 0, total_price: 0,
      specs: { estimatedHours: 0, designFee: DESIGN_FEE_DEFAULT }, sort_order: lineItemsList.length,
      created_at: new Date().toISOString(),
    }
    setLineItemsList(prev => [...prev, newItem])
    setExpandedSections(prev => ({ ...prev, [newItem.id]: { gpm: true } }))
  }

  // ─── Proposal mode helpers ──────────────────────────────────────────────────
  function addProposalOption() {
    const letter = String.fromCharCode(65 + proposalOptions.length)
    setProposalOptions(prev => [...prev, { label: `Option ${letter}`, itemIds: [] }])
  }

  function toggleItemInOption(optionIdx: number, itemId: string) {
    setProposalOptions(prev => prev.map((opt, i) => {
      if (i !== optionIdx) return opt
      const has = opt.itemIds.includes(itemId)
      return { ...opt, itemIds: has ? opt.itemIds.filter(id => id !== itemId) : [...opt.itemIds, itemId] }
    }))
  }

  const sc = STATUS_CONFIG[status]

  // Team helper
  const findTeamMember = (id: string | null) => id ? team.find(t => t.id === id) : null

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Demo Banner ──────────────────────────────────────────────────── */}
      {isDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Showing demo data. Run the v6 migration to enable live estimates.</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HEADER ROW                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        {/* Left: Back + QT number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/estimates')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text2)',
              fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              minHeight: 44, minWidth: 44, justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 900, fontFamily: headingFont,
              color: 'var(--text1)', margin: 0, lineHeight: 1,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span style={{ color: 'var(--text3)', fontWeight: 600 }}>QT</span>{' '}
              <span style={{ ...monoStyle }}>#{est.estimate_number}</span>
            </h1>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Download PDF dropdown */}
          <div ref={pdfMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 14px', color: 'var(--text1)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <FileDown size={14} />
              Download PDF
              <ChevronDown size={12} style={{ marginLeft: 2, color: 'var(--text3)' }} />
            </button>
            {pdfMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 180, zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <MenuButton icon={<FileText size={13} />} label="Standard PDF" onClick={() => { setPdfMenuOpen(false); window.print() }} />
                <MenuButton icon={<DollarSign size={13} />} label="With Pricing" onClick={() => { setPdfMenuOpen(false); window.print() }} />
                <MenuButton icon={<Layers size={13} />} label="Proposal View" onClick={() => { setPdfMenuOpen(false); window.print() }} />
              </div>
            )}
          </div>

          {/* Email PDF */}
          <button
            onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--text1)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}
          >
            <Mail size={14} />
            Email PDF
          </button>

          {/* Send to Customer */}
          <button
            onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', border: 'none',
              borderRadius: 8, padding: '8px 14px', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}
          >
            <Send size={14} />
            Send to Customer
          </button>

          {/* ... More menu */}
          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', color: 'var(--text2)',
                cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {moreMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 230, zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {canWrite && (status === 'draft' || status === 'sent' || status === 'accepted') && (
                  <MenuButton icon={<ArrowRight size={13} style={{ color: 'var(--green)' }} />} label="Convert to Sales Order" onClick={handleConvertToSO} />
                )}
                <MenuButton icon={<FileText size={13} style={{ color: 'var(--accent)' }} />} label="Convert to Invoice" onClick={handleConvertToInvoice} />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <MenuButton icon={<Copy size={13} style={{ color: 'var(--cyan)' }} />} label="Duplicate for New Customer" onClick={handleDuplicate} />
                <MenuButton icon={<Copy size={13} style={{ color: 'var(--text2)' }} />} label="Create Copy" onClick={handleCreateCopy} />
                <MenuButton icon={<Layers size={13} style={{ color: 'var(--purple)' }} />} label="Save as Template" onClick={handleSaveAsTemplate} />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                {canWrite && status !== 'void' && (
                  <MenuButton icon={<Ban size={13} style={{ color: 'var(--amber)' }} />} label="Void" onClick={() => handleStatusChange('void')} />
                )}
                {canWrite && (
                  <MenuButton icon={<Trash2 size={13} style={{ color: 'var(--red)' }} />} label="Delete" onClick={handleDelete} danger />
                )}
              </div>
            )}
          </div>

          {/* Save button */}
          {canWrite && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--green)', border: 'none',
                borderRadius: 8, padding: '8px 16px', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1, fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* INFO BANNER                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 0 }}>
          {/* Column 1: Customer */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <User size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Customer
            </div>
            {est.customer ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                  {est.customer.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {est.customer.email}
                </div>
              </div>
            ) : (
              <button
                onClick={() => showToast('Add Customer -- coming soon')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(79,127,255,0.1)', border: '1px dashed rgba(79,127,255,0.3)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
                }}
              >
                <Plus size={12} /> Add Customer
              </button>
            )}
          </div>

          {/* Column 2: Status */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <CircleDot size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 12px',
                borderRadius: 6, fontSize: 11, fontWeight: 800, color: sc.color,
                background: sc.bg, letterSpacing: '0.05em', fontFamily: headingFont,
              }}>
                {sc.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: 'var(--text3)' }}>
                Ordered: <span style={{ color: 'var(--text2)', fontWeight: 600 }}>No</span>
              </span>
              <span style={{ color: 'var(--text3)' }}>
                Invoiced: <span style={{ color: 'var(--text2)', fontWeight: 600 }}>No</span>
              </span>
            </div>
          </div>

          {/* Column 3: Team Assignments */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <Users size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Team Assignments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55 }}>Sales Rep</span>
                <select
                  value={salesRepId}
                  onChange={e => setSalesRepId(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldSelectStyle, padding: '4px 8px', fontSize: 12, flex: 1 }}
                >
                  <option value="">-- None --</option>
                  {team.filter(t => ['owner', 'admin', 'sales_agent'].includes(t.role)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55 }}>Prod Mgr</span>
                <select
                  value={prodMgrId}
                  onChange={e => setProdMgrId(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldSelectStyle, padding: '4px 8px', fontSize: 12, flex: 1 }}
                >
                  <option value="">-- None --</option>
                  {team.filter(t => ['owner', 'admin', 'production'].includes(t.role)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55 }}>Proj Mgr</span>
                <select
                  value={projMgrId}
                  onChange={e => setProjMgrId(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldSelectStyle, padding: '4px 8px', fontSize: 12, flex: 1 }}
                >
                  <option value="">-- None --</option>
                  {team.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Column 4: Dates */}
          <div style={sectionPad}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Dates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>Quote Date</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={e => setQuoteDate(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldInputStyle, padding: '4px 8px', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldInputStyle, padding: '4px 8px', fontSize: 12 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Show All Information toggle */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '8px 20px',
          display: 'flex', alignItems: 'center',
        }}>
          <button
            onClick={() => setShowAllInfo(!showAllInfo)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', color: 'var(--accent)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
            }}
          >
            <ChevronDown size={12} style={{
              transform: showAllInfo ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }} />
            {showAllInfo ? 'Hide All Information' : 'Show All Information'}
          </button>
        </div>

        {/* Extended info panel */}
        <div style={{
          maxHeight: showAllInfo ? 300 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 20px',
          }}>
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={!canWrite}
                style={fieldInputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Division</label>
              <input
                value={est.division === 'wraps' ? 'Wraps' : 'Decking'}
                disabled
                style={{ ...fieldInputStyle, opacity: 0.5 }}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Lead Source</label>
              <select
                value={leadType}
                onChange={e => setLeadType(e.target.value)}
                disabled={!canWrite}
                style={fieldSelectStyle}
              >
                <option value="inbound">Inbound (4.5-7.5%)</option>
                <option value="outbound">Outbound (7-10%)</option>
                <option value="presold">Pre-Sold (5% flat)</option>
                <option value="referral">Referral (4.5-7.5%)</option>
                <option value="walk_in">Walk-In (4.5-7.5%)</option>
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>Created</label>
              <input
                value={new Date(est.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                disabled
                style={{ ...fieldInputStyle, opacity: 0.5 }}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Proposal Mode</label>
              <button
                onClick={() => setProposalMode(!proposalMode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: 'none', color: proposalMode ? 'var(--green)' : 'var(--text3)',
                  fontSize: 13, cursor: 'pointer', padding: '4px 0',
                }}
              >
                {proposalMode
                  ? <ToggleRight size={20} style={{ color: 'var(--green)' }} />
                  : <ToggleLeft size={20} style={{ color: 'var(--text3)' }} />
                }
                {proposalMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TABS                                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '2px solid var(--border)',
        marginBottom: 16,
      }}>
        {([
          { key: 'items' as TabKey, label: 'Items', count: lineItemsList.length },
          { key: 'tasks' as TabKey, label: 'Tasks' },
          { key: 'assets' as TabKey, label: 'Assets' },
          { key: 'notes' as TabKey, label: 'Notes' },
          { key: 'related' as TabKey, label: 'Related' },
          { key: 'emails' as TabKey, label: 'Emails' },
          { key: 'activity' as TabKey, label: 'Activity' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              background: 'transparent',
              color: activeTab === tab.key ? 'var(--text1)' : 'var(--text3)',
              fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
              fontFamily: headingFont, textTransform: 'uppercase',
              letterSpacing: '0.05em', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                ...monoStyle, fontSize: 11, fontWeight: 700,
                background: activeTab === tab.key ? 'rgba(79,127,255,0.2)' : 'rgba(90,96,128,0.15)',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text3)',
                padding: '1px 7px', borderRadius: 10,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {activeTab === 'items' && (
        <div>
          {/* Items header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text1)',
              fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Items
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => showToast('Create Job coming soon')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '7px 14px', color: 'var(--text1)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: headingFont, letterSpacing: '0.03em',
                }}
              >
                <Briefcase size={13} />
                Create Job
                <ChevronDown size={11} style={{ color: 'var(--text3)' }} />
              </button>
              {canWrite && (
                <button
                  onClick={addNewLineItem}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)',
                    borderRadius: 8, padding: '7px 14px', color: 'var(--accent)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: headingFont, letterSpacing: '0.03em',
                  }}
                >
                  <Plus size={13} />
                  Add New Line Item
                </button>
              )}
            </div>
          </div>

          {/* Proposal mode options */}
          {proposalMode && (
            <div style={{
              ...cardStyle, marginBottom: 16, padding: 16,
              background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--purple)',
                  fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <Layers size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                  Proposal Options
                </div>
                <button
                  onClick={addProposalOption}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'transparent', border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 6, padding: '4px 10px', color: 'var(--purple)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={11} /> Add Option
                </button>
              </div>
              {proposalOptions.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 12 }}>
                  No options yet. Add options and assign line items to each.
                </div>
              )}
              {proposalOptions.map((opt, oi) => (
                <div key={oi} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 12, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      ...monoStyle, fontSize: 13, fontWeight: 800, color: 'var(--purple)',
                      background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      value={opt.label}
                      onChange={e => setProposalOptions(prev => prev.map((p, i) => i === oi ? { ...p, label: e.target.value } : p))}
                      style={{ ...fieldInputStyle, fontSize: 13, fontWeight: 600, flex: 1 }}
                      disabled={!canWrite}
                    />
                    <button
                      onClick={() => setProposalOptions(prev => prev.filter((_, i) => i !== oi))}
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--red)', cursor: 'pointer', padding: 4,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {lineItemsList.map(li => {
                      const included = opt.itemIds.includes(li.id)
                      return (
                        <button
                          key={li.id}
                          onClick={() => toggleItemInOption(oi, li.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6,
                            border: included ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: included ? 'rgba(79,127,255,0.12)' : 'transparent',
                            color: included ? 'var(--accent)' : 'var(--text3)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {included ? <CheckCircle2 size={11} /> : <CircleDot size={11} />}
                          {li.name || 'Untitled'}
                        </button>
                      )
                    })}
                  </div>
                  {opt.itemIds.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', ...monoStyle }}>
                      Option total: {fmtCurrency(lineItemsList.filter(li => opt.itemIds.includes(li.id)).reduce((s, li) => s + li.total_price, 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Line items */}
          {lineItemsList.length === 0 ? (
            <div style={{
              ...cardStyle, padding: 48, textAlign: 'center',
            }}>
              <ClipboardList size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 4 }}>No line items yet</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Click &quot;Add New Line Item&quot; to start building this estimate.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lineItemsList.map((li, idx) => (
                <LineItemCard
                  key={li.id}
                  item={li}
                  index={idx}
                  canWrite={canWrite}
                  onChange={(updated) => {
                    setLineItemsList(prev => prev.map(x => x.id === li.id ? updated : x))
                  }}
                  onBlurSave={(updated) => handleLineItemSave(updated)}
                  onRemove={() => {
                    setLineItemsList(prev => prev.filter(x => x.id !== li.id))
                  }}
                  expandedSections={expandedSections[li.id] || {}}
                  onToggleSection={(section) => toggleSection(li.id, section)}
                  leadType={leadType}
                  team={team}
                />
              ))}
            </div>
          )}

          {/* ── Bottom Summary ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{
            gap: 20,
            marginTop: 24, alignItems: 'flex-start',
          }}>
            {/* Left: Customer Note */}
            <div>
              <label style={fieldLabelStyle}>Customer Note</label>
              <textarea
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                disabled={!canWrite}
                placeholder="Note visible to customer on the estimate..."
                rows={4}
                style={{
                  ...fieldInputStyle,
                  resize: 'vertical',
                  minHeight: 80,
                }}
              />
            </div>

            {/* Right: Pricing Summary */}
            <div style={{
              ...cardStyle,
            }}>
              <div style={{ ...sectionPad, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SummaryRow label="Subtotal" value={fmtCurrency(subtotal)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Discount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>$</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      disabled={!canWrite}
                      min={0} step={0.01}
                      style={{
                        ...fieldInputStyle, ...monoStyle,
                        width: 90, textAlign: 'right' as const, padding: '4px 8px', fontSize: 13,
                      }}
                    />
                  </div>
                </div>
                <SummaryRow
                  label={`Tax (${(taxRate * 100).toFixed(2)}%)`}
                  value={fmtCurrency(taxAmount)}
                />
                <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--text1)',
                      fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Total
                    </span>
                    <span style={{
                      ...monoStyle, fontSize: 22, fontWeight: 800, color: 'var(--green)',
                    }}>
                      {fmtCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <PlaceholderTab icon={<ClipboardList size={28} />} label="Tasks" description="Task management for this estimate will appear here." />
      )}
      {activeTab === 'assets' && (
        <PlaceholderTab icon={<Image size={28} />} label="Assets" description="File uploads, photos, and assets for this estimate." />
      )}
      {activeTab === 'notes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ ...sectionPad }}>
              <label style={fieldLabelStyle}>Internal Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={!canWrite}
                placeholder="Internal notes (not visible to customer)..."
                rows={8}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 120 }}
              />
            </div>
          </div>
          <div style={{ ...cardStyle }}>
            <div style={{ ...sectionPad }}>
              <label style={fieldLabelStyle}>Customer Note</label>
              <textarea
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                disabled={!canWrite}
                placeholder="Note visible to customer..."
                rows={8}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 120 }}
              />
            </div>
          </div>
        </div>
      )}
      {activeTab === 'related' && (
        <PlaceholderTab icon={<Link2 size={28} />} label="Related" description="Linked sales orders, invoices, and projects." />
      )}
      {activeTab === 'emails' && (
        <PlaceholderTab icon={<Mail size={28} />} label="Emails" description="Email history for this estimate." />
      )}
      {activeTab === 'activity' && (
        <PlaceholderTab icon={<Activity size={28} />} label="Activity" description="Activity log and change history." />
      )}

      {/* ── Email Compose Modal ──────────────────────────────────────── */}
      <EmailComposeModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={async (data: EmailData) => {
          try {
            if (!isDemo) {
              const res = await fetch('/api/estimates/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  estimate_id: estimateId,
                  to: data.to,
                  subject: data.subject,
                  message: data.message,
                  sendVia: data.sendVia,
                }),
              })
              const result = await res.json()
              showToast(result.message || `Estimate sent to ${data.to}`)
            } else {
              showToast(`Demo: Estimate marked as sent`)
            }
            handleStatusChange('sent')
          } catch {
            showToast('Error sending estimate')
          }
          setEmailModalOpen(false)
        }}
        recipientEmail={est.customer?.email || ''}
        recipientName={est.customer?.name || ''}
        senderName={profile.name}
        senderEmail={profile.email}
        estimateNumber={String(est.estimate_number)}
        estimateTotal={total}
        vehicleDescription={est.title}
        type={emailModalType}
      />

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 20px',
          color: 'var(--text1)', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideInUp 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

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
        fontSize: 13, fontWeight: 500, textAlign: 'left' as const,
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

// ─── Summary Row ────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
      <span style={{
        fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
        fontSize: 14, color: 'var(--text1)', fontWeight: 600,
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Placeholder Tab ────────────────────────────────────────────────────────

function PlaceholderTab({ icon, label, description }: { icon: React.ReactNode; label: string; description: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 48, textAlign: 'center',
    }}>
      <div style={{ color: 'var(--text3)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: 'var(--text2)',
        fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>{description}</div>
    </div>
  )
}

// ─── Collapsible Section Header ─────────────────────────────────────────────

function CollapsibleHeader({
  icon, label, isOpen, onToggle, color,
}: {
  icon: React.ReactNode; label: string; isOpen: boolean; onToggle: () => void; color?: string
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        background: 'transparent', border: 'none', padding: '8px 0',
        cursor: 'pointer', color: color || 'var(--text2)',
      }}
    >
      <ChevronRight size={13} style={{
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
        color: 'var(--text3)',
      }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
        letterSpacing: '0.06em', fontFamily: headingFont,
      }}>
        {label}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ITEM CARD
// ═══════════════════════════════════════════════════════════════════════════════

function LineItemCard({
  item, index, canWrite, onChange, onBlurSave, onRemove,
  expandedSections, onToggleSection, leadType, team,
}: {
  item: LineItem; index: number; canWrite: boolean
  onChange: (item: LineItem) => void; onBlurSave: (item: LineItem) => void; onRemove: () => void
  expandedSections: Record<string, boolean>; onToggleSection: (section: string) => void
  leadType: string; team: Pick<Profile, 'id' | 'name' | 'role'>[]
}) {
  const latestRef = useRef(item)
  latestRef.current = item

  const [showDescription, setShowDescription] = useState(!!item.description)
  const [isCardExpanded, setIsCardExpanded] = useState(true)

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

  function handleCategoryChange(catKey: string) {
    const cat = VEHICLE_CATEGORIES[catKey]
    if (!cat) return
    const current = latestRef.current
    const newSpecs = { ...current.specs, vehicleType: catKey, estimatedHours: cat.estimatedHours }
    const newPrice = cat.flatRate > 0 ? cat.flatRate : current.unit_price
    const updated: LineItem = {
      ...current,
      unit_price: newPrice,
      total_price: (current.quantity * newPrice) - current.unit_discount,
      specs: newSpecs,
    }
    onChange(updated)
  }

  const specs = item.specs as LineItemSpecs
  const gpm = calcGPM(item, leadType)
  const badge = gpmBadge(gpm.gpm)
  const vehicleDesc = [specs.vehicleYear, specs.vehicleMake, specs.vehicleModel].filter(Boolean).join(' ')

  const productTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
    wrap:    { label: 'WRAP',    color: 'var(--accent)', bg: 'rgba(79,127,255,0.12)' },
    ppf:     { label: 'PPF',     color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
    decking: { label: 'DECKING', color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
    design:  { label: 'DESIGN',  color: 'var(--purple)', bg: 'rgba(139,92,246,0.12)' },
  }
  const ptc = productTypeConfig[item.product_type] || { label: item.product_type.toUpperCase(), color: 'var(--text3)', bg: 'rgba(90,96,128,0.12)' }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* ── Header Row ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setIsCardExpanded(!isCardExpanded)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: 2, display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronRight size={14} style={{
              transform: isCardExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }} />
          </button>
          <span style={{
            ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
            fontSize: 12, color: 'var(--text3)', fontWeight: 700, minWidth: 20,
          }}>
            {index + 1}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
            borderRadius: 4, fontSize: 10, fontWeight: 800,
            letterSpacing: '0.05em', fontFamily: headingFont,
            color: ptc.color, background: ptc.bg,
          }}>
            {ptc.label}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {item.name || 'Untitled Item'}
          </span>
          {vehicleDesc && (
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              -- {vehicleDesc}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
              fontSize: 16, fontWeight: 800, color: 'var(--text1)',
            }}>
              {fmtCurrency(item.total_price)}
            </span>
          </div>
          {canWrite && (
            <button
              onClick={onRemove}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 4, display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded Content ───────────────────────────────────────────── */}
      <div style={{
        maxHeight: isCardExpanded ? 2000 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 16px 16px' }}>

          {/* ── Core Fields Row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_80px_120px_120px]" style={{ gap: 10, marginTop: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Product Name</label>
              <input
                value={item.name}
                onChange={e => updateField('name', e.target.value)}
                onBlur={handleBlur}
                style={fieldInputStyle}
                disabled={!canWrite}
                placeholder="e.g. Full Body Wrap"
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Category</label>
              <select
                value={(specs.vehicleType as string) || ''}
                onChange={e => handleCategoryChange(e.target.value)}
                onBlur={handleBlur}
                style={fieldSelectStyle}
                disabled={!canWrite}
              >
                <option value="">Select Category</option>
                {Object.entries(
                  Object.entries(VEHICLE_CATEGORIES).reduce((groups, [key, cat]) => {
                    if (!groups[cat.group]) groups[cat.group] = []
                    groups[cat.group].push({ key, ...cat })
                    return groups
                  }, {} as Record<string, (VehicleCategory & { key: string })[]>)
                ).map(([group, cats]) => (
                  <optgroup key={group} label={group}>
                    {cats.map(cat => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}{cat.flatRate > 0 ? ` ($${cat.flatRate}/${cat.estimatedHours}h)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateField('quantity', Number(e.target.value))}
                onBlur={handleBlur}
                style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, textAlign: 'center' as const }}
                disabled={!canWrite}
                min={0} step={1}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Unit Price</label>
              <input
                type="number"
                value={item.unit_price}
                onChange={e => updateField('unit_price', Number(e.target.value))}
                onBlur={handleBlur}
                style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, textAlign: 'right' as const }}
                disabled={!canWrite}
                min={0} step={0.01}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Total</label>
              <div style={{
                ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
                padding: '7px 10px', fontSize: 14, fontWeight: 700,
                color: 'var(--text1)', textAlign: 'right' as const,
                background: 'rgba(34,192,122,0.06)', borderRadius: 6,
                border: '1px solid rgba(34,192,122,0.15)',
              }}>
                {fmtCurrency(item.total_price)}
              </div>
            </div>
          </div>

          {/* ── Quick Specs Row ─────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 10, padding: '6px 0',
            fontSize: 12, color: 'var(--text2)',
          }}>
            {specs.wrapType && (
              <span>Wrap Type: <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{specs.wrapType}</span></span>
            )}
            {specs.vinylType && (
              <span>Material: <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{specs.vinylType}</span></span>
            )}
            {specs.vinylArea && (
              <span>Sqft: <span style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, color: 'var(--text1)', fontWeight: 600 }}>{specs.vinylArea}</span></span>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PRODUCT-TYPE CALCULATORS (conditional on category)           */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* ── Commercial Vehicle Quick-Select Grid ───────────────────── */}
          {specs.vehicleType && ['small_car', 'med_car', 'full_car', 'sm_truck', 'med_truck', 'full_truck', 'med_van', 'large_van'].includes(specs.vehicleType as string) && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Car size={12} style={{ color: 'var(--accent)' }} /> Vehicle Size -- Quick Select
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9" style={{ gap: 6 }}>
                {Object.entries(VEHICLE_CATEGORIES).filter(([, cat]) => ['Cars', 'Trucks', 'Vans'].includes(cat.group)).map(([key, cat]) => {
                  const isSelected = (specs.vehicleType as string) === key
                  return (
                    <button
                      key={key}
                      onClick={() => { if (canWrite) handleCategoryChange(key) }}
                      style={{
                        padding: '8px 4px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
                        textAlign: 'center' as const, minHeight: 44,
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text2)', lineHeight: 1.2 }}>
                        {cat.label}
                      </div>
                      <div style={{ fontFamily: monoFont, fontSize: 12, fontWeight: 800, color: isSelected ? 'var(--accent)' : 'var(--text1)' }}>
                        ${cat.flatRate}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                        {cat.estimatedHours}h
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Custom Product Calculator ──────────────────────────────── */}
          {specs.vehicleType === 'custom' && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Wrench size={12} style={{ color: 'var(--purple)' }} /> Custom Product
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (ft)</label>
                  <input type="number" value={(specs.customWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value)
                    const h = (specs.customHeight as number) || 0
                    updateSpec('customWidth', w)
                    if (w > 0 && h > 0) setTimeout(() => updateSpec('vinylArea', Math.round(w * h)), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.customHeight as number) || ''} onChange={e => {
                    const h = Number(e.target.value)
                    const w = (specs.customWidth as number) || 0
                    updateSpec('customHeight', h)
                    if (w > 0 && h > 0) setTimeout(() => updateSpec('vinylArea', Math.round(w * h)), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Total Sqft</label>
                  <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Est. Hours</label>
                  <input type="number" value={(specs.estimatedHours as number) || ''} onChange={e => updateSpec('estimatedHours', Number(e.target.value))} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Description</label>
                <input value={(specs.customDescription as string) || ''} onChange={e => updateSpec('customDescription', e.target.value)} placeholder="Describe the custom product..." style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
              </div>
            </div>
          )}

          {/* ── Box Truck Calculator ──────────────────────────────────── */}
          {specs.vehicleType === 'box_truck' && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Car size={12} style={{ color: 'var(--accent)' }} /> Box Truck Dimensions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Length (ft)</label>
                  <input type="number" value={(specs.boxLength as number) || ''} onChange={e => {
                    const l = Number(e.target.value)
                    const w = (specs.boxWidth as number) || 8
                    const h = (specs.boxHeight as number) || 7
                    const cab = (specs.cabWrap as boolean) ? 60 : 0
                    const sides = 2 * l * h
                    const back = w * h
                    const sqft = sides + back + cab
                    updateSpec('boxLength', l)
                    setTimeout(() => {
                      updateSpec('vinylArea', Math.round(sqft))
                      updateSpec('estimatedHours', Math.round(sqft / 30))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (ft)</label>
                  <input type="number" value={(specs.boxWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value)
                    const l = (specs.boxLength as number) || 0
                    const h = (specs.boxHeight as number) || 7
                    const cab = (specs.cabWrap as boolean) ? 60 : 0
                    const sides = 2 * l * h
                    const back = w * h
                    const sqft = sides + back + cab
                    updateSpec('boxWidth', w)
                    setTimeout(() => { updateSpec('vinylArea', Math.round(sqft)) }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.boxHeight as number) || 7} onChange={e => {
                    const h = Number(e.target.value)
                    const l = (specs.boxLength as number) || 0
                    const w = (specs.boxWidth as number) || 8
                    const cab = (specs.cabWrap as boolean) ? 60 : 0
                    const sides = 2 * l * h
                    const back = w * h
                    const sqft = sides + back + cab
                    updateSpec('boxHeight', h)
                    setTimeout(() => {
                      updateSpec('vinylArea', Math.round(sqft))
                      updateSpec('estimatedHours', Math.round(sqft / 30))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Cab Wrap</label>
                  <button
                    onClick={() => {
                      if (!canWrite) return
                      const newCab = !(specs.cabWrap as boolean)
                      const cab = newCab ? 60 : 0
                      const l = (specs.boxLength as number) || 0
                      const w = (specs.boxWidth as number) || 8
                      const h = (specs.boxHeight as number) || 7
                      const sqft = 2 * l * h + w * h + cab
                      updateSpec('cabWrap', newCab)
                      setTimeout(() => { updateSpec('vinylArea', Math.round(sqft)) }, 0)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.cabWrap as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.cabWrap as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.cabWrap as boolean) ? 'Yes (+60 sqft)' : 'No'}
                  </button>
                </div>
              </div>
              {(specs.boxLength as number) > 0 && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
                  background: 'rgba(79,127,255,0.06)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>Sides: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.round(2 * ((specs.boxLength as number) || 0) * ((specs.boxHeight as number) || 7))} sqft</span></span>
                  <span style={{ color: 'var(--text2)' }}>Back: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.round(((specs.boxWidth as number) || 8) * ((specs.boxHeight as number) || 7))} sqft</span></span>
                  {(specs.cabWrap as boolean) && <span style={{ color: 'var(--text2)' }}>Cab: <span style={{ fontFamily: monoFont, color: 'var(--green)', fontWeight: 700 }}>60 sqft</span></span>}
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont }}>{specs.vinylArea || 0} sqft</span></span>
                </div>
              )}
            </div>
          )}

          {/* ── Trailer Calculator ────────────────────────────────────── */}
          {specs.vehicleType === 'trailer' && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Car size={12} style={{ color: 'var(--amber)' }} /> Trailer Dimensions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Coverage</label>
                  <select
                    value={(specs.trailerCoverage as string) || 'full'}
                    onChange={e => {
                      const cov = e.target.value
                      const mult = cov === 'full' ? 1 : cov === 'three_quarter' ? 0.75 : 0.5
                      const l = (specs.trailerLength as number) || 0
                      const h = (specs.trailerHeight as number) || 7.5
                      const sqft = Math.round(l * h * 2 * mult)
                      updateSpec('trailerCoverage', cov)
                      setTimeout(() => {
                        updateSpec('vinylArea', sqft)
                        updateSpec('estimatedHours', Math.round(sqft / 25))
                      }, 0)
                    }}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="full">Full (100%)</option>
                    <option value="three_quarter">3/4 (75%)</option>
                    <option value="half">1/2 (50%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Length (ft)</label>
                  <input type="number" value={(specs.trailerLength as number) || ''} onChange={e => {
                    const l = Number(e.target.value)
                    const h = (specs.trailerHeight as number) || 7.5
                    const cov = (specs.trailerCoverage as string) || 'full'
                    const mult = cov === 'full' ? 1 : cov === 'three_quarter' ? 0.75 : 0.5
                    const sqft = Math.round(l * h * 2 * mult)
                    updateSpec('trailerLength', l)
                    setTimeout(() => {
                      updateSpec('vinylArea', sqft)
                      updateSpec('estimatedHours', Math.round(sqft / 25))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.trailerHeight as number) || 7.5} onChange={e => {
                    const h = Number(e.target.value)
                    const l = (specs.trailerLength as number) || 0
                    const cov = (specs.trailerCoverage as string) || 'full'
                    const mult = cov === 'full' ? 1 : cov === 'three_quarter' ? 0.75 : 0.5
                    const sqft = Math.round(l * h * 2 * mult)
                    updateSpec('trailerHeight', h)
                    setTimeout(() => {
                      updateSpec('vinylArea', sqft)
                      updateSpec('estimatedHours', Math.round(sqft / 25))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>V-Nose</label>
                  <button
                    onClick={() => { if (canWrite) updateSpec('vNose', !(specs.vNose as boolean)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.vNose as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.vNose as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.vNose as boolean) ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>
              {(specs.vNose as boolean) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>V-Nose Height (ft)</label>
                    <input type="number" value={(specs.vNoseHeight as number) || ''} onChange={e => updateSpec('vNoseHeight', Number(e.target.value))} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>V-Nose Length (ft)</label>
                    <input type="number" value={(specs.vNoseLength as number) || ''} onChange={e => updateSpec('vNoseLength', Number(e.target.value))} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                  </div>
                </div>
              )}
              {(specs.trailerLength as number) > 0 && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
                  background: 'rgba(245,158,11,0.06)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>Per Side: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.round(((specs.trailerLength as number) || 0) * ((specs.trailerHeight as number) || 7.5))} sqft</span></span>
                  <span style={{ color: 'var(--text2)' }}>Coverage: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{((specs.trailerCoverage as string) || 'full').replace('_', ' ')}</span></span>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont }}>{specs.vinylArea || 0} sqft</span></span>
                </div>
              )}
            </div>
          )}

          {/* ── Marine/Decking Calculator ─────────────────────────────── */}
          {specs.vehicleType === 'marine' && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Layers size={12} style={{ color: 'var(--cyan)' }} /> Marine / Decking
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Section</label>
                  <select
                    value={(specs.marineSection as string) || 'main_deck'}
                    onChange={e => updateSpec('marineSection', e.target.value)}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="main_deck">Main Deck</option>
                    <option value="swim_platform">Swim Platform</option>
                    <option value="helm_pad">Helm Pad</option>
                    <option value="bow_pad">Bow Pad</option>
                    <option value="gunnels">Gunnels</option>
                    <option value="full_boat">Full Boat</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Linear Feet</label>
                  <input type="number" value={(specs.linearFeet as number) || ''} onChange={e => {
                    const lf = Number(e.target.value)
                    const passes = (specs.marinePasses as number) || 1
                    const width = (specs.marineWidth as number) || 54
                    const sqft = Math.round(lf * (width / 12) * passes)
                    updateSpec('linearFeet', lf)
                    setTimeout(() => { updateSpec('vinylArea', sqft) }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Passes</label>
                  <input type="number" value={(specs.marinePasses as number) || 1} onChange={e => {
                    const passes = Number(e.target.value)
                    const lf = (specs.linearFeet as number) || 0
                    const width = (specs.marineWidth as number) || 54
                    const sqft = Math.round(lf * (width / 12) * passes)
                    updateSpec('marinePasses', passes)
                    setTimeout(() => { updateSpec('vinylArea', sqft) }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={1} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material Width (in)</label>
                  <input type="number" value={(specs.marineWidth as number) || 54} onChange={e => updateSpec('marineWidth', Number(e.target.value))} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vertical Gunnels</label>
                  <button
                    onClick={() => { if (canWrite) updateSpec('verticalGunnels', !(specs.verticalGunnels as boolean)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.verticalGunnels as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.verticalGunnels as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.verticalGunnels as boolean) ? 'Yes' : 'No'}
                  </button>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Installer</label>
                  <select
                    value={(specs.marineInstaller as string) || ''}
                    onChange={e => updateSpec('marineInstaller', e.target.value)}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="">Select Installer</option>
                    {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              {(specs.linearFeet as number) > 0 && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
                  background: 'rgba(34,211,238,0.06)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>Linear Ft: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{specs.linearFeet}</span></span>
                  <span style={{ color: 'var(--text2)' }}>Passes: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{(specs.marinePasses as number) || 1}</span></span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont }}>{specs.vinylArea || 0} sqft</span></span>
                </div>
              )}
            </div>
          )}

          {/* ── PPF Calculator ────────────────────────────────────────── */}
          {specs.vehicleType === 'ppf' && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <CircleDot size={12} style={{ color: 'var(--cyan)' }} /> PPF Packages
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {([
                  { key: 'standard_front', name: 'Standard Front', price: 1200, pay: 400, material: 250, hours: 4 },
                  { key: 'full_front', name: 'Full Front', price: 2500, pay: 750, material: 500, hours: 6 },
                  { key: 'track_pack', name: 'Track Pack', price: 4500, pay: 1200, material: 900, hours: 10 },
                  { key: 'full_body', name: 'Full Body', price: 7000, pay: 2000, material: 1600, hours: 16 },
                  { key: 'hood_only', name: 'Hood Only', price: 800, pay: 250, material: 150, hours: 2 },
                  { key: 'rocker_panels', name: 'Rocker Panels', price: 600, pay: 200, material: 100, hours: 2 },
                  { key: 'headlights', name: 'Headlights', price: 350, pay: 100, material: 50, hours: 1 },
                  { key: 'door_cups', name: 'Door Cup Guards', price: 200, pay: 60, material: 30, hours: 0.5 },
                ] as const).map(pkg => {
                  const isSelected = (specs.ppfPackage as string) === pkg.key
                  return (
                    <button
                      key={pkg.key}
                      onClick={() => {
                        if (!canWrite) return
                        updateSpec('ppfPackage', pkg.key)
                        const updated = {
                          ...latestRef.current,
                          name: item.name || pkg.name,
                          unit_price: pkg.price,
                          total_price: (latestRef.current.quantity * pkg.price) - latestRef.current.unit_discount,
                          specs: {
                            ...latestRef.current.specs,
                            ppfPackage: pkg.key,
                            materialCost: pkg.material,
                            laborCost: pkg.pay,
                            laborPrice: pkg.pay,
                            estimatedHours: pkg.hours,
                          },
                        }
                        onChange(updated)
                      }}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default',
                        border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(34,211,238,0.08)' : 'var(--surface)',
                        textAlign: 'left' as const,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--cyan)' : 'var(--text1)', marginBottom: 4 }}>
                        {pkg.name}
                      </div>
                      <div style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: isSelected ? 'var(--cyan)' : 'var(--text1)' }}>
                        {fmtCurrency(pkg.price)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                        {pkg.hours}h / ${pkg.pay} pay
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Add Description Link ───────────────────────────────────── */}
          {!showDescription && (
            <button
              onClick={() => setShowDescription(true)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginTop: 4,
              }}
            >
              + Add Description For Customer
            </button>
          )}
          {showDescription && (
            <div style={{ marginTop: 8 }}>
              <label style={fieldLabelStyle}>Customer Description</label>
              <textarea
                value={item.description || ''}
                onChange={e => updateField('description', e.target.value)}
                onBlur={handleBlur}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 50 }}
                disabled={!canWrite}
                placeholder="Description visible on the estimate..."
                rows={2}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GPM PRICING ENGINE (Collapsible)                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div style={{ marginTop: 14 }}>
            <CollapsibleHeader
              icon={<Calculator size={13} style={{ color: 'var(--green)' }} />}
              label="GPM Pricing Engine"
              isOpen={expandedSections.gpm ?? false}
              onToggle={() => onToggleSection('gpm')}
              color="var(--text2)"
            />
            <div style={{
              maxHeight: expandedSections.gpm ? 400 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.2s ease',
            }}>
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16, marginTop: 4,
              }}>
                {/* Row 1: Sale, Material, Install */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 12, fontSize: 13 }}>
                  <GPMStat label="Sale" value={fmtCurrency(gpm.sale)} color="var(--text1)" />
                  <GPMStat label="Material" value={fmtCurrency(gpm.materialCost)} color="var(--red)" />
                  <GPMStat
                    label="Install"
                    value={`${fmtCurrency(gpm.laborCost)} (${gpm.estimatedHours}h x $${LABOR_RATE}/hr)`}
                    color="var(--amber)"
                  />
                </div>
                {/* Row 2: Design, Misc, COGS */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 12, fontSize: 13 }}>
                  <GPMStat label="Design" value={fmtCurrency(gpm.designFee)} color="var(--purple)" />
                  <GPMStat label="Misc" value={fmtCurrency(gpm.miscCost)} color="var(--text3)" />
                  <GPMStat label="COGS" value={fmtCurrency(gpm.cogs)} color="var(--red)" bold />
                </div>
                {/* Row 3: GP, GPM badge, Commission */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
                  paddingTop: 12, borderTop: '1px solid var(--border)',
                }}>
                  <GPMStat label="GP" value={fmtCurrency(gpm.gp)} color="var(--green)" bold />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: headingFont }}>GPM</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{
                        fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
                        fontSize: 18, fontWeight: 800, color: badge.color,
                      }}>
                        {fmtPercent(gpm.gpm)}
                      </span>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                        fontFamily: headingFont, textTransform: 'uppercase' as const,
                        color: badge.color, background: badge.bg,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <GPMStat
                    label="Commission"
                    value={`${fmtCurrency(gpm.commission)} (${(gpm.commissionRate * 100).toFixed(1)}% rate)`}
                    color="var(--cyan)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PRICING BREAKDOWN (Collapsible)                               */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div style={{ marginTop: 6 }}>
            <CollapsibleHeader
              icon={<DollarSign size={13} style={{ color: 'var(--amber)' }} />}
              label="Pricing Breakdown"
              isOpen={expandedSections.pricing ?? false}
              onToggle={() => onToggleSection('pricing')}
              color="var(--text2)"
            />
            <div style={{
              maxHeight: expandedSections.pricing ? 500 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.2s ease',
            }}>
              <div style={{ padding: '8px 0' }}>
                {/* Material Totals */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paintbrush size={11} style={{ color: 'var(--purple)' }} /> Material Totals
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material Cost</label>
                      <input type="number" value={specs.materialCost || ''} onChange={e => updateSpec('materialCost', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vinyl Type</label>
                      <input value={specs.vinylType || ''} onChange={e => updateSpec('vinylType', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vinyl Area (sqft)</label>
                      <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Laminate</label>
                      <input value={specs.laminate || ''} onChange={e => updateSpec('laminate', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
                    </div>
                  </div>
                </div>

                {/* Labor Totals */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wrench size={11} style={{ color: 'var(--amber)' }} /> Labor Totals
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Est. Hours</label>
                      <input type="number" value={(specs.estimatedHours as number) || ''} onChange={e => updateSpec('estimatedHours', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Labor Rate ($/hr)</label>
                      <div style={{
                        ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
                        padding: '7px 10px', fontSize: 12, color: 'var(--text2)',
                        background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)',
                      }}>
                        ${LABOR_RATE}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Labor Cost</label>
                      <div style={{
                        ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
                        padding: '7px 10px', fontSize: 12, color: 'var(--amber)',
                        background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)',
                      }}>
                        {fmtCurrency(gpm.laborCost)}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Design Fee</label>
                      <input type="number" value={(specs.designFee as number) ?? DESIGN_FEE_DEFAULT} onChange={e => updateSpec('designFee', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                  </div>
                </div>

                {/* Machine Totals */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Settings size={11} style={{ color: 'var(--cyan)' }} /> Machine Totals
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Machine Cost</label>
                      <input type="number" value={specs.machineCost || ''} onChange={e => updateSpec('machineCost', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Complexity</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="range" min={1} max={5} step={1}
                          value={specs.complexity || 1}
                          onChange={e => updateSpec('complexity', Number(e.target.value))}
                          onBlur={handleBlur}
                          disabled={!canWrite}
                          style={{ flex: 1, height: 4, appearance: 'none', WebkitAppearance: 'none', borderRadius: 2, background: 'linear-gradient(to right, var(--green), var(--amber), var(--red))', cursor: canWrite ? 'pointer' : 'default' }}
                        />
                        <span style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 14, fontWeight: 800, color: (specs.complexity || 1) <= 2 ? 'var(--green)' : (specs.complexity || 1) <= 3 ? 'var(--amber)' : 'var(--red)', minWidth: 20, textAlign: 'center' as const }}>
                          {specs.complexity || 1}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Window Perf</label>
                      <button
                        onClick={() => { if (canWrite) updateSpec('windowPerf', !specs.windowPerf) }}
                        onBlur={handleBlur}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'transparent', border: 'none',
                          cursor: canWrite ? 'pointer' : 'default', padding: '4px 0',
                          color: specs.windowPerf ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                        }}
                      >
                        {specs.windowPerf ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                        {specs.windowPerf ? 'Yes' : 'No'}
                      </button>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Perf Area (sqft)</label>
                      <input type="number" value={specs.perfArea || ''} onChange={e => updateSpec('perfArea', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} />
                    </div>
                  </div>
                </div>

                {/* Price Totals */}
                <div>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={11} style={{ color: 'var(--green)' }} /> Price Totals
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Unit Price</label>
                      <div style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, padding: '7px 10px', fontSize: 12, color: 'var(--text1)', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {fmtCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Quantity</label>
                      <div style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, padding: '7px 10px', fontSize: 12, color: 'var(--text1)', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {item.quantity}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Discount</label>
                      <input type="number" value={item.unit_discount} onChange={e => updateField('unit_discount', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Line Total</label>
                      <div style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, padding: '7px 10px', fontSize: 13, fontWeight: 700, color: 'var(--green)', background: 'rgba(34,192,122,0.06)', borderRadius: 6, border: '1px solid rgba(34,192,122,0.15)' }}>
                        {fmtCurrency(item.total_price)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ADDITIONAL INFO (Collapsible)                                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div style={{ marginTop: 6 }}>
            <CollapsibleHeader
              icon={<FileText size={13} style={{ color: 'var(--cyan)' }} />}
              label="Additional Info"
              isOpen={expandedSections.additional ?? false}
              onToggle={() => onToggleSection('additional')}
              color="var(--text2)"
            />
            <div style={{
              maxHeight: expandedSections.additional ? 500 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.2s ease',
            }}>
              <div style={{ padding: '8px 0' }}>
                {/* Vehicle Info */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Car size={11} style={{ color: 'var(--accent)' }} /> Vehicle Info
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Year</label>
                      <input value={specs.vehicleYear || ''} onChange={e => updateSpec('vehicleYear', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} placeholder="2024" />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Make</label>
                      <input value={specs.vehicleMake || ''} onChange={e => updateSpec('vehicleMake', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} placeholder="Ford" />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Model</label>
                      <input value={specs.vehicleModel || ''} onChange={e => updateSpec('vehicleModel', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} placeholder="F-150" />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Color</label>
                      <input value={specs.vehicleColor || ''} onChange={e => updateSpec('vehicleColor', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} placeholder="White" />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Internal Notes</label>
                    <textarea
                      value={specs.notes || ''}
                      onChange={e => updateSpec('notes', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Internal notes for this line item..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Design Details</label>
                    <textarea
                      value={specs.designDetails || ''}
                      onChange={e => updateSpec('designDetails', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Design instructions, colors, branding..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Production Details</label>
                    <textarea
                      value={specs.productionDetails || ''}
                      onChange={e => updateSpec('productionDetails', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Print specs, material handling notes..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Install Details</label>
                    <textarea
                      value={specs.installDetails || ''}
                      onChange={e => updateSpec('installDetails', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Install instructions, special considerations..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Add New Asset link ──────────────────────────────────────── */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => showToast('Asset upload coming soon')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0',
              }}
            >
              <Plus size={12} /> Add New Asset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── showToast helper for sub-components (uses window event) ────────────────
// We use a simple approach: sub-components that need toast will call
// a module-level function that dispatches a custom event caught by the parent.
// However for simplicity here, we pass it inline where needed.

function showToast(msg: string) {
  // Fallback for sub-components - in production this would be a context
  console.log('[toast]', msg)
}

// ─── GPM Stat ───────────────────────────────────────────────────────────────

function GPMStat({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        fontFamily: headingFont, display: 'block',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
        fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color,
        marginTop: 2, display: 'block',
      }}>
        {value}
      </span>
    </div>
  )
}
